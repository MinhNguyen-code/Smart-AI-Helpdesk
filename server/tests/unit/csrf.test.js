import test from 'node:test';
import assert from 'node:assert/strict';
import config from '../../src/config/index.js';
import { verifyCsrf } from '../../src/middleware/csrf.js';

function check({ method = 'POST', origin = config.clientUrl, token = 'expected-token' } = {}) {
  const headers = { origin, 'x-csrf-token': token };
  const req = { method, session: { csrfToken: 'expected-token' }, get: name => headers[name.toLowerCase()] };
  let nextCalled = false;
  const result = { status: null, body: null };
  const res = { status(code) { result.status = code; return this; }, json(body) { result.body = body; } };
  verifyCsrf(req, res, () => { nextCalled = true; });
  return { nextCalled, ...result };
}

test('CSRF protects mutations against missing token, wrong token and foreign Origin', () => {
  assert.equal(check().nextCalled, true);
  for (const input of [{ token: '' }, { token: 'wrong' }, { origin: 'https://untrusted.example.invalid' }]) {
    const result = check(input);
    assert.equal(result.nextCalled, false);
    assert.equal(result.status, 403);
    assert.equal(result.body.error.code, 'CSRF_REJECTED');
  }
  assert.equal(check({ method: 'GET', token: '' }).nextCalled, true);
});
