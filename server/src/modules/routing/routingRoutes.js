import { Router } from 'express';
import { db } from '../../db/index.js';
import { requireAuth } from '../../middleware/authMiddleware.js';
import { normalizePhrase } from '../ticketPolicy.js';
import { createNotifications } from '../notificationService.js';
import { routingDefaults, routingEnabled, routingError } from './routingPolicy.js';
import { allocateAgent, lockRouting, presentRouting, routingRecipients, routingTransaction } from './routingService.js';

const router = Router();
const handle = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
const fail = (status, code, message) => { throw routingError(status, code, message); };
const parse = value => typeof value === 'string' ? JSON.parse(value) : value;
async function actor(req) {
  const user = await db('users').where({ id: req.session.user.id, is_active: true }).first();
  if (!user) fail(401, 'ACCOUNT_INACTIVE', 'Tài khoản không hoạt động.');
  return user;
}
function ready() { if (!routingEnabled()) fail(503, 'ROUTING_DISABLED', 'Phân tuyến chưa được kích hoạt.'); }
function admin(user) { if (user.role !== 'ADMIN') fail(403, 'ADMIN_REQUIRED', 'Chỉ quản trị viên được thay đổi phân tuyến.'); }
function version(settings, expected) {
  if (!Number.isSafeInteger(expected) || expected < 1) fail(400, 'INVALID_INPUT', 'Thiếu phiên bản cấu hình.');
  if (settings.version !== expected) fail(409, 'STALE_VERSION', 'Cấu hình đã thay đổi; tải lại trước khi lưu.');
}

router.use('/routing', requireAuth);
router.get('/routing/capabilities', handle(async (req, res) => {
  await actor(req);
  res.json({ enabled: routingEnabled() });
}));
router.get('/routing/units', handle(async (req, res) => {
  const user = await actor(req);
  if (!['ADMIN', 'IT_AGENT'].includes(user.role)) fail(403, 'STAFF_REQUIRED', 'Chức năng dành cho đội hỗ trợ.');
  res.json(routingEnabled() ? await db('support_units').where({ is_active: true }).select('id', 'code', 'name').orderBy('code') : []);
}));
router.get('/routing/settings', handle(async (req, res) => {
  admin(await actor(req)); ready();
  const [settings, units, members, routes, agents, categories, loads] = await db.transaction(async trx => {
    const settings = await trx('routing_settings').where('id', 1).first();
    if (!settings) fail(503, 'ROUTING_NOT_READY', 'Phân tuyến chưa được thiết lập.');
    return [settings, ...await Promise.all([
      trx('support_units').orderBy('id'), trx('support_unit_memberships').select('unit_id', 'user_id', 'is_available'), trx('category_unit_routes'),
      trx('users').where({ role: 'IT_AGENT', is_active: true }).select('id', 'full_name', 'email'),
      trx('categories').where({ is_active: true }).select('id', 'name'),
      trx('tickets').whereIn('status', ['OPEN', 'IN_PROGRESS']).whereNotNull('assignee_id').select('assignee_id').count('* as count').groupBy('assignee_id'),
    ])];
  }, { isolationLevel: 'repeatable read' });
  const byId = new Map(units.map(unit => [unit.id, unit.code]));
  res.json({ ...settings, auto_assign: Boolean(settings.auto_assign),
    units: units.map(unit => ({ ...unit, is_active: Boolean(unit.is_active), members: members.filter(member => member.unit_id === unit.id)
      .map(member => ({ user_id: member.user_id, is_available: Boolean(member.is_available) })) })),
    routes: routes.map(route => ({ category_id: route.category_id, unit_code: byId.get(route.unit_id), keywords: parse(route.keywords) })),
    agents: agents.map(agent => ({ ...agent, open_count: Number(loads.find(row => row.assignee_id === agent.id)?.count || 0) })), categories, defaults: routingDefaults });
}));

