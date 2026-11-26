const priorities = ['P1', 'P2', 'P3', 'P4'];
const sorts = ['newest', 'sla', 'priority'];

export function ticketListOptions(input) {
  const page = Number(input.page ?? 1);
  const search = input.search ?? '';
  const priority = input.priority;
  const sort = input.sort ?? 'newest';
  if (!Number.isSafeInteger(page) || page < 1 || page > Math.floor(Number.MAX_SAFE_INTEGER / 30)
      || typeof search !== 'string' || search.length > 200
      || priority !== undefined && !priorities.includes(priority) || !sorts.includes(sort)) {
    throw Object.assign(new Error('Invalid ticket list filters'), { statusCode: 400 });
  }
  return { page, search: search.trim(), priority, sort };
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
