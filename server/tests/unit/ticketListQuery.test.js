import test from 'node:test';
import assert from 'node:assert/strict';
import knex from 'knex';
import { ticketListOptions, filterTicketList, sortTicketList } from '../../src/modules/ticketListQuery.js';

test('Ticket list rejects malformed paging, search, priority and sort before SQL', () => {
  for (const input of [{ page: -1 }, { page: 1.5 }, { page: '1e40' }, { search: {} }, { search: 'x'.repeat(201) },
    { priority: 'URGENT' }, { priority: ['P1'] }, { sort: 'id desc; DROP TABLE tickets' }]) {
    assert.throws(() => ticketListOptions(input), error => error.statusCode === 400);
  }
  assert.deepEqual(ticketListOptions({}), { page: 1, search: '', priority: undefined, sort: 'newest' });
});

test('Ticket list filters the authorized set and orders globally before applying page limits', () => {
  const database = knex({ client: 'mysql2' }); // SQL compilation only; no connection.
  const options = ticketListOptions({ page: '2', search: '  older-code  ', priority: 'P1', sort: 'sla' });
  const query = filterTicketList(database('tickets').where('reporter_id', 3), options);
  const count = query.clone().count('* as count').toSQL();
  const items = sortTicketList(query, options.sort).limit(30).offset((options.page - 1) * 30).toSQL();
  assert.match(count.sql, /`reporter_id` = \? and \(`title` like \? or `ticket_code` like \?\) and `priority` = \?/);
  assert.deepEqual(count.bindings, [3, '%older-code%', '%older-code%', 'P1']);
  assert.match(items.sql, /order by resolution_deadline_at IS NULL ASC, `resolution_deadline_at` asc, `id` desc limit \? offset \?/);
  assert.deepEqual(items.bindings.slice(-2), [30, 30]);
  assert.match(sortTicketList(database('tickets'), 'priority').toSQL().sql, /`priority` asc, `id` desc/);
});