function validateSettings(body) {
  if (!body || typeof body.auto_assign !== 'boolean' || !Number.isSafeInteger(body.max_open_per_agent)
      || body.max_open_per_agent < 1 || body.max_open_per_agent > 100 || !Array.isArray(body.units)
      || body.units.length > 20 || !Array.isArray(body.routes) || body.routes.length > 200) fail(400, 'INVALID_INPUT', 'Cấu hình phân tuyến không hợp lệ.');
  const codes = new Set(); let memberships = 0;
  for (const unit of body.units) {
    if (!unit || !/^[A-Z][A-Z0-9_]{1,31}$/.test(unit.code || '') || codes.has(unit.code) || typeof unit.name !== 'string'
        || !unit.name.trim() || unit.name.length > 120 || typeof unit.is_active !== 'boolean' || !Array.isArray(unit.members)) fail(400, 'INVALID_INPUT', 'Thông tin nhóm không hợp lệ.');
    codes.add(unit.code); const ids = new Set();
    for (const member of unit.members) {
      if (!member || !Number.isSafeInteger(member.user_id) || member.user_id < 1 || ids.has(member.user_id)
          || typeof member.is_available !== 'boolean') fail(400, 'INVALID_INPUT', 'Thành viên nhóm không hợp lệ.');
      ids.add(member.user_id); memberships++;
    }
  }
  if (memberships > 200) fail(400, 'INVALID_INPUT', 'Tối đa 200 lượt thành viên trong cấu hình.');
  const categories = new Set();
  for (const route of body.routes) {
    if (!route || !Number.isSafeInteger(route.category_id) || route.category_id < 1 || categories.has(route.category_id)
        || !codes.has(route.unit_code) || !Array.isArray(route.keywords) || route.keywords.length > 20
        || route.keywords.some(word => typeof word !== 'string' || !normalizePhrase(word) || word.length > 80)) fail(400, 'INVALID_INPUT', 'Ánh xạ danh mục không hợp lệ.');
    categories.add(route.category_id);
  }
}

router.put('/routing/settings', handle(async (req, res) => {
  const user = await actor(req); admin(user); ready(); validateSettings(req.body);
  await routingTransaction(db, async trx => {
    const settings = await lockRouting(trx); version(settings, req.body.version);
    const current = await trx('users').where({ id: user.id, role: 'ADMIN', is_active: true }).forShare().first();
    if (!current) fail(403, 'ADMIN_REQUIRED', 'Quyền quản trị đã thay đổi.');
    const existing = await trx('support_units');
    if (existing.some(unit => !req.body.units.some(row => row.code === unit.code))) fail(400, 'UNIT_REQUIRED', 'Giữ nhóm cũ và tạm ngừng thay vì xóa khỏi cấu hình.');
    for (const row of req.body.units) {
      const old = existing.find(unit => unit.code === row.code);
      if (old) {
        const active = await trx('tickets').where('owner_unit_id', old.id).whereIn('status', ['OPEN', 'IN_PROGRESS']).select('assignee_id');
        if (!row.is_active && active.length) fail(409, 'UNIT_HAS_ACTIVE_TICKETS', 'Chuyển ticket đang mở trước khi ngừng nhóm.');
        if (active.some(ticket => ticket.assignee_id && !row.members.some(member => member.user_id === ticket.assignee_id))) {
          fail(409, 'MEMBER_HAS_ACTIVE_TICKETS', 'Chuyển người phụ trách trước khi bỏ thành viên đang có ticket.');
        }
      }
      for (const member of row.members) {
        if (!await trx('users').where({ id: member.user_id, role: 'IT_AGENT', is_active: true }).first()) fail(400, 'INVALID_AGENT', 'Chỉ thêm kỹ thuật viên đang hoạt động.');
      }
      await trx('support_units').insert({ code: row.code, name: row.name.trim(), is_active: row.is_active })
        .onConflict('code').merge({ name: row.name.trim(), is_active: row.is_active, updated_at: new Date() });
      const unit = await trx('support_units').where('code', row.code).first();
      const ids = row.members.map(member => member.user_id);
      const removed = trx('support_unit_memberships').where('unit_id', unit.id);
      if (ids.length) removed.whereNotIn('user_id', ids);
      await removed.delete();
      for (const member of row.members) await trx('support_unit_memberships').insert({ unit_id: unit.id, ...member })
        .onConflict(['unit_id', 'user_id']).merge({ is_available: member.is_available });
    }
    const units = await trx('support_units');
    // Small configuration table only. Application tickets/history are never removed.
    await trx('category_unit_routes').delete();
    for (const row of req.body.routes) {
      if (!await trx('categories').where({ id: row.category_id, is_active: true }).first()) fail(400, 'INVALID_CATEGORY', 'Danh mục không hoạt động.');
      const unit = units.find(item => item.code === row.unit_code);
      await trx('category_unit_routes').insert({ category_id: row.category_id, unit_id: unit.id, keywords: JSON.stringify([...new Set(row.keywords.map(word => word.trim()))]) });
    }
    await trx('routing_settings').where('id', 1).update({ version: settings.version + 1, auto_assign: req.body.auto_assign, max_open_per_agent: req.body.max_open_per_agent });
    await trx('audit_logs').insert({ actor_id: user.id, action: 'ROUTING_SETTINGS_UPDATED', entity_type: 'routing', entity_id: '1',
      safe_metadata: JSON.stringify({ version: settings.version + 1, units: req.body.units.map(row => ({ code: row.code, is_active: row.is_active, members: row.members })), routes: req.body.routes, max_open_per_agent: req.body.max_open_per_agent, auto_assign: req.body.auto_assign }) });
  });
  res.json({ saved: true });
}));

