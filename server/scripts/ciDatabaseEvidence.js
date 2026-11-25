import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { once } from 'node:events';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';

// These fixtures are deliberately unavailable to ordinary local/dev commands.
export function assertCiEvidenceEnvironment(env) {
  assert.equal(env.CI, 'true', 'CI_DATABASE_EVIDENCE_REJECTED');
  assert.equal(env.GITHUB_ACTIONS, 'true', 'CI_DATABASE_EVIDENCE_REJECTED');
  assert.equal(env.RUNNER_ENVIRONMENT, 'github-hosted', 'CI_DATABASE_EVIDENCE_REJECTED');
  assert.equal(env.NODE_ENV, 'test', 'CI_DATABASE_EVIDENCE_REJECTED');
  assert.equal(env.DB_TEST_HOST, '127.0.0.1', 'CI_DATABASE_EVIDENCE_REJECTED');
  assert.equal(env.DB_TEST_PORT, '3306', 'CI_DATABASE_EVIDENCE_REJECTED');
  assert.equal(env.DB_TEST_NAME, 'smart_it_helpdesk_new_test', 'CI_DATABASE_EVIDENCE_REJECTED');
  assert.equal(env.DB_TEST_USER, 'sih_new_test', 'CI_DATABASE_EVIDENCE_REJECTED');
}

function canonical(value) {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(
    Object.keys(value).sort().map(key => [key, canonical(value[key])]),
  );
  return value;
}

async function snapshot(db) {
  const [tables] = await db.raw('SELECT TABLE_NAME AS name FROM information_schema.tables WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = ?', ['BASE TABLE']);
  const result = {};
  for (const { name } of tables.sort((a, b) => a.name.localeCompare(b.name))) {
    const rows = (await db(name)).map(row => JSON.stringify(canonical(row))).sort();
    const [ddl] = await db.raw('SHOW CREATE TABLE ??', [name]);
    result[name] = {
      rows: rows.length,
      sha256: createHash('sha256').update(JSON.stringify(rows)).digest('hex'),
      schemaSha256: createHash('sha256').update(ddl[0]['Create Table']).digest('hex'),
    };
  }
  return result;
}

async function prepareBackup(db) {
  const token = randomUUID().replaceAll('-', '');
  await db.transaction(async trx => {
    const [reporter] = await trx('users').insert({ email: `${token}@example.invalid`, full_name: 'CI backup fixture', role: 'END_USER', is_active: false });
    const [ticket] = await trx('tickets').insert({ ticket_code: token, reporter_id: reporter, title: 'CI backup fixture', description: 'Synthetic data only', priority: 'P3' });
    await trx('ticket_comments').insert({ ticket_id: ticket, author_id: reporter, message: 'Restore this synthetic comment', visibility: 'public' });
    await trx('ticket_history').insert({ ticket_id: ticket, actor_id: reporter, event_type: 'CREATED', new_value: 'OPEN' });
    await trx('audit_logs').insert({ actor_id: reporter, action: 'CI_BACKUP_FIXTURE', entity_type: 'ticket', entity_id: String(ticket) });
    await trx('sessions').insert({ session_id: `ci-backup-${token}`, expires: 4102444800000, data: JSON.stringify({ fixture: true }) });
    const [notification] = await trx('notifications').insert({ recipient_id: reporter, ticket_id: ticket, notification_type: 'TICKET_CREATED', title: 'CI backup fixture', message: 'Synthetic restore evidence' });
    await trx('email_outbox').insert({ notification_id: notification, status: 'pending', attempts: 0 });
  });
  const tables = await snapshot(db);
  await writeFile('.ci-evidence/database-before-backup.json', JSON.stringify({ fixtureCode: token, tables }, null, 2) + '\n');
  console.log(JSON.stringify({ event: 'ci_backup_prepared', tableCount: Object.keys(tables).length }));
}

