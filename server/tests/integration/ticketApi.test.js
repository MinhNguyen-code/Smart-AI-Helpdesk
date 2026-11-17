import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
import signature from 'cookie-signature';
import request from 'supertest';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { normalizePhrase } from '../../src/modules/ticketPolicy.js';

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
  let uploadedName;
  let ruleId;
  let originalPolicy;
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
    const admin = await fixture('ADMIN');
    [categoryId] = await db('categories').insert({ name: unique });
    [ruleId] = await db('priority_rules').insert({ keyword: unique, normalized_keyword: normalizePhrase(unique), priority: 'P2', is_active: true });
    const response = await request(app).post('/api/v1/tickets').set('Cookie', reporter)
      .set('Origin', config.clientUrl).set('X-CSRF-Token', unique)
      .send({ title: `Sự cố toàn tổ chức ${unique}`, description: 'Integration test', impact: 'organization', category_id: categoryId });
    assert.equal(response.status, 201, JSON.stringify(response.body));
    ticketId = response.body.id;
    assert.equal(response.body.priority, 'P1');
    assert.ok(response.body.response_deadline_at);
    assert.ok(JSON.stringify(response.body.priority_evidence).includes(String(ruleId)));
    const snapshot = { priority: response.body.priority, evidence: response.body.priority_evidence,
      response: response.body.response_deadline_at, resolution: response.body.resolution_deadline_at };
    originalPolicy = await db('sla_policies').where('priority', 'P1').first();
    await db('priority_rules').where('id', ruleId).update({ priority: 'P4' });
    await db('sla_policies').where('priority', 'P1').update({ response_minutes: originalPolicy.response_minutes + 1,
      resolution_minutes: originalPolicy.resolution_minutes + 1 });
    const unchanged = await db('tickets').where('id', ticketId).first();
    assert.deepEqual({ priority: unchanged.priority, evidence: unchanged.priority_evidence,
      response: unchanged.response_deadline_at.toISOString(), resolution: unchanged.resolution_deadline_at.toISOString() },
    { priority: snapshot.priority, evidence: snapshot.evidence,
      response: new Date(snapshot.response).toISOString(), resolution: new Date(snapshot.resolution).toISOString() });
    const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==', 'base64');
    const forbiddenUpload = await request(app).post(`/api/v1/tickets/${ticketId}/attachments`).set('Cookie', stranger)
      .set('Origin', config.clientUrl).set('X-CSRF-Token', unique).attach('file', image, { filename: 'proof.png', contentType: 'image/png' });
    assert.equal(forbiddenUpload.status, 404);
    const invalidUpload = await request(app).post(`/api/v1/tickets/${ticketId}/attachments`).set('Cookie', reporter)
      .set('Origin', config.clientUrl).set('X-CSRF-Token', unique).attach('file', Buffer.from('not an image'), { filename: 'proof.png', contentType: 'image/png' });
    assert.equal(invalidUpload.status, 400);
    const uploaded = await request(app).post(`/api/v1/tickets/${ticketId}/attachments`).set('Cookie', reporter)
      .set('Origin', config.clientUrl).set('X-CSRF-Token', unique).attach('file', image, { filename: 'proof.png', contentType: 'image/png' });
    assert.equal(uploaded.status, 201, JSON.stringify(uploaded.body));
    const detail = await request(app).get(`/api/v1/tickets/${ticketId}`).set('Cookie', reporter);
    assert.equal(detail.status, 200);
    assert.equal(detail.body.attachments.length, 1);
    assert.equal(detail.body.history.some(event => event.event_type === 'ATTACHMENT_ADDED'), true);
    const stored = await db('ticket_attachments').where({ id: uploaded.body.id }).first();
    uploadedName = stored.stored_filename;
    assert.notEqual(stored.stored_filename, 'proof.png');
    const readPath = `/api/v1/tickets/${ticketId}/attachments/${uploaded.body.id}`;
    assert.equal((await request(app).get(readPath).set('Cookie', stranger)).status, 404);
    const downloaded = await request(app).get(readPath).set('Cookie', reporter);
    assert.equal(downloaded.status, 200);
    assert.deepEqual(downloaded.body, image);
    assert.match(downloaded.headers['content-disposition'], /attachment/);
    assert.equal(downloaded.headers['x-content-type-options'], 'nosniff');
    assert.equal((await request(app).get(`/api/v1/tickets/${ticketId}`).set('Cookie', stranger)).status, 404);
    assert.equal((await request(app).get(`/api/v1/tickets/${ticketId}/comments`).set('Cookie', stranger)).status, 404);
    assert.equal((await request(app).post(`/api/v1/tickets/${ticketId}/comments`).set('Cookie', stranger)
      .set('Origin', config.clientUrl).set('X-CSRF-Token', unique).send({ message: 'Should be denied' })).status, 404);
    assert.equal((await request(app).get(`/api/v1/tickets/${ticketId}`).set('Cookie', admin)).status, 200);
    assert.equal((await request(app).get('/api/v1/tickets').set('Cookie', reporter)).body.items.some(item => item.id === ticketId), true);
    assert.equal((await request(app).get('/api/v1/tickets').set('Cookie', stranger)).body.items.some(item => item.id === ticketId), false);
    assert.equal((await request(app).get('/api/v1/agents').set('Cookie', reporter)).status, 403);
    assert.equal((await request(app).patch(`/api/v1/tickets/${ticketId}/assign`).set('Cookie', reporter)
      .set('Origin', config.clientUrl).set('X-CSRF-Token', unique)
      .send({ assignee_id: userIds[2], version: 1 })).status, 403);
    assert.equal((await request(app).patch(`/api/v1/tickets/${ticketId}/status`).set('Cookie', reporter)
      .set('Origin', config.clientUrl).set('X-CSRF-Token', unique)
      .send({ status: 'IN_PROGRESS', version: 1 })).status, 403);
    assert.equal((await request(app).patch(`/api/v1/tickets/${ticketId}/assign`).set('Cookie', agent)
      .set('Origin', config.clientUrl).set('X-CSRF-Token', unique)
      .send({ assignee_id: userIds[3], version: 1 })).status, 403);
    const agents = await request(app).get('/api/v1/agents').set('Cookie', agent);
    assert.equal(agents.status, 200);
    assert.ok(agents.body.some(person => person.id === userIds[2]));
    const invalidTransition = await request(app).patch(`/api/v1/tickets/${ticketId}/status`).set('Cookie', admin)
      .set('Origin', config.clientUrl).set('X-CSRF-Token', unique).send({ status: 'RESOLVED', version: 1 });
    assert.equal(invalidTransition.status, 409);
    assert.equal((await db('tickets').where('id', ticketId).first()).status, 'OPEN');
    const internalDenied = await request(app).post(`/api/v1/tickets/${ticketId}/comments`).set('Cookie', reporter)
      .set('Origin', config.clientUrl).set('X-CSRF-Token', unique).send({ message: 'Private', visibility: 'internal' });
    assert.equal(internalDenied.status, 403);
    const deniedAck = await request(app).post(`/api/v1/tickets/${ticketId}/acknowledge`).set('Cookie', reporter)
      .set('Origin', config.clientUrl).set('X-CSRF-Token', unique).send({ version: 1 });
    assert.equal(deniedAck.status, 403);
    const acknowledged = await request(app).post(`/api/v1/tickets/${ticketId}/acknowledge`).set('Cookie', agent)
      .set('Origin', config.clientUrl).set('X-CSRF-Token', unique).send({ version: 1 });
    assert.equal(acknowledged.status, 200);
    assert.ok(acknowledged.body.acknowledged_at);
    assert.equal(acknowledged.body.first_response_at, null);
    assert.equal((await request(app).post(`/api/v1/tickets/${ticketId}/acknowledge`).set('Cookie', agent)
      .set('Origin', config.clientUrl).set('X-CSRF-Token', unique).send({ version: 2 })).status, 409);
    const reply = await request(app).post(`/api/v1/tickets/${ticketId}/comments`).set('Cookie', agent)
      .set('Origin', config.clientUrl).set('X-CSRF-Token', unique).send({ message: 'Đang xử lý' });
    assert.equal(reply.status, 201);
    assert.ok((await db('tickets').where('id', ticketId).first()).first_response_at);
    const internal = await request(app).post(`/api/v1/tickets/${ticketId}/comments`).set('Cookie', agent)
      .set('Origin', config.clientUrl).set('X-CSRF-Token', unique)
      .send({ message: `Internal ${unique}`, visibility: 'internal' });
    assert.equal(internal.status, 201);
    const publicComments = await request(app).get(`/api/v1/tickets/${ticketId}/comments`).set('Cookie', reporter);
    assert.equal(publicComments.status, 200);
    assert.ok(publicComments.body.some(comment => comment.id === reply.body.id));
    assert.ok(!publicComments.body.some(comment => comment.id === internal.body.id));
    for (const staff of [agent, admin]) {
      const staffDetail = await request(app).get(`/api/v1/tickets/${ticketId}`).set('Cookie', staff);
      assert.equal(staffDetail.status, 200);
      assert.ok(staffDetail.body.comments.some(comment => comment.id === internal.body.id));
      assert.ok(staffDetail.body.history.some(event => event.event_type === 'COMMENT_ADDED'
        && event.new_value === String(internal.body.id)));
    }
    const ownerDetail = await request(app).get(`/api/v1/tickets/${ticketId}`).set('Cookie', reporter);
    assert.equal(ownerDetail.status, 200);
    assert.ok(ownerDetail.body.comments.some(comment => comment.id === reply.body.id));
    assert.ok(!ownerDetail.body.comments.some(comment => comment.id === internal.body.id));
    assert.ok(ownerDetail.body.history.some(event => event.event_type === 'COMMENT_ADDED'
      && event.new_value === String(reply.body.id)));
    assert.ok(!ownerDetail.body.history.some(event => event.event_type === 'COMMENT_ADDED'
      && event.new_value === String(internal.body.id)));
    const assignment = await request(app).patch(`/api/v1/tickets/${ticketId}/assign`).set('Cookie', agent)
      .set('Origin', config.clientUrl).set('X-CSRF-Token', unique).send({ assignee_id: userIds[2], version: 2 });
    assert.equal(assignment.status, 200);
    assert.equal(assignment.body.assignee_id, userIds[2]);
    assert.equal((await request(app).patch(`/api/v1/tickets/${ticketId}/status`).set('Cookie', agent).send({ status: 'IN_PROGRESS', version: 1 })).status, 403);
    for (const [version, status] of [[3, 'IN_PROGRESS'], [4, 'RESOLVED']]) {
      const changed = await request(app).patch(`/api/v1/tickets/${ticketId}/status`).set('Cookie', agent)
        .set('Origin', config.clientUrl).set('X-CSRF-Token', unique).send({ status, version });
      assert.equal(changed.status, 200);
    }
    assert.equal((await db('tickets').where('id', ticketId).first()).status, 'RESOLVED');
    const readFromFreshProcess = `import knex from 'knex'; import { createDatabaseConfig, validateDatabaseConfig } from './knexfile.js';
      const config = createDatabaseConfig('test'); validateDatabaseConfig('test', 'runtime', config);
      const freshDb = knex(config); try { const row = await freshDb('tickets').where('id', ${ticketId}).select('status').first();
      process.stdout.write(row?.status || 'MISSING'); } finally { await freshDb.destroy(); }`;
    const { stdout } = await promisify(execFile)(process.execPath, ['--input-type=module', '-e', readFromFreshProcess],
      { cwd: path.resolve('.'), env: { ...process.env, NODE_ENV: 'test' } });
    assert.equal(stdout, 'RESOLVED');
    assert.ok(await db('notifications').where({ ticket_id: ticketId, recipient_id: userIds[2] }).first());
  } finally {
    if (originalPolicy) await db('sla_policies').where('id', originalPolicy.id).update({ response_minutes: originalPolicy.response_minutes,
      resolution_minutes: originalPolicy.resolution_minutes, is_active: originalPolicy.is_active });
    for (const sid of sessionIds) await promisify(store.destroy.bind(store))(sid);
    if (ticketId) {
      await db('notifications').where('ticket_id', ticketId).delete();
      await db('audit_logs').where({ entity_type: 'ticket', entity_id: String(ticketId) }).delete();
      await db('tickets').where('id', ticketId).delete();
    }
    if (uploadedName) await unlink(path.resolve(config.upload.dir, uploadedName));
    if (categoryId) await db('categories').where('id', categoryId).delete();
    if (ruleId) await db('priority_rules').where('id', ruleId).delete();
    if (userIds.length) await db('users').whereIn('id', userIds).delete();
    await db.destroy();
  }
});
