import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../../src/app.js';
import { db } from '../../src/db/index.js';

test('System Health API Integration Tests', async (t) => {
  t.after(() => db.destroy());
  await t.test('GET /api/v1/health returns 200 and UP status', async () => {
    const res = await request(app).get('/api/v1/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'UP');
    assert.ok(typeof res.body.uptimeSeconds === 'number');
    assert.ok(res.body.timestamp);
  });

  await t.test('GET /api returns 200 with API metadata', async () => {
    const res = await request(app).get('/api');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.name, 'Smart IT Helpdesk API');
    assert.strictEqual(res.body.endpoints.health, '/api/v1/health');
  });

  await t.test('GET /api/v1/ready returns status matching database availability', async () => {
    const res = await request(app).get('/api/v1/ready');
    // If DB is connected -> 200 READY; if DB is offline -> 503 NOT_READY
    assert.ok([200, 503].includes(res.status));
    assert.ok(['READY', 'NOT_READY'].includes(res.body.status));
    assert.ok(res.body.database);
    const ready = res.body.database.connected && res.body.database.isTargetVerified;
    assert.equal(res.status, ready ? 200 : 503);
    assert.equal(res.body.status, ready ? 'READY' : 'NOT_READY');
    assert.ok(!JSON.stringify(res.body).includes('using password:'));
    assert.strictEqual(res.body.database.targetDatabase.includes('smart_it_helpdesk'), true);
  });

  await t.test('GET /api/v1/unknown-endpoint returns standard 404 error structure', async () => {
    const res = await request(app).get('/api/v1/unknown-endpoint');
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.error.code, 'ROUTE_NOT_FOUND');
    assert.strictEqual(res.body.error.statusCode, 404);
  });
});
