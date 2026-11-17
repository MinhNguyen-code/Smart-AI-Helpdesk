import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { promisify } from 'node:util';
import signature from 'cookie-signature';

process.env.NODE_ENV = 'test';
const { db } = await import('../../src/db/index.js');
const { default: config } = await import('../../src/config/index.js');
const { DatabaseSessionStore } = await import('../../src/db/sessionStore.js');

test('HTTP ticket and staff notification survive a full Express process restart', async () => {
  const port = 49000 + Math.floor(Math.random() * 1000);
  const base = `http://127.0.0.1:${port}/api/v1`;
  const token = randomUUID();
  const store = new DatabaseSessionStore(db);
  const ids = [];
  const sids = [];
  let ticketId;
  let categoryId;
  let child;
  async function fixture(role) {
    const [id] = await db('users').insert({ email: `${randomUUID()}@example.invalid`, full_name: 'Restart fixture', role, is_active: true });
    ids.push(id);
    const sid = randomUUID(); sids.push(sid);
    await promisify(store.set.bind(store))(sid, { cookie: { expires: new Date(Date.now() + 120000) }, user: { id, role }, csrfToken: token });
    return { id, cookie: `${config.session.name}=${encodeURIComponent(`s:${signature.sign(sid, config.session.secret)}`)}` };
  }
  async function start() {
    child = spawn(process.execPath, ['server/src/index.js'], { cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: 'test', PORT: String(port) }, stdio: 'ignore' });
    for (let attempt = 0; attempt < 50; attempt++) {
      if (child.exitCode !== null) throw new Error('Test server exited before readiness');
      try {
        const response = await fetch(`${base}/ready`, { signal: AbortSignal.timeout(500) });
        if (response.status === 200) return;
      } catch { /* wait for the test process to listen */ }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('Test server readiness timeout');
  }
  async function stop() {
    if (!child) return;
    if (child.exitCode === null) { child.kill('SIGTERM'); await once(child, 'exit'); }
    child = null;
  }
  try {
    const reporter = await fixture('END_USER');
    const agent = await fixture('IT_AGENT');
    [categoryId] = await db('categories').insert({ name: `restart-${token}` });
    await start();
    const created = await fetch(`${base}/tickets`, { method: 'POST', headers: {
      'Content-Type': 'application/json', Cookie: reporter.cookie, Origin: config.clientUrl, 'X-CSRF-Token': token,
    }, body: JSON.stringify({ title: 'Restart persistence fixture', description: 'Safe test schema only', impact: 'individual', category_id: categoryId }) });
    assert.equal(created.status, 201);
    ticketId = (await created.json()).id;
    await stop();
    await start();
    const detail = await fetch(`${base}/tickets/${ticketId}`, { headers: { Cookie: reporter.cookie } });
    assert.equal(detail.status, 200);
    assert.equal((await detail.json()).title, 'Restart persistence fixture');
    const notifications = await fetch(`${base}/notifications`, { headers: { Cookie: agent.cookie } });
    assert.equal(notifications.status, 200);
    assert.ok((await notifications.json()).items.some(item => item.ticket_id === ticketId));
  } finally {
    await stop();
    for (const sid of sids) await promisify(store.destroy.bind(store))(sid);
    if (ticketId) {
      await db('notifications').where('ticket_id', ticketId).delete();
      await db('audit_logs').where({ entity_type: 'ticket', entity_id: String(ticketId) }).delete();
      await db('tickets').where('id', ticketId).delete();
    }
    if (categoryId) await db('categories').where('id', categoryId).delete();
    if (ids.length) await db('users').whereIn('id', ids).delete();
    await db.destroy();
  }
});
