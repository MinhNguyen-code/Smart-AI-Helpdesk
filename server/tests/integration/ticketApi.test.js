import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
import signature from 'cookie-signature';
import request from 'supertest';

// The fixture exists only in this test process; there is no application login bypass.
process.env.NODE_ENV = 'test';
const { default: app } = await import('../../src/app.js');
const { db } = await import('../../src/db/index.js');
const { default: config } = await import('../../src/config/index.js');
const { DatabaseSessionStore } = await import('../../src/db/sessionStore.js');

test('HTTP creates a classified ticket, enforces ownership and persists lifecycle', async () => {
  const unique = randomUUID();
  const sessionIds = [];
  const userIds = [];
  let ticketId;
  let categoryId;
  const store = new DatabaseSessionStore(db);
  async function fixture(role) {
    const [id] = await db('users').insert({ email: `${role}-${randomUUID()}@example.invalid`, full_name: 'Test fixture', role, is_active: true });
    userIds.push(id);
    const sid = randomUUID();
    sessionIds.push(sid);
    await promisify(store.set.bind(store))(sid, { cookie: { expires: new Date(Date.now() + 60000) }, user: { id, role }, csrfToken: unique });
    return `${config.session.name}=${encodeURIComponent(`s:${signature.sign(sid, config.session.secret)}`)}`;
  }
  try {
    const reporter = await fixture('END_USER');
    const stranger = await fixture('END_USER');
    const agent = await fixture('IT_AGENT');
    [categoryId] = await db('categories').insert({ name: unique });
    const response = await request(app).post('/api/v1/tickets').set('Cookie', reporter)
      .set('Origin', config.clientUrl).set('X-CSRF-Token', unique)
      .send({ title: 'Sự cố toàn tổ chức', description: 'Integration test', impact: 'organization', category_id: categoryId });
    assert.equal(response.status, 201, JSON.stringify(response.body));
    ticketId = response.body.id;
    assert.equal(response.body.priority, 'P1');
    assert.ok(response.body.response_deadline_at);
    assert.equal((await request(app).get(`/api/v1/tickets/${ticketId}`).set('Cookie', stranger)).status, 404);
    const internalDenied = await request(app).post(`/api/v1/tickets/${ticketId}/comments`).set('Cookie', reporter)
      .set('Origin', config.clientUrl).set('X-CSRF-Token', unique).send({ message: 'Private', visibility: 'internal' });
    assert.equal(internalDenied.status, 403);
    const reply = await request(app).post(`/api/v1/tickets/${ticketId}/comments`).set('Cookie', agent)
      .set('Origin', config.clientUrl).set('X-CSRF-Token', unique).send({ message: 'Đang xử lý' });
    assert.equal(reply.status, 201);
    assert.ok((await db('tickets').where('id', ticketId).first()).first_response_at);
    const assignment = await request(app).patch(`/api/v1/tickets/${ticketId}/assign`).set('Cookie', agent)
      .set('Origin', config.clientUrl).set('X-CSRF-Token', unique).send({ assignee_id: userIds[2], version: 1 });
    assert.equal(assignment.status, 200);
    assert.equal(assignment.body.assignee_id, userIds[2]);
    assert.equal((await request(app).patch(`/api/v1/tickets/${ticketId}/status`).set('Cookie', agent).send({ status: 'IN_PROGRESS', version: 1 })).status, 403);
    for (const [version, status] of [[2, 'IN_PROGRESS'], [3, 'RESOLVED']]) {
      const changed = await request(app).patch(`/api/v1/tickets/${ticketId}/status`).set('Cookie', agent)
        .set('Origin', config.clientUrl).set('X-CSRF-Token', unique).send({ status, version });
      assert.equal(changed.status, 200);
    }
    assert.equal((await db('tickets').where('id', ticketId).first()).status, 'RESOLVED');
    assert.ok(await db('notifications').where({ ticket_id: ticketId, recipient_id: userIds[2] }).first());
  } finally {
    for (const sid of sessionIds) await promisify(store.destroy.bind(store))(sid);
    if (ticketId) {
      await db('notifications').where('ticket_id', ticketId).delete();
      await db('audit_logs').where({ entity_type: 'ticket', entity_id: String(ticketId) }).delete();
      await db('tickets').where('id', ticketId).delete();
    }
    if (categoryId) await db('categories').where('id', categoryId).delete();
    if (userIds.length) await db('users').whereIn('id', userIds).delete();
    await db.destroy();
  }
});
