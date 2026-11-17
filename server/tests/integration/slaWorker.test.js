import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import knex from 'knex';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { createDatabaseConfig, validateDatabaseConfig } from '../../../knexfile.js';
import { runSlaCheck } from '../../src/workers/slaWorker.js';

test('Concurrent SLA checks persist one notification per obligation and recipient', async () => {
  const configuration = createDatabaseConfig('test');
  validateDatabaseConfig('test', 'runtime', configuration);
  const database = knex(configuration);
  const unique = randomUUID();
  let userId;
  let ticketId;
  try {
    [userId] = await database('users').insert({ email: `${unique}@example.invalid`, full_name: 'SLA fixture', role: 'IT_AGENT', is_active: true });
    [ticketId] = await database('tickets').insert({ ticket_code: unique.replaceAll('-', ''), reporter_id: userId,
      title: 'SLA fixture', description: 'Fixture', response_deadline_at: new Date(Date.now() - 120000), resolution_deadline_at: new Date(Date.now() - 60000) });
    await Promise.all([runSlaCheck(database, ticketId - 1), runSlaCheck(database, ticketId - 1)]);
    await runSlaCheck(database, ticketId - 1);
    const script = `import { runSlaCheck } from './server/src/workers/slaWorker.js';
      import { db } from './server/src/db/index.js';
      try { await runSlaCheck(db, ${ticketId - 1}); } finally { await db.destroy(); }`;
    await promisify(execFile)(process.execPath, ['--input-type=module', '-e', script],
      { cwd: path.resolve('.'), env: { ...process.env, NODE_ENV: 'test' } });
    const alerts = await database('notifications').where({ ticket_id: ticketId, recipient_id: userId });
    assert.equal(alerts.length, 2);
    assert.equal(new Set(alerts.map(alert => alert.deduplication_key)).size, 2);
  } finally {
    if (ticketId) {
      await database('notifications').where('ticket_id', ticketId).delete();
      await database('tickets').where('id', ticketId).delete();
    }
    if (userId) await database('users').where('id', userId).delete();
    await database.destroy();
  }
});
