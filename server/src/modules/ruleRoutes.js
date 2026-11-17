import { Router } from 'express';
import { db } from '../db/index.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { normalizePhrase } from './ticketPolicy.js';

const router = Router();
const handle = action => (req, res, next) => Promise.resolve(action(req, res, next)).catch(next);
function fail(statusCode, message) { throw Object.assign(new Error(message), { statusCode }); }
const levels = ['P1', 'P2', 'P3', 'P4'];
const presentRule = ({ id, keyword, priority, is_active, created_at, updated_at }) => ({ id, keyword, priority, is_active, created_at, updated_at });

router.use(['/rules', '/sla/policies'], requireAuth, handle(async (req, res, next) => {
  const user = await db('users').where({ id: req.session.user.id, is_active: true }).select('id', 'role').first();
  if (!user) fail(401, 'Account inactive');
  if (user.role !== 'ADMIN') fail(403, 'Admin role required');
  req.user = user;
  next();
}));

function validateRule(body = {}) {
  const keyword = typeof body.keyword === 'string' ? body.keyword.trim() : '';
  const normalized = normalizePhrase(keyword);
  if (!keyword || keyword.length > 200 || !normalized || normalized.length > 200
      || !levels.includes(body.priority) || typeof body.is_active !== 'boolean') fail(400, 'Invalid rule fields');
  return { keyword, normalized_keyword: normalized, priority: body.priority, is_active: body.is_active };
}
const ruleChange = action => handle(async (req, res) => {
  try { await action(req, res); }
  catch (error) {
    if (error.code === 'ER_DUP_ENTRY') fail(409, 'Keyword already exists');
    throw error;
  }
});

router.get('/rules', handle(async (req, res) => {
  res.json(await db('priority_rules').select('id', 'keyword', 'priority', 'is_active', 'created_at', 'updated_at').orderBy('id'));
}));
router.post('/rules', ruleChange(async (req, res) => {
  const fields = validateRule(req.body);
  const rule = await db.transaction(async trx => {
    const [id] = await trx('priority_rules').insert(fields);
    await trx('audit_logs').insert({ actor_id: req.user.id, action: 'RULE_CREATED', entity_type: 'priority_rule', entity_id: String(id) });
    return trx('priority_rules').where({ id }).first();
  });
  res.status(201).json(presentRule(rule));
}));
router.patch('/rules/:id', ruleChange(async (req, res) => {
  const fields = validateRule(req.body);
  const rule = await db.transaction(async trx => {
    const before = await trx('priority_rules').where('id', req.params.id).forUpdate().first();
    if (!before) fail(404, 'Rule not found');
    await trx('priority_rules').where('id', before.id).update({ ...fields, updated_at: new Date() });
    await trx('audit_logs').insert({ actor_id: req.user.id, action: 'RULE_UPDATED', entity_type: 'priority_rule', entity_id: String(before.id) });
    return trx('priority_rules').where('id', before.id).first();
  });
  res.json(presentRule(rule));
}));
router.delete('/rules/:id', handle(async (req, res) => {
  await db.transaction(async trx => {
    const rule = await trx('priority_rules').where('id', req.params.id).forUpdate().first();
    if (!rule) fail(404, 'Rule not found');
    await trx('priority_rules').where('id', rule.id).delete();
    await trx('audit_logs').insert({ actor_id: req.user.id, action: 'RULE_DELETED', entity_type: 'priority_rule', entity_id: String(rule.id), safe_metadata: JSON.stringify({ keyword: rule.keyword }) });
  });
  res.status(204).end();
}));

router.get('/sla/policies', handle(async (req, res) => {
  res.json(await db('sla_policies').whereIn('priority', levels).select('id', 'priority', 'response_minutes', 'resolution_minutes', 'is_active').orderBy('priority'));
}));
router.put('/sla/policies/:priority', handle(async (req, res) => {
  const priority = req.params.priority;
  const body = req.body || {};
  const response = body.response_minutes;
  const resolution = body.resolution_minutes;
  if (!levels.includes(priority) || !Number.isSafeInteger(response) || response < 1 || response > 43200
      || !Number.isSafeInteger(resolution) || resolution < response || resolution > 43200
      || typeof body.is_active !== 'boolean') fail(400, 'Invalid SLA policy');
  const policy = await db.transaction(async trx => {
    const before = await trx('sla_policies').where({ priority }).forUpdate().first();
    if (!before) fail(404, 'SLA policy not found');
    await trx('sla_policies').where('id', before.id).update({ response_minutes: response,
      resolution_minutes: resolution, is_active: body.is_active, updated_at: new Date() });
    await trx('audit_logs').insert({ actor_id: req.user.id, action: 'SLA_POLICY_UPDATED', entity_type: 'sla_policy', entity_id: String(before.id),
      safe_metadata: JSON.stringify({ priority, response_minutes: response, resolution_minutes: resolution, is_active: body.is_active }) });
    return trx('sla_policies').where('id', before.id).first();
  });
  res.json(policy);
}));
export default router;
