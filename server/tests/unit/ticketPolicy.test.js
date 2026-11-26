import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyPriority, normalizePhrase, calculateDeadlines, assertStatusTransition } from '../../src/modules/ticketPolicy.js';

test('Vietnamese normalization handles decomposed accents and đ', () => {
  assert.equal(normalizePhrase('ĐƯỜNG—truyền!'.normalize('NFD')), 'duong truyen');
});

test('Urgent rules match complete phrases and retain independent evidence', () => {
  const rule = { id: 1, keyword: 'server sập', priority: 'P1', is_active: true };
  const ticket = { title: 'SERVER: SẬP!', description: '', impact: 'individual' };
  const result = classifyPriority(ticket, [rule]);
  assert.equal(result.priority, 'P1');
  rule.keyword = 'changed';
  assert.equal(result.evidence.matches[0].keyword, 'server sập');
  assert.equal(classifyPriority({ ...ticket, title: 'server sậpabc' }, [{ ...rule, keyword: 'server sập' }]).priority, 'P3');
});

test('Inactive rules and separate fields do not produce false phrase matches', () => {
  const ticket = { title: 'server', description: 'sập', impact: 'department' };
  const rule = { keyword: 'server sập', priority: 'P1', is_active: true };
  assert.equal(classifyPriority(ticket, [rule]).priority, 'P3');
  assert.equal(classifyPriority({ ...ticket, title: 'server sập' }, [{ ...rule, is_active: false }]).priority, 'P3');
  assert.equal(classifyPriority({ ...ticket, impact: 'organization' }, []).priority, 'P1');
  assert.throws(() => classifyPriority({ ...ticket, impact: 'other' }, []));
});

test('Direct negation does not escalate a keyword but a later real incident still does', () => {
  const rules = [
    { id: 1, keyword: 'mất mạng', priority: 'P1', is_active: true },
    { id: 2, keyword: 'không vào được LMS', priority: 'P1', is_active: true },
    { id: 3, keyword: 'lỗi đăng nhập', priority: 'P2', is_active: true },
  ];
  const classify = title => classifyPriority({ title, description: '', impact: 'individual' }, rules);
  for (const title of ['không bị mất mạng', 'không còn mất mạng', 'chưa mất mạng']) {
    assert.equal(classify(title).priority, 'P3');
    assert.deepEqual(classify(title).evidence.matches, []);
  }
  assert.equal(classify('đã hết lỗi đăng nhập').priority, 'P3');
  assert.equal(classify('không vào được LMS').priority, 'P1');
  assert.equal(classify('không bị mất mạng nhưng server vẫn ổn. Mất mạng lại lúc 9 giờ').priority, 'P1');
  assert.equal(classify('không bị mất mạng nhưng sau đó mất mạng').priority, 'P1');
  assert.equal(classifyPriority({ title: 'không bị mất mạng', description: '', impact: 'organization' }, rules).priority, 'P1');
});

test('SLA uses calendar minutes and rejects missing or inconsistent policies', () => {
  const deadlines = calculateDeadlines('2026-11-11T23:55:00Z', { is_active: true, response_minutes: 15, resolution_minutes: 120 });
  assert.equal(deadlines.response_deadline_at.toISOString(), '2026-11-12T00:10:00.000Z');
  assert.equal(deadlines.resolution_deadline_at.toISOString(), '2026-11-12T01:55:00.000Z');
  assert.throws(() => calculateDeadlines(new Date(), null));
  assert.throws(() => calculateDeadlines(new Date(), { is_active: true, response_minutes: 15, resolution_minutes: 10 }));
});

test('Only sequential forward lifecycle transitions are allowed', () => {
  assert.doesNotThrow(() => assertStatusTransition('OPEN', 'IN_PROGRESS'));
  assert.doesNotThrow(() => assertStatusTransition('IN_PROGRESS', 'RESOLVED'));
  for (const [from, to] of [['OPEN', 'RESOLVED'], ['RESOLVED', 'OPEN'], ['OPEN', 'OPEN'], ['toString', 'OPEN']]) {
    assert.throws(() => assertStatusTransition(from, to), { code: 'INVALID_TRANSITION' });
  }
});
