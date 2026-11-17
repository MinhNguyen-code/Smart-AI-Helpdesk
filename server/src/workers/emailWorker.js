import { randomUUID } from 'node:crypto';
import nodemailer from 'nodemailer';
import { db } from '../db/index.js';
import config from '../config/index.js';

const address = /^[^\s@<>(),;]+@[^\s@<>(),;]+\.[^\s@<>(),;]+$/;

export async function processEmailOutbox(database, send, now = new Date(), notificationId = null) {
  const lease = randomUUID();
  const claimed = await database.transaction(async trx => {
    const query = trx('email_outbox')
      .where(builder => builder.where('status', 'pending').where('next_attempt_at', '<=', now)
        .orWhere(inner => inner.where('status', 'sending').where('locked_until', '<=', now)));
    if (notificationId !== null) query.where('notification_id', notificationId);
    const row = await query.orderBy('id').forUpdate().skipLocked().first();
    if (!row) return null;
    await trx('email_outbox').where('id', row.id).update({ status: 'sending',
      attempts: row.attempts + 1, lease_token: lease,
      locked_until: new Date(now.getTime() + 120000), updated_at: now });
    return { ...row, attempts: row.attempts + 1 };
  });
  if (!claimed) return { processed: 0 };
  const notification = await database('notifications as n').join('users as u', 'u.id', 'n.recipient_id')
    .where('n.id', claimed.notification_id)
    .select('n.title', 'n.message', 'u.email', 'u.is_active').first();
  try {
    if (!notification?.is_active || !address.test(notification.email)) {
      await database('email_outbox').where({ id: claimed.id, lease_token: lease })
        .update({ status: 'skipped', locked_until: null, lease_token: null, updated_at: now });
      return { processed: 1, skipped: 1 };
    }
    const info = await send({ to: notification.email, subject: notification.title, text: notification.message });
    if (!info?.accepted?.includes(notification.email)) throw Object.assign(new Error('SMTP recipient not accepted'), { code: 'NOT_ACCEPTED' });
    await database('email_outbox').where({ id: claimed.id, lease_token: lease })
      .update({ status: 'sent', sent_at: new Date(), locked_until: null, lease_token: null,
        last_error_code: null, updated_at: new Date() });
    return { processed: 1, sent: 1 };
  } catch (error) {
    const retry = claimed.attempts < 8;
    const delay = Math.min(3600, 30 * 2 ** (claimed.attempts - 1));
    await database('email_outbox').where({ id: claimed.id, lease_token: lease })
      .update({ status: retry ? 'pending' : 'failed',
        next_attempt_at: new Date(Date.now() + delay * 1000), locked_until: null,
        lease_token: null, last_error_code: String(error.code || 'SEND_FAILED').slice(0, 64), updated_at: new Date() });
    return { processed: 1, retried: Number(retry), failed: Number(!retry) };
  }
}

export function createSmtpTransport(smtp = config.smtp) {
  if (!smtp.host || !smtp.user || !smtp.password || !address.test(smtp.from)) {
    throw new Error('SMTP_CONFIGURATION_MISSING');
  }
  if (!Number.isSafeInteger(smtp.port) || smtp.port < 1 || smtp.port > 65535) {
    throw new Error('SMTP_PORT_INVALID');
  }
  return nodemailer.createTransport({ host: smtp.host, port: smtp.port,
    secure: smtp.port === 465, requireTLS: smtp.port !== 465,
    auth: { user: smtp.user, pass: smtp.password },
    disableFileAccess: true, disableUrlAccess: true,
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000 });
}

if (process.argv[1]?.endsWith('emailWorker.js')) {
  const transport = createSmtpTransport();
  let stopped = false;
  let timer;
  const shutdown = async () => { stopped = true; clearTimeout(timer); transport.close(); await db.destroy(); };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  async function tick() {
    try {
      const result = await processEmailOutbox(db, message => transport.sendMail({
        from: { address: config.smtp.from }, to: [{ address: message.to }],
        subject: message.subject, text: message.text,
      }));
      if (result.processed) console.log(JSON.stringify({ event: 'email_outbox', ...result }));
      if (!stopped) timer = setTimeout(tick, result.processed ? 1000 : 15000);
    } catch (error) {
      console.error(JSON.stringify({ event: 'email_outbox_failed', code: error.code || 'WORKER_FAILURE' }));
      if (!stopped) timer = setTimeout(tick, 30000);
    }
  }
  tick();
}