router.get('/routing/me', handle(async (req, res) => {
  const user = await actor(req);
  if (user.role !== 'IT_AGENT') fail(403, 'AGENT_REQUIRED', 'Chức năng dành cho kỹ thuật viên.');
  if (!routingEnabled()) return res.json({ enabled: false, units: [] });
  const [settings, units] = await db.transaction(async trx => {
    const settings = await trx('routing_settings').where('id', 1).first();
    if (!settings) fail(503, 'ROUTING_NOT_READY', 'Phân tuyến chưa được thiết lập.');
    return [settings, await trx('support_unit_memberships as member').join('support_units as unit', 'unit.id', 'member.unit_id')
      .where({ 'member.user_id': user.id, 'unit.is_active': true }).select('unit.id', 'unit.name', 'member.is_available').orderBy('unit.id')];
  }, { isolationLevel: 'repeatable read' });
  res.json({ enabled: true, version: settings.version, units: units.map(unit => ({ ...unit, is_available: Boolean(unit.is_available) })) });
}));
router.patch('/routing/availability', handle(async (req, res) => {
  const user = await actor(req); ready();
  if (user.role !== 'IT_AGENT' || !Number.isSafeInteger(req.body?.unit_id) || typeof req.body.is_available !== 'boolean') fail(403, 'AGENT_REQUIRED', 'Chỉ cập nhật trạng thái nhận việc của chính mình.');
  await routingTransaction(db, async trx => {
    const settings = await lockRouting(trx); version(settings, req.body.version);
    if (!await trx('users').where({ id: user.id, role: 'IT_AGENT', is_active: true }).forShare().first()) fail(403, 'AGENT_REQUIRED', 'Vai trò đã thay đổi.');
    const updated = await trx('support_unit_memberships').where({ unit_id: req.body.unit_id, user_id: user.id }).update({ is_available: req.body.is_available });
    if (!updated) fail(403, 'NOT_UNIT_MEMBER', 'Bạn không thuộc nhóm này.');
    await trx('routing_settings').where('id', 1).update({ version: settings.version + 1 });
    await trx('audit_logs').insert({ actor_id: user.id, action: 'ROUTING_AVAILABILITY_UPDATED', entity_type: 'support_unit', entity_id: String(req.body.unit_id), safe_metadata: JSON.stringify({ is_available: req.body.is_available, version: settings.version + 1 }) });
  });
  res.json({ saved: true });
}));

