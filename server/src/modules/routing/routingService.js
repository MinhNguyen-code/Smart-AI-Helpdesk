import { chooseAgent, decideUnit, hasRouting, routingEnabled, routingError } from './routingPolicy.js';

const parse = value => typeof value === 'string' ? JSON.parse(value) : value;
export const routingTransaction = (database, action) => database.transaction(action, { isolationLevel: 'read committed' });

export async function lockRouting(database) {
  // A single configuration row serializes allocation and configuration changes.
  // READ COMMITTED makes workload reads after this lock reflect the last commit.
  const settings = await database('routing_settings').where('id', 1).forUpdate().first();
  if (!settings) throw routingError(503, 'ROUTING_NOT_READY', 'Phân tuyến chưa được thiết lập.');
  return settings;
}

export async function allocateAgent(trx, unitId, reporterId, settings, explicit, exceptTicketId) {
  const unit = await trx('support_units').where({ id: unitId, is_active: true }).first();
  if (!unit) throw routingError(400, 'INVALID_UNIT', 'Nhóm phụ trách không hoạt động.');
  const candidates = await trx('support_unit_memberships as member').join('users as agent', 'agent.id', 'member.user_id')
    .where('member.unit_id', unitId).where('agent.role', 'IT_AGENT').where('agent.is_active', true)
    .select('agent.id', 'agent.role', 'agent.is_active', 'member.is_available', 'member.last_assigned_at')
    .orderBy('agent.id').forUpdate();
  const loadQuery = trx('tickets').whereIn('assignee_id', candidates.map(agent => agent.id)).whereIn('status', ['OPEN', 'IN_PROGRESS']);
  if (exceptTicketId) loadQuery.whereNot('id', exceptTicketId);
  const workloads = candidates.length ? await loadQuery.select('assignee_id').count('* as count').groupBy('assignee_id') : [];
  const counts = new Map(workloads.map(row => [row.assignee_id, Number(row.count)]));
  const eligible = candidates.filter(agent => agent.id !== reporterId && agent.is_available
    && (counts.get(agent.id) || 0) < settings.max_open_per_agent);
  const selected = explicit === undefined
    ? settings.auto_assign && chooseAgent(candidates, counts, settings.max_open_per_agent, reporterId)
    : eligible.find(agent => agent.id === explicit);
  if (explicit !== undefined && !selected) throw routingError(409, 'AGENT_NOT_ELIGIBLE', 'Kỹ thuật viên phải thuộc nhóm, đang nhận việc và còn sức chứa.');
  if (selected) await trx('support_unit_memberships').where('user_id', selected.id).update({ last_assigned_at: new Date() });
  return { assignee_id: selected?.id || null, load_before: selected ? counts.get(selected.id) || 0 : null };
}

export async function initialRouting(trx, fields, reporterId) {
  if (!routingEnabled()) return {};
  const settings = await lockRouting(trx);
  const rows = await trx('category_unit_routes as route').join('categories as category', 'category.id', 'route.category_id')
    .join('support_units as unit', 'unit.id', 'route.unit_id')
    .select('route.*', 'unit.is_active as unit_active', 'category.is_active as category_active');
  const decision = decideUnit(fields, rows.map(row => ({ ...row, keywords: parse(row.keywords) })));
  const allocation = decision.unit_id ? await allocateAgent(trx, decision.unit_id, reporterId, settings) : { assignee_id: null, load_before: null };
  return { owner_unit_id: decision.unit_id, assignee_id: allocation.assignee_id,
    ...(fields.category_id == null ? { category_id: decision.category_id ?? null } : {}),
    routing_status: !decision.unit_id ? 'REVIEW_REQUIRED' : allocation.assignee_id ? 'ASSIGNED' : 'TEAM_QUEUE',
    routing_evidence: JSON.stringify({ version: 1, configuration_version: settings.version, ...decision, ...allocation,
      capacity: settings.max_open_per_agent, policy: 'least_open_then_oldest_assignment' }) };
}

export async function ticketRoutingPermissions(database, user, ticket, lock = false) {
  if (!hasRouting(ticket)) return null;
  const membership = database('support_unit_memberships').where({ unit_id: ticket.owner_unit_id, user_id: user.id });
  if (lock) membership.forShare();
  const member = user.role === 'IT_AGENT' && ticket.owner_unit_id ? await membership.first() : null;
  const reporter = ticket.reporter_id === user.id;
  const admin = user.role === 'ADMIN';
  return {
    can_handle: admin || Boolean(member && !reporter && ticket.assignee_id === user.id),
    can_assign: ticket.status !== 'RESOLVED' && (admin || Boolean(member && !reporter && !ticket.assignee_id)),
    can_attach: reporter || admin || Boolean(member && ticket.assignee_id === user.id),
    can_internal: admin || Boolean(member && !reporter && ticket.assignee_id === user.id),
    can_read_internal: admin || Boolean(member && !reporter),
    can_route: admin && ticket.status !== 'RESOLVED',
  };
}

export async function requireTicketAction(database, user, ticket, action, visibility) {
  if (!hasRouting(ticket)) return;
  const current = await database('users').where({ id: user.id, is_active: true }).forShare().first();
  if (!current) throw routingError(401, 'ACCOUNT_INACTIVE', 'Tài khoản không hoạt động.');
  const permissions = await ticketRoutingPermissions(database, current, ticket, true);
  const reporter = ticket.reporter_id === user.id;
  const allowed = action === 'reply' ? (visibility === 'internal' ? permissions.can_internal : reporter || permissions.can_handle)
    : action === 'attach' ? permissions.can_attach : action === 'assign' ? permissions.can_assign : permissions.can_handle;
  if (!allowed) throw routingError(403, 'ROUTING_ACTION_FORBIDDEN', 'Chỉ người phụ trách trong nhóm hoặc quản trị viên được xử lý ticket này.');
}

export async function routingRecipients(database, ticket) {
  const admins = await database('users').where({ role: 'ADMIN', is_active: true }).pluck('id');
  if (!ticket.owner_unit_id) return admins;
  const query = database('support_unit_memberships as member').join('users as agent', 'agent.id', 'member.user_id')
    .where({ 'member.unit_id': ticket.owner_unit_id, 'agent.role': 'IT_AGENT', 'agent.is_active': true });
  if (ticket.assignee_id) query.where('agent.id', ticket.assignee_id);
  else query.where('member.is_available', true);
  const agents = await query.pluck('agent.id');
  return [...new Set([...admins, ...agents])].filter(id => id !== ticket.reporter_id);
}

export async function presentRouting(database, user, ticket) {
  const permissions = await ticketRoutingPermissions(database, user, ticket);
  if (!permissions) return routingEnabled() && user.role === 'ADMIN' && ticket.status !== 'RESOLVED'
    ? { ...ticket, can_route_legacy: true } : ticket;
  const unit = ticket.owner_unit_id && await database('support_units').where('id', ticket.owner_unit_id).select('name', 'code').first();
  const result = { ...ticket, owner_unit_name: unit?.name || null, owner_unit_code: unit?.code || null, routing_permissions: permissions };
  if (permissions.can_assign && ticket.owner_unit_id) result.routing_assignable_agents = await database('support_unit_memberships as member')
    .join('users as agent', 'agent.id', 'member.user_id').where({ 'member.unit_id': ticket.owner_unit_id, 'member.is_available': true, 'agent.is_active': true, 'agent.role': 'IT_AGENT' })
    .whereNot('agent.id', ticket.reporter_id).select('agent.id', 'agent.full_name').orderBy('agent.id');
  if (!permissions.can_read_internal) delete result.routing_evidence;
  return result;
}
