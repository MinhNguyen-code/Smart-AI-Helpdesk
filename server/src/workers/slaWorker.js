import { db } from '../db/index.js';

export async function runSlaCheck(database = db, afterId = 0, now = new Date()) {
  const tickets = await database('tickets').where('id', '>', afterId).orderBy('id').limit(100).select('id');
  let notified = 0;
  for (const candidate of tickets) {
    notified += await database.transaction(async trx => {
      const ticket = await trx('tickets').where('id', candidate.id).forUpdate().first();
      if (!ticket) return 0;
      const staff = await trx('users').where({ is_active: true }).whereIn('role', ['ADMIN', 'IT_AGENT']).select('id');
      let count = 0;
      for (const [kind, deadlineField, completedField] of [
        ['response', 'response_deadline_at', 'first_response_at'],
        ['resolution', 'resolution_deadline_at', 'resolved_at'],
      ]) {
        const deadline = ticket[deadlineField] && new Date(ticket[deadlineField]);
        const completed = ticket[completedField] && new Date(ticket[completedField]);
        if (!deadline || deadline >= now || (completed && completed <= deadline)) continue;
        for (const recipient of staff) {
          const key = `sla:${ticket.id}:${kind}:${recipient.id}`;
          if (await trx('notifications').where('deduplication_key', key).first()) continue;
          await trx('notifications').insert({ recipient_id: recipient.id, ticket_id: ticket.id,
            notification_type: 'SLA_BREACH', title: 'Ticket quá hạn SLA',
            message: `Ticket ${ticket.ticket_code}: ${kind === 'response' ? 'quá hạn phản hồi' : 'quá hạn xử lý'}`,
            deduplication_key: key });
          count++;
        }
      }
      return count;
    });
  }
  return { checked: tickets.length, notified, cursor: tickets.length === 100 ? tickets.at(-1).id : 0 };
}

if (process.argv[1]?.endsWith('slaWorker.js')) {
  let stopped = false;
  let cursor = 0;
  let timer;
  const shutdown = async () => { stopped = true; clearTimeout(timer); await db.destroy(); };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  async function tick() {
    try {
      const result = await runSlaCheck(db, cursor);
      cursor = result.cursor;
      console.log(JSON.stringify({ event: 'sla_check', ...result }));
    } catch (error) {
      console.error(JSON.stringify({ event: 'sla_check_failed', code: error.code || 'WORKER_FAILURE' }));
    } finally {
      if (!stopped) timer = setTimeout(tick, cursor ? 1000 : 60000);
    }
  }
  tick();
}
