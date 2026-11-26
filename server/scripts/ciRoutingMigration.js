import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { assertCiEvidenceEnvironment } from './ciDatabaseEvidence.js';

// Intentionally executable only in the disposable GitHub-hosted test service.
// Reject local invocation before dotenv, database configuration or a connection.
assertCiEvidenceEnvironment(process.env);
const [{ default: knex }, { createDatabaseConfig, validateDatabaseConfig }, { assertIdentity }] = await Promise.all([
  import('knex'), import('../../knexfile.js'), import('../src/db/targetPolicy.js'),
]);
const configuration = createDatabaseConfig('test', 'migration');
validateDatabaseConfig('test', 'migration', configuration);
const database = knex(configuration);
const migration = '20261125000007_add_ticket_routing.js';
const token = randomUUID().replaceAll('-', '');
let userId, ticketId;
try {
  const [identity] = await database.raw('SELECT DATABASE() AS selected_database, CURRENT_USER() AS matched_account');
  assertIdentity('test', 'migration', identity[0]);
  // Start from the actual six-migration MVP schema, then exercise an upgrade.
  const previous = (await readdir('server/migrations')).filter(name => name.endsWith('.js') && name !== migration).sort();
  assert.equal(previous.length, 6, 'Review the upgrade fixture when the migration baseline changes');
  for (const name of previous) await database.migrate.up({ name });
  [userId] = await database('users').insert({ email: `ci-upgrade-${token}@example.invalid`, full_name: 'CI upgrade fixture', role: 'END_USER', is_active: true });
  [ticketId] = await database('tickets').insert({ ticket_code: token, reporter_id: userId, title: 'CI pre-routing ticket', description: 'Synthetic upgrade preservation fixture', priority: 'P3',
    priority_evidence: JSON.stringify({ fixture: 'before-routing' }), response_deadline_at: new Date('2026-11-25T01:00:00Z'), resolution_deadline_at: new Date('2026-11-25T02:00:00Z') });
  await database('ticket_comments').insert({ ticket_id: ticketId, author_id: userId, message: 'Keep this comment', visibility: 'public' });
  await database('ticket_history').insert({ ticket_id: ticketId, actor_id: userId, event_type: 'CREATED', new_value: 'OPEN' });
  const before = await database('tickets').where('id', ticketId).first();
  const comments = await database('ticket_comments').where('ticket_id', ticketId);
  const history = await database('ticket_history').where('ticket_id', ticketId);
  await database.migrate.latest();
  const after = await database('tickets').where('id', ticketId).first();
  assert.deepEqual(Object.fromEntries(Object.keys(before).map(key => [key, after[key]])), before);
  assert.equal(after.owner_unit_id, null); assert.equal(after.routing_status, null); assert.equal(after.routing_evidence, null);
  assert.deepEqual(await database('ticket_comments').where('ticket_id', ticketId), comments);
  assert.deepEqual(await database('ticket_history').where('ticket_id', ticketId), history);
  const [, rerun] = await database.migrate.latest(); assert.deepEqual(rerun, []);
  await mkdir('.ci-evidence', { recursive: true });
  const report = { event: 'ci_routing_migration_verified', baselineMigrations: previous.length, migration,
    oldTicketFieldsUnchanged: true, oldCommentsAndHistoryUnchanged: true, historicalRoutingNull: true, repeatMigrateNoOp: true,
    scope: 'Synthetic upgrade in an isolated MySQL CI service; no local schema changed' };
  await writeFile('.ci-evidence/routing-migration.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
} finally {
  try {
    if (ticketId) await database('tickets').where({ id: ticketId, ticket_code: token }).delete();
    if (userId) await database('users').where({ id: userId, email: `ci-upgrade-${token}@example.invalid` }).delete();
  } finally { await database.destroy(); }
}
