import { pathToFileURL } from 'node:url';
import { db } from '../db/index.js';
import { createNotifications } from '../modules/notificationService.js';
import { hasRouting } from '../modules/routing/routingPolicy.js';
import { routingRecipients } from '../modules/routing/routingService.js';

export async function runSlaCheck(database = db, afterId = 0, now = new Date()) {
  const tickets = await database('tickets').where('id', '>', afterId).orderBy('id').limit(100).select('id');
  let notified = 0;
  for (const candidate of tickets) {
    notified += await database.transaction(async trx => {
      const ticket = await trx('tickets').where('id', candidate.id).forUpdate().first();
      if (!ticket) return 0;
      const staff = hasRouting(ticket) ? (await routingRecipients(trx, ticket)).map(id => ({ id }))
        : await trx('users').where({ is_active: true }).whereIn('role', ['ADMIN', 'IT_AGENT']).select('id');
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
          await createNotifications(trx, [{ recipient_id: recipient.id, ticket_id: ticket.id,
            notification_type: 'SLA_BREACH', title: 'Ticket quá hạn SLA',
            message: `Ticket ${ticket.ticket_code}: ${kind === 'response' ? 'quá hạn phản hồi' : 'quá hạn xử lý'}`,
            deduplication_key: key }]);
          count++;
        }
      }
      return count;
    });
  }
  return { checked: tickets.length, notified, cursor: tickets.length === 100 ? tickets.at(-1).id : 0 };
}

export function startSlaWorker({ check = runSlaCheck, logger = console } = {}) {
  let stopped = false;
  let cursor = 0;
  let retryDelay = 1000;
  let timer;
  let active;

  async function tick() {
    let delay;
    try {
      const result = await check(db, cursor);
      cursor = result.cursor;
      retryDelay = 1000;
      delay = cursor ? 1000 : 60000;
      logger.log(JSON.stringify({ event: 'sla_check', ...result }));
    } catch (error) {
      delay = retryDelay;
      retryDelay = Math.min(retryDelay * 2, 60000);
      logger.error(JSON.stringify({
        event: 'sla_check_failed',
        code: error.code || 'WORKER_FAILURE',
        retryInMs: delay,
      }));
    }
    if (!stopped) timer = setTimeout(launch, delay);
  }

  function launch() {
    active = tick();
  }

  launch();
  return {
    async stop() {
      stopped = true;
      clearTimeout(timer);
      await active;
    },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const worker = startSlaWorker();
  let stopping = false;
  async function shutdown() {
    if (stopping) return;
    stopping = true;
    const timeout = setTimeout(() => {
      console.error('SLA worker shutdown timed out.');
      process.exit(1);
    }, 10000);
    try {
      await worker.stop();
      await db.destroy();
    } catch (error) {
      console.error('SLA worker shutdown failed:', error.code || 'WORKER_FAILURE');
      process.exitCode = 1;
    } finally {
      clearTimeout(timeout);
    }
  }
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