async function verifyRestore(db) {
  const before = JSON.parse(await readFile('.ci-evidence/database-before-backup.json', 'utf8'));
  const after = await snapshot(db);
  assert.deepEqual(after, before.tables, 'CI_RESTORE_CONTENT_OR_SCHEMA_MISMATCH');
  assert.ok(await db('tickets').where('ticket_code', before.fixtureCode).first());
  const report = { event: 'ci_database_restore_verified', tableCount: Object.keys(after).length, schemasAndRowsEqual: true,
    scope: 'Fresh isolated MySQL service; database only, not attachment-file or production recovery', tables: after };
  await writeFile('.ci-evidence/database-restore.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
}

async function measureApi(db) {
  const [{ default: app }, { db: appDb }, { default: config }, { DatabaseSessionStore }, { default: signature }] = await Promise.all([
    import('../src/app.js'), import('../src/db/index.js'), import('../src/config/index.js'), import('../src/db/sessionStore.js'), import('cookie-signature'),
  ]);
  const { promisify } = await import('node:util');
  const token = randomUUID().replaceAll('-', '');
  const store = new DatabaseSessionStore(db);
  const sessionId = `ci-load-${token}`;
  let reporter;
  let ticket;
  let server;
  try {
    [reporter] = await db('users').insert({ email: `${token}@example.invalid`, full_name: 'CI load fixture', role: 'END_USER', is_active: true });
    [ticket] = await db('tickets').insert({ ticket_code: token, reporter_id: reporter, title: 'CI read-load fixture', description: 'Synthetic data only' });
    // Test-only signed session. This does not assert a Google login happened.
    await promisify(store.set.bind(store))(sessionId, { cookie: { expires: new Date(Date.now() + 600000) }, user: { id: reporter, role: 'END_USER' } });
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const url = `http://127.0.0.1:${server.address().port}/api/v1/tickets/${ticket}`;
    const cookie = `${config.session.name}=${encodeURIComponent(`s:${signature.sign(sessionId, config.session.secret)}`)}`;
    const read = async () => {
      const start = performance.now();
      const response = await fetch(url, { headers: { Cookie: cookie }, signal: AbortSignal.timeout(10000) });
      assert.equal(response.status, 200);
      assert.equal((await response.json()).id, ticket);
      return performance.now() - start;
    };
    for (let i = 0; i < 5; i++) await read();
    const results = [];
    for (const concurrency of [1, 4, 8]) {
      const times = [];
      const start = performance.now();
      for (let round = 0; round < 8; round++) times.push(...await Promise.all(Array.from({ length: concurrency }, read)));
      const elapsedMs = performance.now() - start;
      times.sort((a, b) => a - b);
      const percentile = fraction => Number(times[Math.ceil(times.length * fraction) - 1].toFixed(3));
      results.push({ concurrency, samples: times.length, errors: 0, p50Ms: percentile(0.5), p95Ms: percentile(0.95), p99Ms: percentile(0.99), requestsPerSecond: Number((times.length * 1000 / elapsedMs).toFixed(2)) });
    }
    const report = { event: 'ci_api_read_load', node: process.version, warmup: 5, results,
      scope: 'Synthetic single-ticket GET detail with real MySQL on CI; not Google E2E, write load or production capacity' };
    await writeFile('.ci-evidence/api-read-load.json', JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report));
  } finally {
    if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    try {
      await promisify(store.destroy.bind(store))(sessionId);
      if (ticket) await db('tickets').where({ id: ticket, ticket_code: token }).delete();
      if (reporter) await db('users').where({ id: reporter, email: `${token}@example.invalid` }).delete();
    } finally { await appDb.destroy(); }
  }
}

async function main(mode) {
  assertCiEvidenceEnvironment(process.env);
  assert.ok(['load', 'prepare-backup', 'verify-restore'].includes(mode), 'CI_DATABASE_EVIDENCE_MODE_REJECTED');
  const [{ default: knex }, { createDatabaseConfig, validateDatabaseConfig }, { assertIdentity }] = await Promise.all([
    import('knex'), import('../../knexfile.js'), import('../src/db/targetPolicy.js'),
  ]);
  const configuration = createDatabaseConfig('test');
  validateDatabaseConfig('test', 'runtime', configuration);
  const db = knex(configuration);
  try {
    const [rows] = await db.raw('SELECT DATABASE() AS selected_database, CURRENT_USER() AS matched_account');
    assertIdentity('test', 'runtime', rows[0]);
    await mkdir('.ci-evidence', { recursive: true });
    if (mode === 'load') await measureApi(db);
    if (mode === 'prepare-backup') await prepareBackup(db);
    if (mode === 'verify-restore') await verifyRestore(db);
  } finally { await db.destroy(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv[2]).catch(() => { console.error('CI_DATABASE_EVIDENCE_FAILED'); process.exitCode = 1; });
}
