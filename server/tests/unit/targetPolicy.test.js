import test from 'node:test';
import assert from 'node:assert/strict';
import { assertTarget, assertIdentity, targets } from '../../src/db/targetPolicy.js';

test('Reject legacy schemas, root, cross-environment and wrong purposes', () => {
  for (const database of ['smart_it_helpdesk_dev', 'smart_it_helpdesk_test', 'smart_it_helpdesk_new_test']) {
    assert.throws(() => assertTarget('development', 'runtime', { database, user: 'sih_new_app' }));
  }
  assert.throws(() => assertTarget('development', 'runtime', { database: targets.development.schema, user: 'root' }));
  assert.throws(() => assertTarget('development', 'unknown', { database: targets.development.schema, user: 'sih_new_app' }));
});

test('Accept only matching isolated schema, purpose, authenticated account and host', () => {
  for (const [environment, target] of Object.entries(targets)) {
    for (const purpose of ['runtime', 'migration']) {
      assert.doesNotThrow(() => assertTarget(environment, purpose, { database: target.schema, user: target[purpose] }));
      assert.doesNotThrow(() => assertIdentity(environment, purpose, { selected_database: target.schema, matched_account: `${target[purpose]}@127.0.0.1` }));
      assert.throws(() => assertIdentity(environment, purpose, { selected_database: target.schema, matched_account: `${target[purpose]}@%` }));
    }
  }
});
