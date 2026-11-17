import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../../src/app.js';
import { db } from '../../src/db/index.js';

test('Authentication rejects requests without a verified session', async t => {
  t.after(() => db.destroy());

  await t.test('current user requires a session', async () => {
    const response = await request(app).get('/api/v1/auth/me');
    assert.equal(response.status, 401);
    assert.equal(response.body.user, undefined);
  });

  await t.test('callback without a pending OIDC transaction is rejected', async () => {
    const response = await request(app).get('/api/v1/auth/google/callback?code=invalid&state=invalid');
    assert.equal(response.status, 401);
    assert.equal(response.body.error.code, 'LOGIN_REJECTED');
    assert.equal(response.headers['set-cookie'], undefined);
  });
});
