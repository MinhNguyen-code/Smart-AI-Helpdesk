import test from 'node:test';
import assert from 'node:assert/strict';
import { seed } from '../../seeds/01_initial_data.js';

// In-memory database adapter for seed behavior; never imports app/database config.
function referenceTables(policies) {
  const tables = { sla_policies: structuredClone(policies), categories: [], priority_rules: [] };
  function database(name) {
    return {
      select: async () => tables[name],
      insert(rows) {
        let ignore = false;
        const operation = {
          onConflict(column) { assert.equal(column, 'priority'); return operation; },
          ignore() { ignore = true; return operation; },
          then(resolve, reject) {
            return Promise.resolve().then(() => {
              for (const row of rows) {
                if (ignore && tables[name].some(existing => existing.priority === row.priority)) continue;
                tables[name].push(structuredClone(row));
              }
            }).then(resolve, reject);
          },
        };
        return operation;
      },
    };
  }
  return { database, tables };
}

test('Fresh migration P2/P4 rows do not prevent seeding the P1/P3 policies needed for ticket creation', async () => {
  const { database, tables } = referenceTables([{ priority: 'P2', response_minutes: 60 }, { priority: 'P4', response_minutes: 480 }]);
  await seed(database);
  assert.deepEqual(tables.sla_policies.map(row => row.priority).sort(), ['P1', 'P2', 'P3', 'P4']);
  assert.equal(tables.sla_policies.find(row => row.priority === 'P1').resolution_minutes, 120);
  assert.equal(tables.sla_policies.find(row => row.priority === 'P3').resolution_minutes, 1440);
});

test('Repeated seeds preserve administrator targets/inactive flags and do not duplicate reference rows', async () => {
  const customized = { priority: 'P1', response_minutes: 37, resolution_minutes: 191, is_active: false };
  const { database, tables } = referenceTables([customized]);
  await seed(database);
  const first = structuredClone(tables);
  await seed(database);
  assert.deepEqual(tables, first);
  assert.deepEqual(tables.sla_policies.find(row => row.priority === 'P1'), customized);
  assert.equal(tables.sla_policies.length, 4);
});
