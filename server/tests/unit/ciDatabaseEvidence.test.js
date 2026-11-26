import test from 'node:test';
import assert from 'node:assert/strict';
import { assertCiEvidenceEnvironment } from '../../scripts/ciDatabaseEvidence.js';

test('Database evidence requires the complete explicit GitHub-hosted CI test target', () => {
  const valid = { CI: 'true', GITHUB_ACTIONS: 'true', RUNNER_ENVIRONMENT: 'github-hosted', NODE_ENV: 'test',
    DB_TEST_HOST: '127.0.0.1', DB_TEST_PORT: '3306', DB_TEST_NAME: 'smart_it_helpdesk_new_test', DB_TEST_USER: 'sih_new_test' };
  assert.doesNotThrow(() => assertCiEvidenceEnvironment(valid));
  for (const key of Object.keys(valid)) {
    const missing = { ...valid }; delete missing[key];
    assert.throws(() => assertCiEvidenceEnvironment(missing));
    assert.throws(() => assertCiEvidenceEnvironment({ ...valid, [key]: 'unexpected' }));
  }
  for (const overrides of [{ NODE_ENV: 'development' }, { DB_TEST_NAME: 'smart_it_helpdesk_new_dev' },
    { DB_TEST_USER: 'root' }, { DB_TEST_HOST: 'mysql.example.invalid' }, { RUNNER_ENVIRONMENT: 'self-hosted' }]) {
    assert.throws(() => assertCiEvidenceEnvironment({ ...valid, ...overrides }));
  }
});
