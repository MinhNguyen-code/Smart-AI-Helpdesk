import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import app from '../../src/app.js';
import { db } from '../../src/db/index.js';
import { createSystemRouter } from '../../src/modules/system/systemRoutes.js';

test('System Health API Integration Tests', async (t) => {
  t.after(() => db.destroy());
  await t.test('GET /api/v1/health returns 200 and UP status', async () => {
    const res = await request(app).get('/api/v1/health');
    assert.strictEqual(res.status, 200);
    assert.deepEqual(res.body, { status: 'UP' });
  });

  await t.test('GET /api returns 200 with API metadata', async () => {
    const res = await request(app).get('/api');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.name, 'Smart IT Helpdesk API');
    assert.strictEqual(res.body.endpoints.health, '/api/v1/health');
  });

  await t.test('GET /api/v1/ready returns status matching database availability', async () => {
    const res = await request(app).get('/api/v1/ready');
    assert.ok([200, 503].includes(res.status));
    assert.deepEqual(res.body, { status: res.status === 200 ? 'READY' : 'NOT_READY' });
  });

  await t.test('public readiness hides database details in both states', async () => {
    for (const [health, status, publicStatus] of [
      [{ connected: true, isTargetVerified: true, targetDatabase: 'private_schema', code: 'PRIVATE' }, 200, 'READY'],
      [{ connected: false, isTargetVerified: false, targetDatabase: 'private_schema', code: 'PRIVATE' }, 503, 'NOT_READY'],
      [{ connected: true, isTargetVerified: true, routingReady: false }, 503, 'NOT_READY'],
    ]) {
      const probe = express().use('/api/v1', createSystemRouter(async () => health, { warn() {}, info() {} }));
      const res = await request(probe).get('/api/v1/ready');
      assert.equal(res.status, status);
      assert.deepEqual(res.body, { status: publicStatus });
    }
    const failedProbe = express().use('/api/v1', createSystemRouter(
      async () => { throw new Error('private failure'); }, { warn() {}, info() {} }));
    const failure = await request(failedProbe).get('/api/v1/ready');
    assert.equal(failure.status, 503);
    assert.deepEqual(failure.body, { status: 'NOT_READY' });
  });

  await t.test('GET /api/v1/unknown-endpoint returns standard 404 error structure', async () => {
    const res = await request(app).get('/api/v1/unknown-endpoint');
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.error.code, 'ROUTE_NOT_FOUND');
    assert.strictEqual(res.body.error.statusCode, 404);
  });
});
