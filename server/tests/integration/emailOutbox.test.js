import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import knex from 'knex';
import { createDatabaseConfig, validateDatabaseConfig } from '../../../knexfile.js';
import { assertIdentity } from '../../src/db/targetPolicy.js';
import { createNotifications } from '../../src/modules/notificationService.js';
import { processEmailOutbox } from '../../src/workers/emailWorker.js';

test('MySQL outbox retries a failed send and records one accepted delivery', async () => {
  const configuration = createDatabaseConfig('test');
  validateDatabaseConfig('test', 'runtime', configuration);
  const database = knex(configuration);
  const token = randomUUID();
  let userId;
  let notificationId;
  try {
    const [identity] = await database.raw('SELECT DATABASE() AS selected_database, CURRENT_USER() AS matched_account');
    assertIdentity('test', 'runtime', identity[0]);
    [userId] = await database('users').insert({ email: `${token}@example.invalid`, full_name: 'Email fixture', role: 'IT_AGENT', is_active: true });
    [notificationId] = await database.transaction(async trx => createNotifications(trx, [{
      recipient_id: userId, notification_type: 'SLA_BREACH', title: 'Fixture alert', message: 'Fixture only',
      deduplication_key: `email-test:${token}`,
    }]));
    const due = new Date(Date.now() + 3600000);
    let row = await database('email_outbox').where({ notification_id: notificationId }).first();
    assert.equal(row.status, 'pending');
    assert.ok(new Date(row.next_attempt_at) <= due);
    const failed = await processEmailOutbox(database, async () => { throw Object.assign(new Error('fake SMTP failure'), { code: 'FAKE_FAILURE' }); }, due, notificationId);
    assert.equal(failed.retried, 1);
    row = await database('email_outbox').where({ notification_id: notificationId }).first();
    assert.equal(row.status, 'pending');
    assert.equal(row.attempts, 1);
    assert.equal(row.last_error_code, 'FAKE_FAILURE');
    let deliveries = 0;
    const delivered = await processEmailOutbox(database, async message => {
      deliveries++;
      assert.equal(message.subject, 'Fixture alert');
      return { accepted: [message.to] };
    }, new Date(Date.now() + 7200000), notificationId);
    assert.equal(delivered.sent, 1);
    assert.equal(deliveries, 1);
    row = await database('email_outbox').where({ notification_id: notificationId }).first();
    assert.equal(row.status, 'sent');
    assert.ok(row.sent_at);
    assert.equal((await processEmailOutbox(database, async () => { throw new Error('duplicate delivery'); }, new Date(Date.now() + 7200000), notificationId)).processed, 0);
  } finally {
    if (notificationId) await database('notifications').where('id', notificationId).delete();
    if (userId) await database('users').where('id', userId).delete();
    await database.destroy();
  }
});
