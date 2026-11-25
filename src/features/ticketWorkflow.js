export const workflowStatus = { PENDING_USER: 'Chờ người gửi', CLOSED: 'Đã đóng' };
export const kanbanColumn = status => ({ PENDING_USER: 'IN_PROGRESS', CLOSED: 'RESOLVED' })[status] ?? status;

const transitions = { start: 'IN_PROGRESS', request_information: 'PENDING_USER', resume: 'IN_PROGRESS',
  resolve: 'RESOLVED', confirm: 'CLOSED', reopen: 'IN_PROGRESS' };

export function workflowRequest(action, ticket, fields = {}) {
  const base = '/tickets/' + ticket.id;
  const { version } = ticket;
  if (Object.hasOwn(transitions, action)) {
    return [base + '/status', 'PATCH', { ...fields, version, status: transitions[action] }];
  }
  if (action === 'acknowledge') return [base + '/acknowledge', 'POST', { ...fields, version }];
  if (['assign', 'unassign', 'claim'].includes(action)) return [base + '/assign', 'PATCH', { ...fields, version }];
  if (['reply_public', 'reply_internal'].includes(action)) {
    return [base + '/comments', 'POST', { ...fields, version, visibility: action === 'reply_internal' ? 'internal' : 'public' }];
  }
  throw new Error('Unknown ticket action');
}
