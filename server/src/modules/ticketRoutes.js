import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { db } from '../db/index.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { classifyPriority, calculateDeadlines, assertStatusTransition } from './ticketPolicy.js';

const router = Router();
const handle = action => (req, res, next) => Promise.resolve(action(req, res)).catch(next);
function fail(statusCode, message) { throw Object.assign(new Error(message), { statusCode }); }
function ticketQuery(database, user) {
  const query = database('tickets');
  return user.role === 'END_USER' ? query.where('reporter_id', user.id) : query;
}
async function currentUser(req, res, next) {
  try {
    const user = await db('users').where({ id: req.session.user.id, is_active: true }).first();
    if (!user) return next(Object.assign(new Error('Account inactive'), { statusCode: 401 }));
    req.user = user;
    next();
  } catch (error) { next(error); }
}
router.use(['/tickets', '/categories'], requireAuth, currentUser);
router.get('/categories', handle(async (req, res) => res.json(await db('categories').where({ is_active: true }).select('id', 'name'))));
router.get('/tickets', handle(async (req, res) => {
  const page = Number(req.query.page || 1);
  if (!Number.isSafeInteger(page) || page < 1) fail(400, 'Invalid page');
  const query = ticketQuery(db, req.user);
  if (req.query.search) query.where(builder => builder.where('title', 'like', `%${String(req.query.search).slice(0, 200)}%`).orWhere('ticket_code', req.query.search));
  if (req.query.status) {
    if (!['OPEN', 'IN_PROGRESS', 'RESOLVED'].includes(req.query.status)) fail(400, 'Invalid status');
    query.where('status', req.query.status);
  }
  const [{ count }] = await query.clone().count('* as count');
  const items = await query.orderBy('id', 'desc').limit(30).offset((page - 1) * 30);
  res.json({ items, total: Number(count), page, pageSize: 30 });
}));
router.post('/tickets', handle(async (req, res) => {
  const { title, description, impact, category_id: categoryId } = req.body;
  if (typeof title !== 'string' || !title.trim() || title.length > 255
      || typeof description !== 'string' || !description.trim() || description.length > 20000
      || !['individual', 'department', 'organization'].includes(impact)
      || !Number.isSafeInteger(categoryId) || categoryId < 1) fail(400, 'Invalid ticket fields');
  const ticket = await db.transaction(async trx => {
    if (!await trx('categories').where({ id: categoryId, is_active: true }).first()) fail(400, 'Invalid category');
    const rules = await trx('priority_rules').where({ is_active: true });
    const decision = classifyPriority({ title, description, impact }, rules);
    const policy = await trx('sla_policies').where({ priority: decision.priority, is_active: true }).first();
    if (!policy) fail(503, 'SLA policy unavailable');
    const deadlines = calculateDeadlines(new Date(), policy);
    const [id] = await trx('tickets').insert({ title: title.trim(), description: description.trim(), impact,
      category_id: categoryId, reporter_id: req.user.id, ticket_code: randomUUID().replaceAll('-', ''),
      priority: decision.priority, priority_reason: decision.reason, priority_evidence: JSON.stringify(decision.evidence), ...deadlines });
    await trx('ticket_history').insert({ ticket_id: id, actor_id: req.user.id, event_type: 'CREATED', new_value: 'OPEN' });
    const recipients = await trx('users').where({ is_active: true }).whereIn('role', ['ADMIN', 'IT_AGENT']);
    if (recipients.length) await trx('notifications').insert(recipients.map(user => ({ recipient_id: user.id, ticket_id: id,
      notification_type: 'TICKET_CREATED', title: 'Yêu cầu hỗ trợ mới', message: title,
      deduplication_key: `created:${id}:${user.id}` })));
    await trx('audit_logs').insert({ actor_id: req.user.id, action: 'TICKET_CREATED', entity_type: 'ticket', entity_id: String(id) });
    return trx('tickets').where({ id }).first();
  });
  res.status(201).json(ticket);
}));
router.get('/tickets/:id', handle(async (req, res) => {
  const ticket = await ticketQuery(db, req.user).where('id', req.params.id).first();
  if (!ticket) fail(404, 'Ticket not found');
  const comments = db('ticket_comments').where('ticket_id', ticket.id);
  if (req.user.role === 'END_USER') comments.where('visibility', 'public');
  res.json({ ...ticket, comments: await comments.orderBy('id'), history: await db('ticket_history').where('ticket_id', ticket.id).orderBy('id') });
}));
router.get('/tickets/:id/comments', handle(async (req, res) => {
  const ticket = await ticketQuery(db, req.user).where('id', req.params.id).first();
  if (!ticket) fail(404, 'Ticket not found');
  const query = db('ticket_comments').where('ticket_id', ticket.id);
  if (req.user.role === 'END_USER') query.where('visibility', 'public');
  res.json(await query.orderBy('id'));
}));
router.post('/tickets/:id/comments', handle(async (req, res) => {
  const { message, visibility = 'public' } = req.body;
  if (typeof message !== 'string' || !message.trim() || message.length > 10000
      || !['public', 'internal'].includes(visibility)) fail(400, 'Invalid comment');
  if (visibility === 'internal' && req.user.role === 'END_USER') fail(403, 'Staff role required');
  const comment = await db.transaction(async trx => {
    const ticket = await ticketQuery(trx, req.user).where('id', req.params.id).forUpdate().first();
    if (!ticket) fail(404, 'Ticket not found');
    const [id] = await trx('ticket_comments').insert({ ticket_id: ticket.id, author_id: req.user.id, message: message.trim(), visibility });
    await trx('ticket_history').insert({ ticket_id: ticket.id, actor_id: req.user.id, event_type: 'COMMENT_ADDED', new_value: String(id) });
    if (req.user.role !== 'END_USER' && !ticket.first_response_at && visibility === 'public') {
      await trx('tickets').where({ id: ticket.id, first_response_at: null }).update({ first_response_at: new Date() });
    }
    const recipients = visibility === 'internal'
      ? [ticket.assignee_id].filter(id => id && id !== req.user.id)
      : [ticket.reporter_id, ticket.assignee_id].filter(id => id && id !== req.user.id);
    if (recipients.length) await trx('notifications').insert([...new Set(recipients)].map(id => ({
      recipient_id: id, ticket_id: ticket.id, notification_type: 'TICKET_REPLY', title: 'Phản hồi mới', message: `Ticket ${ticket.ticket_code} có phản hồi mới`,
      deduplication_key: `reply:${ticket.id}:${id}:${randomUUID()}`,
    })));
    return trx('ticket_comments').where({ id }).first();
  });
  res.status(201).json(comment);
}));
router.patch('/tickets/:id/assign', handle(async (req, res) => {
  if (!['ADMIN', 'IT_AGENT'].includes(req.user.role)) fail(403, 'Staff role required');
  const { assignee_id: assigneeId, version } = req.body;
  if (!Number.isSafeInteger(assigneeId) || !Number.isSafeInteger(version)) fail(400, 'Invalid assignment');
  if (req.user.role === 'IT_AGENT' && assigneeId !== req.user.id) fail(403, 'Agents may only accept their own assignment');
  const ticket = await db.transaction(async trx => {
    const assignee = await trx('users').where({ id: assigneeId, role: 'IT_AGENT', is_active: true }).first();
    if (!assignee) fail(400, 'Invalid assignee');
    const previous = await trx('tickets').where('id', req.params.id).forUpdate().first();
    if (!previous) fail(404, 'Ticket not found');
    if (previous.version !== version) fail(409, 'Ticket changed; refresh before retry');
    await trx('tickets').where('id', previous.id).update({ assignee_id: assigneeId, version: version + 1, updated_at: new Date() });
    await trx('ticket_history').insert({ ticket_id: previous.id, actor_id: req.user.id, event_type: 'ASSIGNED', old_value: previous.assignee_id && String(previous.assignee_id), new_value: String(assigneeId) });
    await trx('notifications').insert({ recipient_id: assigneeId, ticket_id: previous.id, notification_type: 'ASSIGNED', title: 'Ticket được phân công', message: `Ticket ${previous.ticket_code}`, deduplication_key: `assign:${previous.id}:${version}` });
    return trx('tickets').where('id', previous.id).first();
  });
  res.json(ticket);
}));
router.patch('/tickets/:id/status', handle(async (req, res) => {
  if (!['ADMIN', 'IT_AGENT'].includes(req.user.role)) fail(403, 'Staff role required');
  if (!Number.isSafeInteger(req.body.version)) fail(400, 'Version required');
  const ticket = await db.transaction(async trx => {
    const previous = await trx('tickets').where('id', req.params.id).forUpdate().first();
    if (!previous) fail(404, 'Ticket not found');
    if (previous.version !== req.body.version) fail(409, 'Ticket changed; refresh before retry');
    assertStatusTransition(previous.status, req.body.status);
    const changes = { status: req.body.status, version: previous.version + 1, updated_at: new Date() };
    if (changes.status === 'RESOLVED') changes.resolved_at = new Date();
    await trx('tickets').where('id', previous.id).update(changes);
    await trx('ticket_history').insert({ ticket_id: previous.id, actor_id: req.user.id, event_type: 'STATUS_CHANGED', old_value: previous.status, new_value: changes.status });
    return trx('tickets').where('id', previous.id).first();
  });
  res.json(ticket);
}));
export default router;
