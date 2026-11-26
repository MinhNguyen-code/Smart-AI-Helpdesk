import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { mkdir, open, unlink } from 'node:fs/promises';
import path from 'node:path';
import multer from 'multer';
import config from '../config/index.js';
import { db } from '../db/index.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { classifyPriority, calculateDeadlines, assertStatusTransition } from './ticketPolicy.js';
import { ticketListOptions, filterTicketList, sortTicketList, scopeTicketList } from './ticketListQuery.js';
import { createNotifications } from './notificationService.js';
import { hasRouting, routingEnabled, routingError } from './routing/routingPolicy.js';
import { allocateAgent, initialRouting, lockRouting, presentRouting, requireTicketAction, routingRecipients,
  routingTransaction, ticketRoutingPermissions } from './routing/routingService.js';

const router = Router();
const handle = action => (req, res, next) => Promise.resolve(action(req, res)).catch(next);
function fail(statusCode, message) { throw Object.assign(new Error(message), { statusCode }); }
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: config.upload.maxFileSizeBytes, files: 1 },
  fileFilter(req, file, done) { done(null, ['image/png', 'image/jpeg', 'image/webp'].includes(file.mimetype)); } });
const uploadOne = (req, res, next) => upload.single('file')(req, res, error => {
  if (!error) return next();
  if (error instanceof multer.MulterError) return next(Object.assign(new Error('Invalid or oversized image'), { statusCode: error.code === 'LIMIT_FILE_SIZE' ? 413 : 400 }));
  next(error);
});
const uploadRoot = path.resolve(config.upload.dir);
function detectedType(bytes) {
  if (bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'image/png';
  if (bytes.subarray(0, 3).equals(Buffer.from([255,216,255]))) return 'image/jpeg';
  if (bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP') return 'image/webp';
  return null;
}
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
router.use(['/tickets', '/categories', '/agents'], requireAuth, currentUser);
router.get('/categories', handle(async (req, res) => res.json(await db('categories').where({ is_active: true }).select('id', 'name'))));
router.get('/agents', handle(async (req, res) => {
  if (!['ADMIN', 'IT_AGENT'].includes(req.user.role)) fail(403, 'Staff role required');
  res.json(await db('users').where({ role: 'IT_AGENT', is_active: true }).select('id', 'full_name').orderBy('full_name'));
}));
router.get('/tickets', handle(async (req, res) => {
  const options = ticketListOptions(req.query);
  const { page } = options;
  const scoped = scope => scopeTicketList(db, ticketQuery(db, req.user), req.user, scope, routingEnabled());
  const query = filterTicketList(scoped(options.scope), options);
  if (req.query.status) {
    if (!['OPEN', 'IN_PROGRESS', 'RESOLVED'].includes(req.query.status)) fail(400, 'Invalid status');
    query.where('status', req.query.status);
  }
  if (req.query.routing_status) {
    if (!routingEnabled() || !['ASSIGNED', 'TEAM_QUEUE', 'REVIEW_REQUIRED'].includes(req.query.routing_status)) fail(400, 'Invalid routing filter');
    query.where('routing_status', req.query.routing_status);
  }
  const [{ count }] = await query.clone().count('* as count');
  const items = await sortTicketList(query, options.sort).limit(30).offset((page - 1) * 30);
  const assigneeIds = [...new Set(items.map(item => item.assignee_id).filter(Boolean))];
  const reporters = await db('users').whereIn('id', [...new Set([...items.map(item => item.reporter_id), ...assigneeIds])]).select('id', 'full_name');
  const names = new Map(reporters.map(user => [user.id, user.full_name]));
  const staff = ['ADMIN', 'IT_AGENT'].includes(req.user.role);
  const workloads = staff && assigneeIds.length ? await db('tickets').whereIn('assignee_id', assigneeIds)
    .whereIn('status', ['OPEN', 'IN_PROGRESS']).select('assignee_id').count('* as count').groupBy('assignee_id') : [];
  const loads = new Map(workloads.map(row => [row.assignee_id, Number(row.count)]));
  const queueCounts = {};
  if (staff) for (const scope of ['all', 'mine', ...(routingEnabled() ? ['team', 'review'] : [])]) {
    const row = await scoped(scope).count('* as count').first(); queueCounts[scope] = Number(row.count);
  }
  res.json({ items: await Promise.all(items.map(item => presentRouting(db, req.user, { ...item,
    reporter_name: names.get(item.reporter_id), assignee_name: names.get(item.assignee_id) || null }, loads))),
    total: Number(count), page, pageSize: 30, routing: routingEnabled(), ...(staff ? { queueCounts } : {}) });
}));
router.post('/tickets', handle(async (req, res) => {
  const { title, description, impact } = req.body;
  const categoryId = req.body.category_id ?? null;
  if (typeof title !== 'string' || !title.trim() || title.length > 255
      || typeof description !== 'string' || !description.trim() || description.length > 20000
      || !['individual', 'department', 'organization'].includes(impact)
      || !(Number.isSafeInteger(categoryId) && categoryId > 0 || routingEnabled() && categoryId === null)) fail(400, 'Invalid ticket fields');
  const ticket = await routingTransaction(db, async trx => {
    if (categoryId !== null && !await trx('categories').where({ id: categoryId, is_active: true }).first()) fail(400, 'Invalid category');
    const rules = await trx('priority_rules').where({ is_active: true });
    const decision = classifyPriority({ title, description, impact }, rules);
    const policy = await trx('sla_policies').where({ priority: decision.priority, is_active: true }).first();
    if (!policy) fail(503, 'SLA policy unavailable');
    const deadlines = calculateDeadlines(new Date(), policy);
    const routing = await initialRouting(trx, { title, description, impact, category_id: categoryId }, req.user.id);
    const [id] = await trx('tickets').insert({ title: title.trim(), description: description.trim(), impact,
      category_id: categoryId, reporter_id: req.user.id, ticket_code: randomUUID().replaceAll('-', ''),
      priority: decision.priority, priority_reason: decision.reason, priority_evidence: JSON.stringify(decision.evidence), ...deadlines, ...routing });
    await trx('ticket_history').insert({ ticket_id: id, actor_id: req.user.id, event_type: 'CREATED', new_value: 'OPEN' });
    const created = await trx('tickets').where({ id }).first();
    if (hasRouting(created)) await trx('ticket_history').insert({ ticket_id: id, actor_id: req.user.id, event_type: 'ROUTED',
      new_value: created.owner_unit_id && String(created.owner_unit_id), note: created.routing_status });
    const recipients = hasRouting(created) ? (await routingRecipients(trx, created)).map(id => ({ id }))
      : await trx('users').where({ is_active: true }).whereIn('role', ['ADMIN', 'IT_AGENT']);
    if (recipients.length) await createNotifications(trx, recipients.map(user => ({ recipient_id: user.id, ticket_id: id,
      notification_type: 'TICKET_CREATED', title: 'Yêu cầu hỗ trợ mới', message: hasRouting(created) ? `Ticket ${created.ticket_code}` : title,
      deduplication_key: `created:${id}:${user.id}` })));
    await trx('audit_logs').insert({ actor_id: req.user.id, action: 'TICKET_CREATED', entity_type: 'ticket', entity_id: String(id),
      safe_metadata: hasRouting(created) ? JSON.stringify({ owner_unit_id: created.owner_unit_id, assignee_id: created.assignee_id, routing_status: created.routing_status }) : null });
    return presentRouting(trx, req.user, created);
  });
  res.status(201).json(ticket);
}));
router.get('/tickets/:id', handle(async (req, res) => {
  const ticket = await ticketQuery(db, req.user).where('id', req.params.id).first();
  if (!ticket) fail(404, 'Ticket not found');
  const permissions = await ticketRoutingPermissions(db, req.user, ticket);
  const publicOnly = req.user.role === 'END_USER' || (permissions && !permissions.can_read_internal);
  const comments = db('ticket_comments as comment').leftJoin('users as author', 'author.id', 'comment.author_id')
    .where('comment.ticket_id', ticket.id).select('comment.*', 'author.full_name as author_name');
  if (publicOnly) comments.where('comment.visibility', 'public');
  const history = db('ticket_history as event').where('event.ticket_id', ticket.id).select('event.*');
  if (publicOnly) {
    history.whereNot('event.event_type', 'ROUTED');
    // A comment event includes its actor, timestamp and comment ID. Only expose it when
    // the referenced comment is public; orphaned comment events remain staff-only.
    history.where(builder => builder.whereNot('event.event_type', 'COMMENT_ADDED').orWhereExists(
      db('ticket_comments as visible_comment').select(db.raw('1'))
        .whereColumn('visible_comment.id', 'event.new_value')
        .where('visible_comment.ticket_id', ticket.id).where('visible_comment.visibility', 'public')));
  }
  const reporter = await db('users').where('id', ticket.reporter_id).select('full_name').first();
  const assignee = ticket.assignee_id && await db('users').where('id', ticket.assignee_id).select('full_name').first();
  res.json({ ...await presentRouting(db, req.user, ticket), reporter_name: reporter?.full_name, assignee_name: assignee?.full_name,
    comments: await comments.orderBy('comment.id'), history: await history.orderBy('event.id'),
    attachments: await db('ticket_attachments').where('ticket_id', ticket.id).select('id', 'original_filename', 'mime_type', 'size_bytes', 'created_at').orderBy('id') });
}));
router.post('/tickets/:id/attachments', uploadOne, handle(async (req, res) => {
  if (!req.file || !req.file.buffer.length || detectedType(req.file.buffer) !== req.file.mimetype) fail(400, 'Invalid image');
  const ticket = await ticketQuery(db, req.user).where('id', req.params.id).first();
  if (!ticket) fail(404, 'Ticket not found');
  await requireTicketAction(db, req.user, ticket, 'attach');
  const safeName = path.basename(req.file.originalname).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 255) || 'image';
  const storedName = randomUUID();
  const target = path.join(uploadRoot, storedName);
  await mkdir(uploadRoot, { recursive: true });
  const file = await open(target, 'wx', 0o600);
  try {
    await file.writeFile(req.file.buffer);
    const attachment = await db.transaction(async trx => {
      const current = await ticketQuery(trx, req.user).where('id', ticket.id).forUpdate().first();
      if (!current) fail(404, 'Ticket not found');
      await requireTicketAction(trx, req.user, current, 'attach');
      const [id] = await trx('ticket_attachments').insert({ ticket_id: ticket.id, uploaded_by: req.user.id,
        original_filename: safeName, stored_filename: storedName, mime_type: req.file.mimetype, size_bytes: req.file.size });
      await trx('ticket_history').insert({ ticket_id: ticket.id, actor_id: req.user.id, event_type: 'ATTACHMENT_ADDED', new_value: String(id) });
      return trx('ticket_attachments').where({ id }).select('id', 'original_filename', 'mime_type', 'size_bytes', 'created_at').first();
    });
    res.status(201).json(attachment);
  } catch (error) { await unlink(target).catch(() => {}); throw error; }
  finally { await file.close(); }
}));
router.get('/tickets/:id/attachments/:attachmentId', handle(async (req, res) => {
  const ticket = await ticketQuery(db, req.user).where('id', req.params.id).first();
  if (!ticket) fail(404, 'Ticket not found');
  const attachment = await db('ticket_attachments').where({ id: req.params.attachmentId, ticket_id: ticket.id }).first();
  if (!attachment) fail(404, 'Attachment not found');
  const file = await open(path.join(uploadRoot, attachment.stored_filename), 'r');
  let contents;
  try { contents = await file.readFile(); } finally { await file.close(); }
  res.set('Content-Type', attachment.mime_type);
  res.set('Content-Disposition', `attachment; filename="attachment"; filename*=UTF-8''${encodeURIComponent(attachment.original_filename)}`);
  res.set('X-Content-Type-Options', 'nosniff');
  res.send(contents);
}));
router.get('/tickets/:id/comments', handle(async (req, res) => {
  const ticket = await ticketQuery(db, req.user).where('id', req.params.id).first();
  if (!ticket) fail(404, 'Ticket not found');
  const query = db('ticket_comments as comment').leftJoin('users as author', 'author.id', 'comment.author_id')
    .where('comment.ticket_id', ticket.id).select('comment.*', 'author.full_name as author_name');
  const permissions = await ticketRoutingPermissions(db, req.user, ticket);
  if (req.user.role === 'END_USER' || (permissions && !permissions.can_read_internal)) query.where('comment.visibility', 'public');
  res.json(await query.orderBy('comment.id'));
}));
router.post('/tickets/:id/comments', handle(async (req, res) => {
  const { message, visibility = 'public' } = req.body;
  if (typeof message !== 'string' || !message.trim() || message.length > 10000
      || !['public', 'internal'].includes(visibility)) fail(400, 'Invalid comment');
  if (visibility === 'internal' && req.user.role === 'END_USER') fail(403, 'Staff role required');
  const comment = await db.transaction(async trx => {
    const ticket = await ticketQuery(trx, req.user).where('id', req.params.id).forUpdate().first();
    if (!ticket) fail(404, 'Ticket not found');
    await requireTicketAction(trx, req.user, ticket, 'reply', visibility);
    const [id] = await trx('ticket_comments').insert({ ticket_id: ticket.id, author_id: req.user.id, message: message.trim(), visibility });
    await trx('ticket_history').insert({ ticket_id: ticket.id, actor_id: req.user.id, event_type: 'COMMENT_ADDED', new_value: String(id) });
    if (req.user.role !== 'END_USER' && (!hasRouting(ticket) || ticket.reporter_id !== req.user.id) && !ticket.first_response_at && visibility === 'public') {
      await trx('tickets').where({ id: ticket.id, first_response_at: null }).update({ first_response_at: new Date() });
    }
    const recipients = visibility === 'internal'
      ? [ticket.assignee_id].filter(id => id && id !== req.user.id)
      : [ticket.reporter_id, ticket.assignee_id].filter(id => id && id !== req.user.id);
    if (recipients.length) await createNotifications(trx, [...new Set(recipients)].map(id => ({
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
  const ticket = await routingTransaction(db, async trx => {
    // Allocation and manual routing lock configuration before the ticket. This
    // preliminary read never authorizes a write; the locked version is checked below.
    const observed = await trx('tickets').where('id', req.params.id).first();
    const settings = routingEnabled() || hasRouting(observed || {}) ? await lockRouting(trx) : null;
    const assignee = await trx('users').where({ id: assigneeId, role: 'IT_AGENT', is_active: true }).first();
    if (!assignee) fail(400, 'Invalid assignee');
    const previous = await trx('tickets').where('id', req.params.id).forUpdate().first();
    if (!previous) fail(404, 'Ticket not found');
    if (previous.version !== version) fail(409, 'Ticket changed; refresh before retry');
    let routingAssignment;
    if (hasRouting(previous)) {
      if (!settings) throw routingError(409, 'STALE_VERSION', 'Tuyến đã thay đổi; tải lại ticket trước khi lưu.');
      await requireTicketAction(trx, req.user, previous, 'assign');
      if (!previous.owner_unit_id) throw routingError(409, 'ROUTE_REQUIRED', 'Quản trị viên cần chọn nhóm phụ trách trước.');
      if (previous.assignee_id === assigneeId) throw routingError(409, 'ASSIGNMENT_UNCHANGED', 'Người phụ trách không thay đổi.');
      if (previous.assignee_id && (typeof req.body.reason !== 'string' || req.body.reason.trim().length < 3 || req.body.reason.length > 1000)) {
        throw routingError(400, 'REASON_REQUIRED', 'Ghi lý do thay người phụ trách.');
      }
      const allocation = await allocateAgent(trx, previous.owner_unit_id, previous.reporter_id, settings, assigneeId, previous.id);
      routingAssignment = { source: 'ASSIGNMENT', configuration_version: settings.version, unit_id: previous.owner_unit_id,
        ...allocation, capacity: settings.max_open_per_agent };
    }
    await trx('tickets').where('id', previous.id).update({ assignee_id: assigneeId, version: version + 1, updated_at: new Date(),
      ...(hasRouting(previous) ? { routing_status: 'ASSIGNED', routing_evidence: JSON.stringify(routingAssignment) } : {}) });
    await trx('ticket_history').insert({ ticket_id: previous.id, actor_id: req.user.id, event_type: 'ASSIGNED', old_value: previous.assignee_id && String(previous.assignee_id), new_value: String(assigneeId) });
    await createNotifications(trx, [{ recipient_id: assigneeId, ticket_id: previous.id, notification_type: 'ASSIGNED', title: 'Ticket được phân công', message: `Ticket ${previous.ticket_code}`, deduplication_key: `assign:${previous.id}:${version}` }]);
    if (hasRouting(previous)) await trx('audit_logs').insert({ actor_id: req.user.id, action: 'ROUTING_ASSIGNEE_UPDATED', entity_type: 'ticket', entity_id: String(previous.id),
      safe_metadata: JSON.stringify({ old_assignee: previous.assignee_id, assignee_id: assigneeId, reason: req.body.reason || null, version: version + 1 }) });
    return presentRouting(trx, req.user, await trx('tickets').where('id', previous.id).first());
  });
  res.json(ticket);
}));
router.post('/tickets/:id/acknowledge', handle(async (req, res) => {
  if (!['ADMIN', 'IT_AGENT'].includes(req.user.role)) fail(403, 'Staff role required');
  if (!Number.isSafeInteger(req.body?.version)) fail(400, 'Version required');
  const ticket = await db.transaction(async trx => {
    const previous = await trx('tickets').where('id', req.params.id).forUpdate().first();
    if (!previous) fail(404, 'Ticket not found');
    if (previous.version !== req.body.version) fail(409, 'Ticket changed; refresh before retry');
    await requireTicketAction(trx, req.user, previous, 'handle');
    if (previous.acknowledged_at || previous.status === 'RESOLVED') fail(409, 'Ticket cannot be acknowledged');
    const now = new Date();
    await trx('tickets').where('id', previous.id).update({ acknowledged_at: now,
      version: previous.version + 1, updated_at: now });
    await trx('ticket_history').insert({ ticket_id: previous.id, actor_id: req.user.id,
      event_type: 'ACKNOWLEDGED', new_value: now.toISOString() });
    await trx('audit_logs').insert({ actor_id: req.user.id, action: 'TICKET_ACKNOWLEDGED',
      entity_type: 'ticket', entity_id: String(previous.id) });
    return presentRouting(trx, req.user, await trx('tickets').where('id', previous.id).first());
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
    await requireTicketAction(trx, req.user, previous, 'handle');
    assertStatusTransition(previous.status, req.body.status);
    const changes = { status: req.body.status, version: previous.version + 1, updated_at: new Date() };
    if (changes.status === 'RESOLVED') changes.resolved_at = new Date();
    await trx('tickets').where('id', previous.id).update(changes);
    await trx('ticket_history').insert({ ticket_id: previous.id, actor_id: req.user.id, event_type: 'STATUS_CHANGED', old_value: previous.status, new_value: changes.status });
    return presentRouting(trx, req.user, await trx('tickets').where('id', previous.id).first());
  });
  res.json(ticket);
}));
export default router;
