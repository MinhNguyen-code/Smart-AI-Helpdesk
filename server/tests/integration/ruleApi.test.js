import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
import signature from 'cookie-signature';
import request from 'supertest';
import { normalizePhrase } from '../../src/modules/ticketPolicy.js';

process.env.NODE_ENV = 'test';
const { default: app } = await import('../../src/app.js');
const { db } = await import('../../src/db/index.js');
const { default: config } = await import('../../src/config/index.js');
const { DatabaseSessionStore } = await import('../../src/db/sessionStore.js');

test('Admin rules and P1–P4 SLA policies persist with role boundaries', async () => {
  const token = randomUUID();
  const userIds = [];
  const sessionIds = [];
  const store = new DatabaseSessionStore(db);
  let ruleId;
  const concurrentRuleIds = [];
  let originalPolicy;
  async function fixture(role) {
    const [id] = await db('users').insert({ email: `${role}-${randomUUID()}@example.invalid`, full_name: 'Rule test', role, is_active: true });
    userIds.push(id);
    const sid = randomUUID();
    sessionIds.push(sid);
    await promisify(store.set.bind(store))(sid, { cookie: { expires: new Date(Date.now() + 60000) }, user: { id, role }, csrfToken: token });
    return `${config.session.name}=${encodeURIComponent(`s:${signature.sign(sid, config.session.secret)}`)}`;
  }
  const mutate = (cookie, method, url, body) => request(app)[method](url).set('Cookie', cookie)
    .set('Origin', config.clientUrl).set('X-CSRF-Token', token).send(body);
  try {
    const admin = await fixture('ADMIN');
    const agent = await fixture('IT_AGENT');
    const endUser = await fixture('END_USER');
    assert.equal((await request(app).get('/api/v1/rules')).status, 401);
    assert.equal((await request(app).get('/api/v1/rules').set('Cookie', endUser)).status, 403);
    assert.equal((await request(app).get('/api/v1/sla/policies').set('Cookie', agent)).status, 403);
    assert.equal((await mutate(admin, 'post', '/api/v1/rules', undefined)).status, 400);
    assert.equal((await mutate(admin, 'put', '/api/v1/sla/policies/P2', undefined)).status, 400);
    const keyword = `kiểm tra ${token}`;
    const created = await mutate(admin, 'post', '/api/v1/rules', { keyword, priority: 'P2', is_active: true });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    ruleId = created.body.id;
    assert.equal(created.body.normalized_keyword, undefined);
    assert.equal((await mutate(agent, 'post', '/api/v1/rules', { keyword: 'unauthorized', priority: 'P1', is_active: true })).status, 403);
    assert.equal((await mutate(admin, 'post', '/api/v1/rules', { keyword: keyword.toUpperCase(), priority: 'P2', is_active: true })).status, 409);
    const raceKeyword = `đồng thời ${token}`;
    const raced = await Promise.all([
      mutate(admin, 'post', '/api/v1/rules', { keyword: raceKeyword, priority: 'P1', is_active: true }),
      mutate(admin, 'post', '/api/v1/rules', { keyword: raceKeyword.toUpperCase(), priority: 'P2', is_active: true }),
    ]);
    assert.deepEqual(raced.map(result => result.status).sort(), [201, 409]);
    concurrentRuleIds.push(...raced.filter(result => result.status === 201).map(result => result.body.id));
    assert.equal(Number((await db('priority_rules').where('normalized_keyword', normalizePhrase(raceKeyword)).count('* as count').first()).count), 1);
    const updated = await mutate(admin, 'patch', `/api/v1/rules/${ruleId}`, { keyword, priority: 'P4', is_active: false });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.priority, 'P4');
    assert.equal((await db('priority_rules').where('id', ruleId).first()).is_active, 0);
    const listed = await request(app).get('/api/v1/rules').set('Cookie', admin);
    assert.equal(listed.status, 200);
    assert.ok(listed.body.some(rule => rule.id === ruleId));
    const policies = await request(app).get('/api/v1/sla/policies').set('Cookie', admin);
    assert.equal(policies.status, 200);
    assert.deepEqual(policies.body.map(policy => policy.priority), ['P1', 'P2', 'P3', 'P4']);
    originalPolicy = policies.body.find(policy => policy.priority === 'P2');
    assert.equal((await mutate(admin, 'put', '/api/v1/sla/policies/P2', { response_minutes: 90, resolution_minutes: 30, is_active: true })).status, 400);
    const changed = await mutate(admin, 'put', '/api/v1/sla/policies/P2', { response_minutes: 90, resolution_minutes: 540, is_active: true });
    assert.equal(changed.status, 200);
    assert.equal((await db('sla_policies').where({ priority: 'P2' }).first()).resolution_minutes, 540);
    assert.equal((await mutate(admin, 'delete', `/api/v1/rules/${ruleId}`, {})).status, 204);
    ruleId = undefined;
  } finally {
    if (originalPolicy) await db('sla_policies').where({ priority: 'P2' }).update({ response_minutes: originalPolicy.response_minutes,
      resolution_minutes: originalPolicy.resolution_minutes, is_active: originalPolicy.is_active });
    if (ruleId) await db('priority_rules').where('id', ruleId).delete();
    if (concurrentRuleIds.length) await db('priority_rules').whereIn('id', concurrentRuleIds).delete();
    for (const sid of sessionIds) await promisify(store.destroy.bind(store))(sid);
    if (userIds.length) await db('audit_logs').whereIn('actor_id', userIds).delete();
    if (userIds.length) await db('users').whereIn('id', userIds).delete();
    await db.destroy();
  }
});
