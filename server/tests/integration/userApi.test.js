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

test('Admin manages allowlist roles without binding a fake Google identity', async () => {
  const token = randomUUID();
  const ids = [];
  const sids = [];
  const store = new DatabaseSessionStore(db);
  async function fixture(role) {
    const [id] = await db('users').insert({ email: `${randomUUID()}@example.invalid`, full_name: 'User API fixture', role, is_active: true });
    ids.push(id);
    const sid = randomUUID(); sids.push(sid);
    await promisify(store.set.bind(store))(sid, { cookie: { expires: new Date(Date.now() + 60000) }, user: { id, role }, csrfToken: token });
    return { id, cookie: `${config.session.name}=${encodeURIComponent(`s:${signature.sign(sid, config.session.secret)}`)}` };
  }
  const mutate = (cookie, method, url, body) => request(app)[method](url).set('Cookie', cookie)
    .set('Origin', config.clientUrl).set('X-CSRF-Token', token).send(body);
  try {
    const admin = await fixture('ADMIN');
    const agent = await fixture('IT_AGENT');
    const endUser = await fixture('END_USER');
    assert.equal((await request(app).get('/api/v1/users')).status, 401);
    assert.equal((await request(app).get('/api/v1/users').set('Cookie', agent.cookie)).status, 403);
    assert.equal((await request(app).get('/api/v1/users').set('Cookie', endUser.cookie)).status, 403);
    const email = `${randomUUID()}@example.invalid`;
    assert.equal((await mutate(agent.cookie, 'post', '/api/v1/users', { email, role: 'ADMIN' })).status, 403);
    assert.equal((await mutate(endUser.cookie, 'post', '/api/v1/users', { email, role: 'ADMIN' })).status, 403);
    assert.equal((await mutate(admin.cookie, 'post', '/api/v1/users', undefined)).status, 400);
    const created = await mutate(admin.cookie, 'post', '/api/v1/users', { email: email.toUpperCase(), role: 'END_USER' });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    ids.push(created.body.id);
    for (const actor of [agent, endUser]) {
      assert.equal((await mutate(actor.cookie, 'patch', `/api/v1/users/${created.body.id}`,
        { role: 'ADMIN', is_active: true })).status, 403);
    }
    assert.equal(created.body.google_linked, false);
    assert.equal(created.body.google_sub, undefined);
    assert.equal(created.body.email, email);
    assert.equal((await mutate(admin.cookie, 'post', '/api/v1/users', { email, role: 'END_USER' })).status, 409);
    const listed = await request(app).get('/api/v1/users').set('Cookie', admin.cookie);
    assert.equal(listed.status, 200);
    assert.ok(listed.body.some(user => user.id === created.body.id));
    assert.equal((await mutate(admin.cookie, 'patch', `/api/v1/users/${admin.id}`, { role: 'END_USER', is_active: false })).status, 400);
    const changed = await mutate(admin.cookie, 'patch', `/api/v1/users/${created.body.id}`, { role: 'IT_AGENT', is_active: false });
    assert.equal(changed.status, 200);
    assert.equal(changed.body.role, 'IT_AGENT');
    assert.equal(changed.body.is_active, false);
    const stored = await db('users').where('id', created.body.id).first();
    assert.equal(stored.google_sub, null);
    assert.equal(stored.is_active, 0);
  } finally {
    for (const sid of sids) await promisify(store.destroy.bind(store))(sid);
    if (ids.length) await db('audit_logs').whereIn('actor_id', ids).delete();
    if (ids.length) await db('users').whereIn('id', ids).delete();
    await db.destroy();
  }
});
