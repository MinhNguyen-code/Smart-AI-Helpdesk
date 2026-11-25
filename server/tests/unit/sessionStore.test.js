import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSessionStore } from '../../src/db/sessionStore.js';

test('expired-session cleanup protects active and concurrently renewed sessions', async () => {
  const rows = [
    { session_id: 'expired', expires: 900 },
    { session_id: 'renewed', expires: 950 },
    { session_id: 'active', expires: 2000 },
  ];
  let selected = false;
  const database = table => {
    assert.equal(table, 'sessions');
    const predicates = [];
    let maximum = Infinity;
    const query = {
      where(field, operator, value) {
        assert.equal(field, 'expires');
        assert.equal(operator, '<=');
        predicates.push(row => row.expires <= value);
        return query;
      },
      whereIn(field, ids) {
        assert.equal(field, 'session_id');
        predicates.push(row => ids.includes(row.session_id));
        return query;
      },
      orderBy(field) { assert.equal(field, 'expires'); return query; },
      limit(value) { maximum = value; return query; },
      async pluck(field) {
        assert.equal(field, 'session_id');
        const ids = rows.filter(row => predicates.every(predicate => predicate(row)))
          .sort((a, b) => a.expires - b.expires).slice(0, maximum).map(row => row.session_id);
        if (!selected) {
          selected = true;
          rows.find(row => row.session_id === 'renewed').expires = 2000;
        }
        return ids;
      },
      async delete() {
        let removed = 0;
        for (let index = rows.length - 1; index >= 0; index -= 1) {
          if (predicates.every(predicate => predicate(rows[index]))) { rows.splice(index, 1); removed += 1; }
        }
        return removed;
      },
    };
    return query;
  };
  const store = new DatabaseSessionStore(database);
  assert.equal(await store.pruneExpired(1000), 1);
  assert.deepEqual(rows.map(row => row.session_id), ['renewed', 'active']);
  await assert.rejects(store.pruneExpired(-1), RangeError);
});
