import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
import { assertCiEvidenceEnvironment } from '../../scripts/ciDatabaseEvidence.js';

test('Fresh seed supports P1/P3 creation, preserves Admin policies, and paginates the filtered authorized set', {
  skip: process.env.RUN_ROUTING_DB !== '1', timeout: 60000,
}, async () => {
  assertCiEvidenceEnvironment(process.env); // Reject before dotenv/DB/application imports.
  process.env.TICKET_ROUTING_ENABLED = 'false';
  const [{ default: app }, { db }, { default: config }, { DatabaseSessionStore }, { seed }, { default: request }, { default: signature }] = await Promise.all([
    import('../../src/app.js'), import('../../src/db/index.js'), import('../../src/config/index.js'), import('../../src/db/sessionStore.js'),
    import('../../seeds/01_initial_data.js'), import('supertest'), import('cookie-signature'),
  ]);
  const token = randomUUID();
  const sid = randomUUID();
  const users = [], tickets = [];
  try {
    assert.deepEqual((await db('sla_policies').select('priority').orderBy('priority')).map(row => row.priority), ['P1', 'P2', 'P3', 'P4']);
    const sentinel = new Error('Rollback only the synthetic Admin policy edit');
    await assert.rejects(db.transaction(async trx => {
      await trx('sla_policies').where('priority', 'P1').update({ response_minutes: 37, resolution_minutes: 191, is_active: false });
      await seed(trx);
      await seed(trx);
      const policy = await trx('sla_policies').where('priority', 'P1').first();
      assert.equal(policy.response_minutes, 37); assert.equal(policy.resolution_minutes, 191); assert.equal(Boolean(policy.is_active), false);
      assert.equal(Number((await trx('sla_policies').count('* as count').first()).count), 4);
      throw sentinel;
    }), error => error === sentinel);
    for (const label of ['reporter', 'stranger']) {
      const [id] = await db('users').insert({ email: `ci-list-${label}-${token}@example.invalid`, full_name: 'CI list fixture', role: 'END_USER', is_active: true });
      users.push(id);
    }
    const store = new DatabaseSessionStore(db);
    await promisify(store.set.bind(store))(sid, { cookie: { expires: new Date(Date.now() + 120000) }, user: { id: users[0], role: 'END_USER' }, csrfToken: token });
    const cookie = `${config.session.name}=${encodeURIComponent(`s:${signature.sign(sid, config.session.secret)}`)}`;
    const get = url => request(app).get('/api/v1/tickets' + url).set('Cookie', cookie);
    const category = await db('categories').where('is_active', true).first();
    for (const impact of ['individual', 'organization']) {
      const result = await request(app).post('/api/v1/tickets').set('Cookie', cookie).set('Origin', config.clientUrl).set('X-CSRF-Token', token)
        .send({ title: `CI fresh ${token}`, description: 'Synthetic basic incident', category_id: category.id, impact });
      if (result.body.id) tickets.push(result.body.id);
      assert.equal(result.status, 201, JSON.stringify(result.body));
      assert.equal(result.body.priority, impact === 'individual' ? 'P3' : 'P1');
    }
    const oldest = await db('tickets').where('id', tickets[0]).first();
    await db('tickets').where('id', oldest.id).update({ resolution_deadline_at: new Date(Date.now() + 300000) });
    for (let index = 0; index < 32; index++) {
      const [id] = await db('tickets').insert({ ticket_code: randomUUID().replaceAll('-', ''), reporter_id: users[index === 31 ? 1 : 0],
        title: `Synthetic row ${index}`, description: 'CI paging fixture', priority: 'P3' });
      tickets.push(id);
    }
    const first = await get('');
    assert.equal(first.status, 200); assert.equal(first.body.total, 33); assert.equal(first.body.items.length, 30);
    assert.ok(!first.body.items.some(row => row.id === oldest.id));
    const second = await get('?page=2');
    assert.equal(second.body.items.length, 3); assert.ok(second.body.items.some(row => row.id === oldest.id));
    const search = await get('?search=' + encodeURIComponent(oldest.ticket_code));
    assert.equal(search.body.total, 1); assert.equal(search.body.items[0].id, oldest.id);
    const priority = await get('?priority=P1&sort=priority');
    assert.equal(priority.body.total, 1); assert.equal(priority.body.items[0].priority, 'P1');
    assert.equal((await get('?sort=sla')).body.items[0].id, oldest.id);
    for (const query of ['?priority=invalid', '?sort=invalid', '?page=0']) assert.equal((await get(query)).status, 400);
  } finally {
    try {
      if (tickets.length) {
        await db('notifications').whereIn('ticket_id', tickets).delete();
        await db('tickets').whereIn('id', tickets).delete();
      }
      if (users.length) await db('audit_logs').whereIn('actor_id', users).delete();
      await db('sessions').where('session_id', sid).delete();
      if (users.length) await db('users').whereIn('id', users).delete();
    } finally { await db.destroy(); }
  }
});
