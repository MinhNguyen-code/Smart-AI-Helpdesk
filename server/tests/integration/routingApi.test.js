import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import signature from 'cookie-signature';
import request from 'supertest';
import { assertCiEvidenceEnvironment } from '../../scripts/ciDatabaseEvidence.js';

test('Routing HTTP/MySQL acceptance runs only in the isolated GitHub CI service', {
  skip: process.env.RUN_ROUTING_DB !== '1', timeout: 120000,
}, async t => {
  // Check BEFORE loading dotenv, Knex, the application or any SQL fixture.
  assertCiEvidenceEnvironment(process.env);
  process.env.TICKET_ROUTING_ENABLED = 'true';
  const [{ default: app }, { db }, { assertIdentity }, { default: config }, { DatabaseSessionStore }, { runSlaCheck }] = await Promise.all([
    import('../../src/app.js'), import('../../src/db/index.js'), import('../../src/db/targetPolicy.js'),
    import('../../src/config/index.js'), import('../../src/db/sessionStore.js'), import('../../src/workers/slaWorker.js'),
  ]);
  const token = randomUUID().replaceAll('-', '');
  const people = [], sessions = [], tickets = [], categories = [], uploads = [];
  const store = new DatabaseSessionStore(db);
  const parse = value => typeof value === 'string' ? JSON.parse(value) : value;
  let baseline, settings, unitIds = [], protectedSnapshot;
  const counts = {};
  const http = (person, method, route, body) => {
    const call = request(app)[method](`/api/v1${route}`).set('Cookie', person.cookie);
    if (method !== 'get') call.set('Origin', config.clientUrl).set('X-CSRF-Token', token);
    return body === undefined ? call : call.send(body);
  };
  const ok = (response, status = 200) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body; };
  async function person(role, label, active = true) {
    const [id] = await db('users').insert({ email: `routing-${token}-${label}@example.invalid`, full_name: `CI ${label}`, role, is_active: active });
    const sid = randomUUID(); people.push(id); sessions.push(sid);
    await promisify(store.set.bind(store))(sid, { cookie: { expires: new Date(Date.now() + 300000) }, user: { id, role }, csrfToken: token });
    return { id, cookie: `${config.session.name}=${encodeURIComponent(`s:${signature.sign(sid, config.session.secret)}`)}` };
  }
  let admin, reporter, stranger, agentA, agentB, outsider, paused, inactive, network, hardware;
  const ticketRow = id => db('tickets').where({ id }).first();
  const getSettings = async () => ok(await http(admin, 'get', '/routing/settings'));
  const payload = value => ({ version: value.version, auto_assign: value.auto_assign, max_open_per_agent: value.max_open_per_agent,
    units: value.units.map(({ code, name, is_active, members }) => ({ code, name, is_active, members })), routes: value.routes });
  const save = async change => {
    const body = payload(await getSettings()); change(body);
    ok(await http(admin, 'put', '/routing/settings', body)); settings = await getSettings();
    return settings;
  };
  async function create(fields = {}, who = reporter) {
    const response = await http(who, 'post', '/tickets', { title: 'Wifi mất kết nối', description: 'Synthetic CI routing acceptance', impact: 'individual', category_id: network, ...fields });
    if (response.body.id) tickets.push(response.body.id);
    return ok(response, 201);
  }
  const snapshot = row => ({ priority: row.priority, evidence: parse(row.priority_evidence),
    response: new Date(row.response_deadline_at).toISOString(), resolution: new Date(row.resolution_deadline_at).toISOString(), status: row.status });
  try {
    const [identity] = await db.raw('SELECT DATABASE() AS selected_database, CURRENT_USER() AS matched_account');
    assertIdentity('test', 'runtime', identity[0]);
    assert.equal(Number((await db('support_units').count('* as count').first()).count), 0, 'Fresh CI routing configuration required');
    baseline = await db('routing_settings').where('id', 1).first();
    const fixtures = [];
    for (const [role, label, active] of [['ADMIN', 'admin', true], ['END_USER', 'reporter', true], ['END_USER', 'stranger', true],
      ['IT_AGENT', 'network-a', true], ['IT_AGENT', 'network-b', true], ['IT_AGENT', 'hardware', true], ['IT_AGENT', 'paused', true], ['IT_AGENT', 'inactive', false]]) {
      fixtures.push(await person(role, label, active));
    }
    [admin, reporter, stranger, agentA, agentB, outsider, paused, inactive] = fixtures;
    for (const name of ['network', 'hardware', 'application', 'account', 'unmapped']) {
      const [id] = await db('categories').insert({ name: `routing-${token}-${name}`, is_active: true }); categories.push(id);
    }
    [network, hardware] = categories;
    const codes = ['NETWORK', 'HARDWARE', 'APPLICATION', 'ACCOUNT'].map(code => `CI_${code}_${token.slice(0, 6).toUpperCase()}`);
    const unitInput = codes.map((code, index) => ({ code, name: `CI ${code}`, is_active: true,
      members: (index === 0 ? [agentA, agentB, paused] : index === 1 ? [outsider] : []).map(user => ({ user_id: user.id, is_available: user.id !== paused.id })) }));
    const routeInput = codes.map((unit_code, index) => ({ unit_code, category_id: categories[index], keywords: [['wifi', 'mất mạng'], ['máy in'], ['lms'], ['mật khẩu']][index] }));
    await t.test('Only active ADMIN configures routes; CSRF, version and member validation apply', async () => {
      const body = { version: baseline.version, auto_assign: true, max_open_per_agent: 8, units: unitInput, routes: routeInput };
      assert.equal((await http(reporter, 'get', '/routing/settings')).status, 403);
      assert.equal((await http(outsider, 'put', '/routing/settings', body)).status, 403);
      assert.equal((await request(app).put('/api/v1/routing/settings').set('Cookie', admin.cookie).set('Origin', config.clientUrl).send(body)).status, 403);
      const invalid = structuredClone(body); invalid.units[0].members.push({ user_id: inactive.id, is_available: true });
      assert.equal((await http(admin, 'put', '/routing/settings', invalid)).status, 400);
      ok(await http(admin, 'put', '/routing/settings', body));
      assert.equal((await http(admin, 'put', '/routing/settings', body)).status, 409);
      settings = await getSettings(); unitIds = settings.units.map(unit => unit.id);
      assert.equal(settings.version, baseline.version + 1); assert.equal(settings.units.length, 4);
    });

    let first, second;
    await t.test('Creation classifies, balances eligible agents and isolates routing from priority/SLA', async () => {
      first = await create({ impact: 'organization', owner_unit_id: unitIds[1], assignee_id: outsider.id, routing_status: 'ASSIGNED' });
      second = await create();
      assert.equal(first.owner_unit_id, unitIds[0]); assert.equal(first.assignee_id, agentA.id);
      assert.equal(second.assignee_id, agentB.id); assert.equal(first.priority, 'P1'); assert.equal(first.status, 'OPEN');
      assert.equal(first.routing_status, 'ASSIGNED'); assert.equal(first.routing_evidence, undefined);
      protectedSnapshot = snapshot(await ticketRow(first.id));
      const auto = await create({ category_id: null });
      assert.equal(auto.category_id, network); assert.equal(auto.owner_unit_id, unitIds[0]);
      assert.notEqual(auto.assignee_id, paused.id);
      const selfReport = await create({}, agentA);
      assert.notEqual(selfReport.assignee_id, agentA.id);
      ok(await http(agentA, 'post', `/tickets/${selfReport.id}/comments`, { message: 'CI staff reporting their own problem' }), 201);
      assert.equal((await ticketRow(selfReport.id)).first_response_at, null);
      assert.equal((await http(agentA, 'post', `/tickets/${selfReport.id}/comments`, { message: 'Private self note denied', visibility: 'internal' })).status, 403);
      const notifications = await db('notifications').where({ ticket_id: first.id, notification_type: 'TICKET_CREATED' });
      assert.ok(notifications.some(row => row.recipient_id === agentA.id));
      assert.ok(!notifications.some(row => [outsider.id, paused.id, inactive.id, agentB.id].includes(row.recipient_id)));
    });

    await t.test('Conflicting, missing and multiple specialties enter review without losing the ticket', async () => {
      for (const fields of [{ title: 'Máy in hỏng' }, { title: 'Wifi và máy in hỏng' }, { category_id: categories[4] }, { title: 'Cần hỗ trợ', category_id: null }]) {
        const ticket = await create(fields);
        assert.equal(ticket.routing_status, 'REVIEW_REQUIRED'); assert.equal(ticket.owner_unit_id, null); assert.equal(ticket.assignee_id, null);
        const recipients = await db('notifications').where({ ticket_id: ticket.id }).pluck('recipient_id');
        assert.ok(recipients.includes(admin.id)); assert.ok(!recipients.some(id => [agentA.id, agentB.id, outsider.id].includes(id)));
      }
      assert.equal((await http(admin, 'get', '/tickets?routing_status=REVIEW_REQUIRED')).body.items.filter(row => tickets.includes(row.id)).length, 4);
    });

    await t.test('Agent queues scope open work to self/team and explain assignment without disclosing internal workload to outsiders', async () => {
      const own = ok(await http(agentA, 'get', '/tickets?scope=mine'));
      assert.ok(own.items.length); assert.ok(own.items.every(row => row.assignee_id === agentA.id && row.status !== 'RESOLVED'));
      assert.ok(own.items[0].assignee_name); assert.equal(typeof own.items[0].assignee_open_count, 'number');
      assert.equal(own.items[0].routing_explanation.auto_assigned, true);
      const team = ok(await http(agentA, 'get', '/tickets?scope=team'));
      assert.ok(team.items.some(row => row.assignee_id === agentB.id));
      assert.ok(team.items.every(row => row.owner_unit_id === unitIds[0]));
      assert.equal(ok(await http(outsider, 'get', '/tickets?scope=team')).items.length, 0);
      const reviews = ok(await http(admin, 'get', '/tickets?scope=review'));
      assert.equal(reviews.total, 4); assert.equal(reviews.queueCounts.review, 4);
      assert.ok(reviews.items.every(row => row.routing_status === 'REVIEW_REQUIRED'));
      assert.equal((await http(reporter, 'get', '/tickets?scope=mine')).status, 403);
      const publicQueue = ok(await http(outsider, 'get', '/tickets'));
      assert.ok(publicQueue.items.some(row => row.id === first.id));
      const publicTicket = publicQueue.items.find(row => row.id === first.id);
      assert.equal(publicTicket.assignee_open_count, undefined); assert.equal(publicTicket.routing_explanation, undefined);
      const availability = ok(await http(agentA, 'get', '/routing/me'));
      assert.equal(availability.open_count, own.total); assert.equal(availability.capacity, 8);
    });

    await t.test('Shared queue permits public reading but blocks out-of-team processing and private history', async () => {
      const internal = ok(await http(agentA, 'post', `/tickets/${first.id}/comments`, { message: 'CI private network note', visibility: 'internal' }), 201);
      const publicReply = ok(await http(agentA, 'post', `/tickets/${first.id}/comments`, { message: 'CI public response' }), 201);
      await db('ticket_history').insert({ ticket_id: first.id, actor_id: agentA.id, event_type: 'COMMENT_ADDED', new_value: '999999999' });
      assert.ok((await http(outsider, 'get', '/tickets')).body.items.some(row => row.id === first.id));
      for (const who of [outsider, reporter]) {
        const detail = ok(await http(who, 'get', `/tickets/${first.id}`));
        assert.equal(detail.routing_evidence, undefined);
        assert.ok(detail.comments.some(row => row.id === publicReply.id)); assert.ok(!detail.comments.some(row => row.id === internal.id));
        assert.ok(!detail.history.some(row => row.event_type === 'ROUTED' || row.event_type === 'COMMENT_ADDED' && row.new_value !== String(publicReply.id)));
        assert.ok(!(await http(who, 'get', `/tickets/${first.id}/comments`)).body.some(row => row.id === internal.id));
      }
      const colleague = ok(await http(agentB, 'get', `/tickets/${first.id}`));
      assert.ok(colleague.comments.some(row => row.id === internal.id)); assert.equal(colleague.routing_permissions.can_handle, false);
      for (const who of [outsider, agentB]) {
        for (const [method, endpoint, body] of [
          ['post', 'acknowledge', { version: first.version }], ['patch', 'status', { version: first.version, status: 'IN_PROGRESS' }],
          ['post', 'comments', { message: 'Forbidden' }], ['post', 'comments', { message: 'Forbidden', visibility: 'internal' }],
          ['patch', 'assign', { assignee_id: who.id, version: first.version }],
        ]) assert.equal((await http(who, method, `/tickets/${first.id}/${endpoint}`, body)).status, 403);
        const upload = await http(who, 'post', `/tickets/${first.id}/attachments`).attach('file', Buffer.from([137,80,78,71,13,10,26,10,0]), { filename: 'ci.png', contentType: 'image/png' });
        assert.equal(upload.status, 403);
      }
      assert.equal((await http(stranger, 'get', `/tickets/${first.id}`)).status, 404);
      const uploaded = ok(await http(reporter, 'post', `/tickets/${first.id}/attachments`).attach('file', Buffer.from([137,80,78,71,13,10,26,10,0]), { filename: 'ci.png', contentType: 'image/png' }), 201);
      uploads.push((await db('ticket_attachments').where('id', uploaded.id).first()).stored_filename);
      assert.equal((await http(outsider, 'get', `/tickets/${first.id}/attachments/${uploaded.id}`)).status, 200);
      ok(await http(reporter, 'post', `/tickets/${first.id}/comments`, { message: 'CI reporter follow-up' }), 201);
      ok(await http(agentA, 'post', `/tickets/${first.id}/acknowledge`, { version: 1 }));
      assert.equal((await http(agentA, 'post', `/tickets/${first.id}/acknowledge`, { version: 1 })).status, 409);
      first = await ticketRow(first.id);
    });

    await t.test('ADMIN reroutes with a reason/version and keeps priority, SLA and three-state status', async () => {
      assert.equal((await http(admin, 'patch', `/tickets/${first.id}/routing`, { unit_id: unitIds[1], version: first.version })).status, 400);
      assert.equal((await http(agentA, 'patch', `/tickets/${first.id}/routing`, { unit_id: unitIds[1], version: first.version, reason: 'CI change group' })).status, 403);
      assert.equal((await http(admin, 'patch', `/tickets/${first.id}/routing`, { unit_id: unitIds[1], assignee_id: agentA.id, version: first.version, reason: 'CI wrong person' })).status, 409);
      const command = { unit_id: unitIds[1], assignee_id: outsider.id, version: first.version, reason: 'CI hardware specialist required' };
      const changed = ok(await http(admin, 'patch', `/tickets/${first.id}/routing`, command));
      assert.equal(changed.assignee_id, outsider.id); assert.equal(changed.owner_unit_id, unitIds[1]);
      assert.deepEqual(snapshot(await ticketRow(first.id)), protectedSnapshot);
      assert.equal((await http(admin, 'patch', `/tickets/${first.id}/routing`, command)).status, 409);
      assert.equal((await http(agentA, 'patch', `/tickets/${first.id}/status`, { version: changed.version, status: 'IN_PROGRESS' })).status, 403);
      const audit = await db('audit_logs').where({ action: 'TICKET_ROUTED', entity_id: String(first.id) }).first();
      assert.equal(parse(audit.safe_metadata).reason, command.reason);
      const inProgress = ok(await http(outsider, 'patch', `/tickets/${first.id}/status`, { version: changed.version, status: 'IN_PROGRESS' }));
      ok(await http(outsider, 'patch', `/tickets/${first.id}/status`, { version: inProgress.version, status: 'RESOLVED' }));
      assert.equal((await http(admin, 'patch', `/tickets/${first.id}/routing`, { ...command, version: inProgress.version + 1 })).status, 409);
    });

    await t.test('Members change only their own availability; occupied membership and unit cannot disappear', async () => {
      const mine = ok(await http(agentB, 'get', '/routing/me'));
      assert.equal((await http(outsider, 'patch', '/routing/availability', { unit_id: unitIds[0], is_available: false, version: mine.version })).status, 403);
      ok(await http(agentB, 'patch', '/routing/availability', { unit_id: unitIds[0], is_available: false, version: mine.version, user_id: agentA.id }));
      const memberships = await db('support_unit_memberships').where('unit_id', unitIds[0]);
      assert.equal(Boolean(memberships.find(row => row.user_id === agentB.id).is_available), false);
      assert.equal(Boolean(memberships.find(row => row.user_id === agentA.id).is_available), true);
      const oldAssignment = (await ticketRow(second.id)).assignee_id;
      const body = payload(await getSettings()); body.units[0].members = body.units[0].members.filter(row => row.user_id !== agentB.id);
      assert.equal((await http(admin, 'put', '/routing/settings', body)).status, 409);
      const disabled = payload(await getSettings()); disabled.units[0].is_active = false;
      assert.equal((await http(admin, 'put', '/routing/settings', disabled)).status, 409);
      await save(body => { body.units[0].members.find(row => row.user_id === agentB.id).is_available = true; });
      assert.equal((await ticketRow(second.id)).assignee_id, oldAssignment);
      // Read persisted routing through a separate Knex pool, not in-memory app state.
      const { default: knex } = await import('knex');
      const fresh = knex(db.client.config);
      try { const row = await fresh('tickets').where('id', first.id).first();
        assert.equal(row.status, 'RESOLVED'); assert.equal(row.owner_unit_id, unitIds[1]); } finally { await fresh.destroy(); }
    });

    await t.test('Multi-team load is global and concurrent route/reassignment keeps one version winner', async () => {
      await save(body => { body.units[1].members.push({ user_id: agentA.id, is_available: true }); });
      const hardwareTicket = await create({ title: 'Máy in hỏng', category_id: hardware });
      // A has no hardware ticket but does have network work; the idle hardware agent wins.
      assert.equal(hardwareTicket.assignee_id, outsider.id);
      const candidate = await create();
      const other = candidate.assignee_id === agentA.id ? agentB : agentA;
      const competing = await Promise.all([
        http(admin, 'patch', `/tickets/${candidate.id}/assign`, { assignee_id: other.id, version: candidate.version, reason: 'CI balance workload' }),
        http(admin, 'patch', `/tickets/${candidate.id}/routing`, { unit_id: unitIds[1], assignee_id: outsider.id, version: candidate.version, reason: 'CI specialist review' }),
      ]);
      assert.deepEqual(competing.map(row => row.status).sort(), [200, 409]);
      assert.equal((await ticketRow(candidate.id)).version, candidate.version + 1);
    });

    await t.test('Concurrent creation honors global open load and capacity without duplicate or cross-team assignment', async () => {
      // Only this CI test's existing open tickets are resolved to start a measured burst.
      await db('tickets').whereIn('id', tickets).update({ status: 'RESOLVED', resolved_at: new Date() });
      const responses = await Promise.all(Array.from({ length: 18 }, (_, index) => http(reporter, 'post', '/tickets', {
        title: `Wifi CI concurrency ${index}`, description: 'Synthetic concurrent allocation', impact: 'individual', category_id: network,
      })));
      for (const response of responses) if (response.body.id) tickets.push(response.body.id);
      const results = responses.map(response => ok(response, 201));
      assert.equal(new Set(results.map(row => row.id)).size, 18);
      assert.equal(results.filter(row => row.assignee_id === agentA.id).length, 8);
      assert.equal(results.filter(row => row.assignee_id === agentB.id).length, 8);
      assert.equal(results.filter(row => row.routing_status === 'TEAM_QUEUE' && row.assignee_id === null).length, 2);
      assert.ok(results.every(row => row.owner_unit_id === unitIds[0]));
      Object.assign(counts, { concurrentRequests: 18, assignedA: 8, assignedB: 8, queuedAtCapacity: 2 });
      const queued = results.find(row => row.routing_status === 'TEAM_QUEUE');
      assert.equal((await http(agentA, 'patch', `/tickets/${queued.id}/assign`, { assignee_id: agentA.id, version: queued.version })).status, 409);
      assert.equal((await http(outsider, 'patch', `/tickets/${queued.id}/assign`, { assignee_id: outsider.id, version: queued.version })).status, 403);
      // Free one slot, then race two same-version self claims. Exactly one succeeds.
      await db('tickets').where('id', results.find(row => row.assignee_id === agentA.id).id).update({ status: 'RESOLVED', resolved_at: new Date() });
      const claims = await Promise.all([1, 2].map(() => http(agentA, 'patch', `/tickets/${queued.id}/assign`, { assignee_id: agentA.id, version: queued.version })));
      assert.deepEqual(claims.map(row => row.status).sort(), [200, 409]);
    });

    await t.test('SLA notifications stay within responsible group; flag-off preserves restrictions on routed tickets', async () => {
      const row = await db('tickets').whereIn('id', tickets).where({ assignee_id: agentA.id, status: 'OPEN' }).first();
      await db('tickets').where('id', row.id).update({ response_deadline_at: new Date(Date.now() - 60000), resolution_deadline_at: new Date(Date.now() + 60000) });
      await runSlaCheck(db); await runSlaCheck(db);
      const notices = await db('notifications').where({ ticket_id: row.id, notification_type: 'SLA_BREACH' });
      assert.ok(notices.some(notice => notice.recipient_id === agentA.id));
      assert.ok(notices.some(notice => notice.recipient_id === admin.id));
      assert.ok(!notices.some(notice => [agentB.id, outsider.id, paused.id, inactive.id].includes(notice.recipient_id)));
      assert.equal(new Set(notices.map(notice => notice.deduplication_key)).size, notices.length);
      process.env.TICKET_ROUTING_ENABLED = 'false';
      assert.equal((await http(outsider, 'patch', `/tickets/${row.id}/status`, { status: 'IN_PROGRESS', version: row.version })).status, 403);
      assert.equal((await http(admin, 'get', '/routing/capabilities')).body.enabled, false);
      assert.equal((await http(admin, 'get', `/tickets/${row.id}`)).body.routing_permissions.can_route, false);
      assert.equal((await http(admin, 'get', '/routing/settings')).status, 503);
      process.env.TICKET_ROUTING_ENABLED = 'true';
      await db('users').where('id', agentA.id).update({ is_active: false });
      assert.equal((await http(agentA, 'post', `/tickets/${row.id}/comments`, { message: 'Inactive denied' })).status, 401);
    });

    await mkdir('.ci-evidence', { recursive: true });
    await writeFile('.ci-evidence/routing-acceptance.json', JSON.stringify({ scope: 'Synthetic HTTP, database sessions and isolated MySQL CI; not Google browser acceptance',
      ...counts, checks: 'category/keyword, workload/capacity/concurrency, shared queue/write RBAC, internal history, CSRF, version, manual route/SLA preservation, availability, persistence, SLA recipients, flag-off' }, null, 2) + '\n');
  } finally {
    process.env.TICKET_ROUTING_ENABLED = 'false';
    try {
      // All fixture writes/deletions are behind the CI/environment + real identity guards above.
      if (baseline) {
        await db('notifications').whereIn('ticket_id', tickets).delete();
        await db('tickets').whereIn('id', tickets).delete();
        await db('audit_logs').whereIn('actor_id', people).delete();
        await db('category_unit_routes').whereIn('category_id', categories).delete();
        await db('support_unit_memberships').whereIn('user_id', people).delete();
        await db('support_units').whereIn('id', unitIds).delete();
        await db('categories').whereIn('id', categories).delete();
        await db('sessions').whereIn('session_id', sessions).delete();
        await db('users').whereIn('id', people).delete();
        await db('routing_settings').where('id', 1).update(baseline);
        for (const name of uploads) await unlink(path.join(config.upload.dir, name));
      }
    } finally { await db.destroy(); }
  }
});