router.patch('/tickets/:id/routing', requireAuth, handle(async (req, res) => {
  const user = await actor(req); admin(user); ready();
  const body = req.body || {};
  if (!Number.isSafeInteger(Number(req.params.id)) || Number(req.params.id) < 1 || !Number.isSafeInteger(body.unit_id) || body.unit_id < 1
      || !Number.isSafeInteger(body.version) || body.version < 1 || typeof body.reason !== 'string' || body.reason.trim().length < 3
      || body.reason.length > 1000 || (body.assignee_id !== undefined && body.assignee_id !== null && (!Number.isSafeInteger(body.assignee_id) || body.assignee_id < 1))) {
    fail(400, 'INVALID_INPUT', 'Chọn nhóm, phiên bản ticket và ghi lý do chuyển tuyến.');
  }
  const ticket = await routingTransaction(db, async trx => {
    const settings = await lockRouting(trx);
    if (!await trx('users').where({ id: user.id, role: 'ADMIN', is_active: true }).forShare().first()) fail(403, 'ADMIN_REQUIRED', 'Quyền quản trị đã thay đổi.');
    const before = await trx('tickets').where('id', req.params.id).forUpdate().first();
    if (!before) fail(404, 'TICKET_NOT_FOUND', 'Không tìm thấy ticket.');
    if (before.version !== body.version) fail(409, 'STALE_VERSION', 'Ticket đã thay đổi; tải lại trước khi lưu.');
    if (before.status === 'RESOLVED') fail(409, 'TICKET_RESOLVED', 'Ticket đã giải quyết; không tự thay đổi tuyến cũ.');
    // A manual change stays explicit; never silently reclassify priority or SLA.
    const unit = await trx('support_units').where({ id: body.unit_id, is_active: true }).first();
    if (!unit) fail(400, 'INVALID_UNIT', 'Nhóm không hoạt động.');
    const allocation = body.assignee_id === null ? { assignee_id: null, load_before: null }
      : await allocateAgent(trx, unit.id, before.reporter_id, settings, body.assignee_id, before.id);
    const changes = { owner_unit_id: unit.id, assignee_id: allocation.assignee_id, routing_status: allocation.assignee_id ? 'ASSIGNED' : 'TEAM_QUEUE',
      version: before.version + 1, updated_at: new Date(), routing_evidence: JSON.stringify({ version: 1, source: 'MANUAL', configuration_version: settings.version, unit_id: unit.id, ...allocation }) };
    await trx('tickets').where('id', before.id).update(changes);
    await trx('ticket_history').insert({ ticket_id: before.id, actor_id: user.id, event_type: 'ROUTED', old_value: before.owner_unit_id && String(before.owner_unit_id), new_value: String(unit.id), note: body.reason.trim() });
    await trx('audit_logs').insert({ actor_id: user.id, action: 'TICKET_ROUTED', entity_type: 'ticket', entity_id: String(before.id),
      safe_metadata: JSON.stringify({ version: changes.version, old_unit: before.owner_unit_id, unit_id: unit.id, old_assignee: before.assignee_id, assignee_id: changes.assignee_id, reason: body.reason.trim() }) });
    const updated = { ...before, ...changes };
    const recipients = await routingRecipients(trx, updated);
    await createNotifications(trx, recipients.map(id => ({ recipient_id: id, ticket_id: before.id, notification_type: 'ASSIGNED', title: 'Ticket được chuyển tuyến', message: `Ticket ${before.ticket_code}`, deduplication_key: `route:${before.id}:${changes.version}:${id}` })));
    return trx('tickets').where('id', before.id).first();
  });
  res.json(await presentRouting(db, user, ticket));
}));

export default router;
