import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
import knex from 'knex';
import { createDatabaseConfig, validateDatabaseConfig } from '../../../knexfile.js';
import { DatabaseSessionStore } from '../../src/db/sessionStore.js';

test('Session survives closing and reopening its database pool', async () => {
  const configuration = createDatabaseConfig('test');
  validateDatabaseConfig('test', 'runtime', configuration);
  const id = randomUUID();
  const first = knex(configuration);
  try {
    const store = new DatabaseSessionStore(first);
    await promisify(store.set.bind(store))(id, { cookie: { expires: new Date(Date.now() + 60000) }, fixture: true });
  } finally { await first.destroy(); }
  const second = knex(configuration);
  try {
    const store = new DatabaseSessionStore(second);
    const restored = await promisify(store.get.bind(store))(id);
    assert.equal(restored.fixture, true);
    await promisify(store.destroy.bind(store))(id);
    assert.equal(await promisify(store.get.bind(store))(id), null);
    const expiredId = randomUUID();
    await promisify(store.set.bind(store))(expiredId,
      { cookie: { expires: new Date(Date.now() - 1000) }, fixture: true });
    assert.equal(await promisify(store.get.bind(store))(expiredId), null);
    await promisify(store.destroy.bind(store))(expiredId);
  } finally { await second.destroy(); }
});
