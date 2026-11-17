import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import signature from 'cookie-signature';
import request from 'supertest';

process.env.NODE_ENV = 'test';
const { default: app } = await import('../src/app.js');
const { db } = await import('../src/db/index.js');
const { default: config } = await import('../src/config/index.js');
const { assertIdentity } = await import('../src/db/targetPolicy.js');

const token = randomUUID();
const ids = [];
let userId;
let sid;
try {
  const [identity] = await db.raw('SELECT DATABASE() AS selected_database, CURRENT_USER() AS matched_account');
  assertIdentity('test', 'runtime', identity[0]);
  const category = await db('categories').where('is_active', true).first();
  const rule = await db('priority_rules').where('is_active', true).first();
  if (!category || !rule) throw new Error('Benchmark requires reference data in isolated test schema');
  [userId] = await db('users').insert({ email: `${token}@example.invalid`, full_name: 'Triage benchmark fixture', role: 'END_USER', is_active: true });
  sid = randomUUID();
  await db('sessions').insert({ session_id: sid, expires: Date.now() + 120000,
    data: JSON.stringify({ cookie: { expires: new Date(Date.now() + 120000) }, user: { id: userId, role: 'END_USER' }, csrfToken: token }) });
  const cookie = `${config.session.name}=${encodeURIComponent(`s:${signature.sign(sid, config.session.secret)}`)}`;
  const timings = [];
  for (let i = 0; i < 23; i++) {
    const start = performance.now();
    const response = await request(app).post('/api/v1/tickets').set('Cookie', cookie)
      .set('Origin', config.clientUrl).set('X-CSRF-Token', token)
      .send({ title: `Benchmark ${rule.keyword} ${i}`, description: 'Isolated MySQL test operation',
        impact: 'individual', category_id: category.id });
    const duration = performance.now() - start;
    if (response.status !== 201 || !response.body.resolution_deadline_at) {
      throw new Error(`Benchmark HTTP ticket creation failed with status ${response.status}`);
    }
    ids.push(response.body.id);
    if (i >= 3) timings.push(duration);
  }
  const evidence = await db('tickets').whereIn('id', ids).select('priority_evidence');
  if (!evidence.every(row => JSON.stringify(row.priority_evidence).includes(String(rule.id)))) {
    throw new Error('Benchmark did not execute the selected priority rule');
  }
  timings.sort((a, b) => a - b);
  const result = { operation: 'POST /tickets including normalization, rules, SLA, MySQL transaction and notifications',
    sampleCount: timings.length, p50Ms: Math.round(timings[9]), p95Ms: Math.round(timings[18]),
    p99Ms: Math.round(timings[19]), targetMs: 500,
    caveat: 'Supertest on isolated MySQL test; sequential requests, no concurrent production load' };
  process.stdout.write(JSON.stringify(result) + '\n');
} finally {
  if (ids.length) {
    await db('notifications').whereIn('ticket_id', ids).delete();
    await db('audit_logs').where({ entity_type: 'ticket' }).whereIn('entity_id', ids.map(String)).delete();
    await db('tickets').whereIn('id', ids).delete();
  }
  if (sid) await db('sessions').where('session_id', sid).delete();
  if (userId) await db('users').where('id', userId).delete();
  await db.destroy();
}
