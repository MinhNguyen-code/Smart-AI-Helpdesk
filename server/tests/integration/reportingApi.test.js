import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
import signature from 'cookie-signature';
import request from 'supertest';

process.env.NODE_ENV = 'test';
const { default: app } = await import('../../src/app.js');
const { db } = await import('../../src/db/index.js');
const { default: config } = await import('../../src/config/index.js');
const { DatabaseSessionStore } = await import('../../src/db/sessionStore.js');

test('Notifications isolate recipients and analytics aggregate real SQL data', async () => {
  const token = randomUUID();
  const ids = [];
  const sids = [];
  const ticketIds = [];
  const store = new DatabaseSessionStore(db);
  async function fixture(role) {
    const [id] = await db('users').insert({ email: `${randomUUID()}@example.invalid`, full_name: 'Reporting fixture', role, is_active: true });
    ids.push(id);
    const sid = randomUUID(); sids.push(sid);
    await promisify(store.set.bind(store))(sid, { cookie: { expires: new Date(Date.now() + 60000) }, user: { id, role }, csrfToken: token });
    return { id, cookie: `${config.session.name}=${encodeURIComponent(`s:${signature.sign(sid, config.session.secret)}`)}` };
  }
  const mutate = (cookie, method, url) => request(app)[method](url).set('Cookie', cookie)
    .set('Origin', config.clientUrl).set('X-CSRF-Token', token);
  try {
    const admin = await fixture('ADMIN');
    const other = await fixture('END_USER');
    const category = await db('categories').first();
    assert.ok(category);
    const today = '2001-01-15';
    const base = new Date(`${today}T12:00:00Z`);
    for (const [index, compliant] of [true, false].entries()) {
      const [id] = await db('tickets').insert({ ticket_code: randomUUID().replaceAll('-', ''), reporter_id: other.id,
        category_id: category.id, title: 'Reporting fixture', description: 'Reporting fixture', priority: index ? 'P2' : 'P1',
        status: 'RESOLVED', created_at: base, updated_at: base,
        acknowledged_at: compliant ? new Date(base.getTime() + 5 * 60000) : null,
        response_deadline_at: new Date(base.getTime() + 15 * 60000), resolution_deadline_at: new Date(base.getTime() + 120 * 60000),
        first_response_at: compliant ? new Date(base.getTime() + 10 * 60000) : null,
        resolved_at: new Date(base.getTime() + (compliant ? 60 : 180) * 60000) });
      ticketIds.push(id);
    }
    const [notificationId] = await db('notifications').insert({ recipient_id: admin.id, ticket_id: ticketIds[0],
      notification_type: 'TICKET_CREATED', title: 'Fixture', message: 'Fixture' });
    assert.equal((await request(app).get('/api/v1/notifications')).status, 401);
    const own = await request(app).get('/api/v1/notifications').set('Cookie', admin.cookie);
    assert.equal(own.status, 200);
    assert.ok(own.body.unreadCount >= 1);
    assert.ok(own.body.items.some(item => item.id === notificationId));
    const stranger = await request(app).get('/api/v1/notifications').set('Cookie', other.cookie);
    assert.equal(stranger.status, 200);
    assert.ok(stranger.body.items.every(item => item.id !== notificationId));
    assert.equal((await mutate(other.cookie, 'patch', `/api/v1/notifications/${notificationId}/read`)).status, 404);
    assert.equal((await mutate(admin.cookie, 'patch', `/api/v1/notifications/${notificationId}/read`)).status, 204);
    assert.equal((await db('notifications').where('id', notificationId).first()).is_read, 1);
    assert.equal((await mutate(admin.cookie, 'post', '/api/v1/notifications/read-all')).status, 204);
    assert.equal((await request(app).get('/api/v1/analytics/summary').set('Cookie', other.cookie)).status, 403);
    const query = `?startDate=${today}&endDate=${today}`;
    const summary = await request(app).get(`/api/v1/analytics/summary${query}`).set('Cookie', admin.cookie);
    assert.equal(summary.status, 200, JSON.stringify(summary.body));
    assert.equal(summary.body.total, 2);
    assert.equal(summary.body.slaEvaluated, 2);
    assert.equal(summary.body.slaCompliant, 1);
    assert.equal(summary.body.slaCompliancePercent, 50);
    assert.equal(summary.body.mttaSeconds, 300);
    assert.equal(summary.body.firstResponseSeconds, 600);
    assert.equal(summary.body.mttrSeconds, 7200);
    const daily = await request(app).get(`/api/v1/analytics/daily${query}`).set('Cookie', admin.cookie);
    assert.equal(daily.status, 200);
    assert.equal(daily.body[0].count, 2);
    const priorities = await request(app).get(`/api/v1/analytics/priorities${query}`).set('Cookie', admin.cookie);
    assert.equal(priorities.status, 200);
    assert.deepEqual(priorities.body.map(row => row.count), [1, 1]);
    const categories = await request(app).get(`/api/v1/analytics/categories${query}`).set('Cookie', admin.cookie);
    assert.equal(categories.status, 200);
    assert.equal(categories.body[0].percent, 100);
    assert.equal((await request(app).get('/api/v1/analytics/summary?startDate=2026-02-30&endDate=2026-02-30').set('Cookie', admin.cookie)).status, 400);
  } finally {
    if (ticketIds.length) {
      await db('notifications').whereIn('ticket_id', ticketIds).delete();
      await db('tickets').whereIn('id', ticketIds).delete();
    }
    for (const sid of sids) await promisify(store.destroy.bind(store))(sid);
    if (ids.length) await db('users').whereIn('id', ids).delete();
    await db.destroy();
  }
});
