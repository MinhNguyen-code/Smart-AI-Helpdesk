import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import knex from 'knex';
import { createDatabaseConfig, validateDatabaseConfig } from '../../../knexfile.js';
import { assertIdentity } from '../../src/db/targetPolicy.js';

test('Isolated MySQL test database rolls back a real ticket transaction', async () => {
  const configuration = createDatabaseConfig('test');
  validateDatabaseConfig('test', 'runtime', configuration);
  const db = knex(configuration);
  const ticketCode = randomUUID().replaceAll('-', '');
  const sentinel = new Error('intentional rollback');
  try {
    const [identity] = await db.raw('SELECT DATABASE() AS selected_database, CURRENT_USER() AS matched_account');
    assertIdentity('test', 'runtime', identity[0]);
    await assert.rejects(db.transaction(async trx => {
      const [userId] = await trx('users').insert({ email: `${ticketCode}@example.invalid`, full_name: 'Integration fixture', role: 'END_USER', is_active: false });
      await trx('tickets').insert({ ticket_code: ticketCode, reporter_id: userId, title: 'Rollback verification', description: 'Isolated integration fixture' });
      assert.ok(await trx('tickets').where({ ticket_code: ticketCode }).first());
      throw sentinel;
    }), error => error === sentinel);
    assert.equal(await db('tickets').where({ ticket_code: ticketCode }).first(), undefined);
  } finally { await db.destroy(); }
});
