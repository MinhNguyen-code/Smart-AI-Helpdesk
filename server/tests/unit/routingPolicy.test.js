import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseAgent, decideUnit } from '../../src/modules/routing/routingPolicy.js';

const routes = [
  { category_id: 1, unit_id: 10, unit_active: 1, category_active: 1, keywords: ['wifi', 'mất mạng'] },
  { category_id: 2, unit_id: 20, unit_active: 1, category_active: 1, keywords: ['máy in', 'bàn phím'] },
];
const decide = (title, category_id = 1, description = '') => decideUnit({ title, description, category_id }, routes);

test('Routing uses configured category and matching Vietnamese technical phrases', () => {
  assert.equal(decide('Mất WiFi').unit_id, 10);
  assert.equal(decide('mat mang'.normalize('NFD')).reason, 'CATEGORY_AND_KEYWORD');
  assert.equal(decide('Sự cố cần hỗ trợ').reason, 'CATEGORY');
  assert.equal(decide('Bàn phím hỏng', 2).unit_id, 20);
});
test('Routing sends conflicts, multiple specialties and unmapped categories to review', () => {
  assert.equal(decide('Máy in hỏng').reason, 'CATEGORY_CONTENT_CONFLICT');
  assert.equal(decide('Wifi hỏng và máy in không hoạt động').reason, 'AMBIGUOUS_CONTENT');
  assert.equal(decide('Wifi lỗi', 99).unit_id, null);
  assert.equal(decideUnit({ title: 'wifi', category_id: 1 }, routes.map(route => ({ ...route, unit_active: 0 }))).unit_id, null);
});
test('Routing respects word boundaries, field boundaries and directly negated symptoms', () => {
  assert.equal(decide('Không bị mất mạng. Máy in hỏng.', 2).unit_id, 20);
  assert.equal(decide('wifiabc', 2).unit_id, 20);
  assert.equal(decide('máy', 1, 'in hỏng').unit_id, 10);
  assert.equal(decide('Không bị mất mạng. Mất mạng lại.').reason, 'CATEGORY_AND_KEYWORD');
});

test('Automatic category requires a unique configured technical signal', () => {
  assert.deepEqual(decide('Wifi không hoạt động', null), { unit_id: 10, category_id: 1, reason: 'KEYWORD', matched_unit_ids: [10] });
  assert.equal(decide('Cần giúp đỡ', null).reason, 'NO_UNIQUE_SIGNAL');
  assert.equal(decide('Wifi và máy in hỏng', null).reason, 'AMBIGUOUS_CONTENT');
  assert.equal(decide('Không bị mất mạng', null).unit_id, null);
});
test('Allocation uses least open work, then oldest assignment and stable user id', () => {
  const candidates = [1, 2, 3, 4, 5].map(id => ({ id, role: 'IT_AGENT', is_active: true, is_available: true, last_assigned_at: null }));
  candidates[0].is_active = false;
  candidates[1].is_available = false;
  candidates[2].last_assigned_at = '2026-11-25T00:00:00Z';
  const counts = new Map([[3, 2], [4, 1], [5, 2]]);
  assert.equal(chooseAgent(candidates, counts, 3, 99).id, 4);
  assert.equal(chooseAgent(candidates, new Map(), 3, 99).id, 4);
  assert.equal(chooseAgent(candidates, new Map(), 3, 4).id, 5);
  assert.equal(chooseAgent(candidates, new Map([[3, 3], [4, 3], [5, 3]]), 3, 99), null);
});
