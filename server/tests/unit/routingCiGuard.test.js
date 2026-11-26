import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('Routing migration and destructive HTTP fixtures reject non-CI invocation before DB imports', () => {
  const env = { ...process.env, CI: 'false', NODE_ENV: 'test', RUN_ROUTING_DB: '1', DB_TEST_HOST: '127.0.0.1', DB_TEST_PORT: '1',
    DB_TEST_NAME: 'smart_it_helpdesk_new_test', DB_TEST_USER: 'sih_new_test' };
  delete env.NODE_TEST_CONTEXT; // Each child is a standalone CLI invocation.
  for (const args of [['server/scripts/ciRoutingMigration.js'], ['--test', 'server/tests/integration/routingApi.test.js'],
    ['--test', 'server/tests/integration/setupAndTicketList.test.js']]) {
    const result = spawnSync(process.execPath, args, { env, encoding: 'utf8', timeout: 15000 });
    assert.equal(result.status, 1);
    assert.match(result.stdout + result.stderr, /CI_DATABASE_EVIDENCE_REJECTED/);
    assert.doesNotMatch(result.stdout + result.stderr, /ECONNREFUSED|Access denied|Acquire connection error/);
  }
});
