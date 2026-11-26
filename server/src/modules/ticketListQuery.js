const priorities = ['P1', 'P2', 'P3', 'P4'];
const sorts = ['newest', 'sla', 'priority'];
const scopes = ['all', 'mine', 'team', 'review'];

export function ticketListOptions(input) {
  const page = Number(input.page ?? 1);
  const search = input.search ?? '';
  const priority = input.priority;
  const sort = input.sort ?? 'newest';
  const scope = input.scope ?? 'all';
  if (!Number.isSafeInteger(page) || page < 1 || page > Math.floor(Number.MAX_SAFE_INTEGER / 30)
      || typeof search !== 'string' || search.length > 200
      || priority !== undefined && !priorities.includes(priority) || !sorts.includes(sort) || !scopes.includes(scope)) {
    throw Object.assign(new Error('Invalid ticket list filters'), { statusCode: 400 });
  }
  return { page, search: search.trim(), priority, sort, scope };
}

export function scopeTicketList(database, query, user, scope, routingEnabled) {
  if (scope === 'all') return query;
  if (!['ADMIN', 'IT_AGENT'].includes(user.role)) throw Object.assign(new Error('Staff queue required'), { statusCode: 403 });
  query.whereIn('status', ['OPEN', 'IN_PROGRESS']);
  if (scope === 'mine') return query.where('assignee_id', user.id);
  if (!routingEnabled) throw Object.assign(new Error('Routing queue unavailable'), { statusCode: 400 });
  if (scope === 'review') return query.where('routing_status', 'REVIEW_REQUIRED');
  return query.whereIn('owner_unit_id', database('support_unit_memberships as member')
    .join('support_units as unit', 'unit.id', 'member.unit_id')
    .where({ 'member.user_id': user.id, 'unit.is_active': true }).select('unit.id'));
}

export function filterTicketList(query, { search, priority }) {
  if (search) query.where(builder => builder.where('title', 'like', `%${search}%`).orWhere('ticket_code', 'like', `%${search}%`));
  if (priority) query.where('priority', priority);
  return query;
}

export function sortTicketList(query, sort) {
  if (sort === 'sla') query.orderByRaw('resolution_deadline_at IS NULL ASC').orderBy('resolution_deadline_at', 'asc');
  else if (sort === 'priority') query.orderBy('priority', 'asc');
  return query.orderBy('id', 'desc');
}
