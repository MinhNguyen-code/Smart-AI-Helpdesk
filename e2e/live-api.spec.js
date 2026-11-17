import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import signature from 'cookie-signature';
import knex from 'knex';
import { createDatabaseConfig, validateDatabaseConfig } from '../knexfile.js';
import { assertIdentity } from '../server/src/db/targetPolicy.js';

const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==', 'base64');
const shots = path.resolve('docs/screenshots/live-api');

test('real React/API/MySQL flow with isolated test sessions for three roles', async ({ browser }) => {
  test.setTimeout(120000);
  const config = createDatabaseConfig('test');
  validateDatabaseConfig('test', 'runtime', config);
  const db = knex(config);
  const token = randomUUID();
  const ids = [];
  const sessions = [];
  let categoryId;
  let ticketId;
  let ruleId;
  let approvedUserId;
  let originalPolicy;
  let storedName;
  const contexts = [];
  async function fixture(role) {
    const [id] = await db('users').insert({ email: `${randomUUID()}@example.invalid`, full_name: `${role} test fixture`, role, is_active: true });
    ids.push(id);
    const sid = randomUUID(); sessions.push(sid);
    await db('sessions').insert({ session_id: sid, expires: Date.now() + 120000,
      data: JSON.stringify({ cookie: { expires: new Date(Date.now() + 120000) }, user: { id, role }, csrfToken: token }) });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    contexts.push(context);
    await context.addCookies([{ name: 'smart_helpdesk_sid',
      value: `s:${signature.sign(sid, process.env.SESSION_SECRET)}`,
      domain: '127.0.0.1', path: '/', httpOnly: true, sameSite: 'Lax' }]);
    return { id, page: await context.newPage() };
  }
  try {
    const [identity] = await db.raw('SELECT DATABASE() AS selected_database, CURRENT_USER() AS matched_account');
    assertIdentity('test', 'runtime', identity[0]);
    const reporter = await fixture('END_USER');
    const agent = await fixture('IT_AGENT');
    const admin = await fixture('ADMIN');
    [categoryId] = await db('categories').insert({ name: `browser-${token}` });
    const title = `Browser ticket ${token}`;
    await mkdir(shots, { recursive: true });

    await reporter.page.goto('/tickets/new');
    await expect(reporter.page.getByRole('heading', { name: 'Tạo Yêu Cầu Hỗ Trợ Mới' })).toBeVisible();
    await reporter.page.getByRole('textbox', { name: 'Tiêu đề sự cố *' }).fill(title);
    await reporter.page.getByRole('combobox', { name: 'Mức độ ảnh hưởng *' }).selectOption('organization');
    await reporter.page.getByRole('combobox', { name: 'Danh mục *' }).selectOption(String(categoryId));
    await reporter.page.getByRole('textbox', { name: 'Mô tả chi tiết *' }).fill('Browser API/MySQL integration fixture');
    await reporter.page.locator('#ticket-attachment').setInputFiles({ name: 'proof.png', mimeType: 'image/png', buffer: image });
    await reporter.page.screenshot({ path: path.join(shots, '02-create-ticket.png') });
    await reporter.page.getByRole('button', { name: 'Gửi yêu cầu' }).click();
    await expect(reporter.page.getByRole('heading', { name: 'Bảng Kanban Tương tác' })).toBeVisible();
    await expect(reporter.page.getByRole('button', { name: new RegExp(title) })).toBeVisible();
    const ticket = await db('tickets').where({ title }).first();
    expect(ticket.priority).toBe('P1');
    ticketId = ticket.id;
    await expect.poll(async () => (await db('ticket_attachments').where('ticket_id', ticketId)).length).toBe(1);
    storedName = (await db('ticket_attachments').where('ticket_id', ticketId).first()).stored_filename;
    await reporter.page.screenshot({ path: path.join(shots, '03-kanban-end-user.png') });
    await reporter.page.getByRole('button', { name: new RegExp(title) }).click();
    await expect(reporter.page.getByRole('dialog')).toContainText('Ảnh');
    await reporter.page.getByRole('dialog').getByRole('button', { name: 'Đóng' }).click();

    await agent.page.goto('/kanban');
    await expect(agent.page.getByRole('button', { name: new RegExp(title) })).toBeVisible();
    await agent.page.getByRole('button', { name: new RegExp(title) }).click();
    let dialog = agent.page.getByRole('dialog');
    await dialog.getByLabel('Phân công').selectOption(String(agent.id));
    await expect(dialog).toContainText('IT_AGENT test fixture');
    await dialog.getByRole('button', { name: 'Xác nhận tiếp nhận' }).click();
    await expect(dialog).toContainText('Tiếp nhận (ACK)');
    await dialog.getByRole('textbox', { name: 'Phản hồi' }).fill('Đã tiếp nhận và đang kiểm tra.');
    await dialog.getByRole('button', { name: 'Gửi phản hồi' }).click();
    await expect(dialog).toContainText('Đã tiếp nhận và đang kiểm tra.');
    await dialog.getByLabel('Trạng thái').selectOption('IN_PROGRESS');
    await expect(dialog.getByLabel('Trạng thái')).toHaveValue('IN_PROGRESS');
    await dialog.getByLabel('Trạng thái').selectOption('RESOLVED');
    await expect(dialog.getByLabel('Trạng thái')).toHaveValue('RESOLVED');
    await agent.page.screenshot({ path: path.join(shots, '04-ticket-detail-agent.png') });
    const stored = await db('tickets').where('id', ticketId).first();
    expect(stored.acknowledged_at).toBeTruthy();
    expect(stored.first_response_at).toBeTruthy();
    expect(stored.status).toBe('RESOLVED');

    await reporter.page.reload();
    await expect(reporter.page.getByRole('button', { name: /Thông báo \([1-9]/ })).toBeVisible();
    await reporter.page.getByRole('button', { name: /Thông báo \([1-9]/ }).click();
    await expect(reporter.page.locator('.notification-panel')).toContainText('Phản hồi mới');

    await admin.page.goto('/rules');
    await expect(admin.page.getByRole('heading', { name: 'Cấu hình Rule-Based Engine' })).toBeVisible();
    await admin.page.getByRole('button', { name: 'Thêm Quy Tắc Mới' }).click();
    await admin.page.getByRole('dialog').getByRole('textbox', { name: 'Từ khóa' }).fill(`rule ${token}`);
    await admin.page.getByRole('dialog').getByRole('button', { name: 'Lưu quy tắc' }).click();
    await expect(admin.page.getByText(`rule ${token}`)).toBeVisible();
    ruleId = (await db('priority_rules').where('keyword', `rule ${token}`).first()).id;
    originalPolicy = await db('sla_policies').where('priority', 'P4').first();
    await admin.page.getByRole('button', { name: 'Chỉnh sửa' }).last().click();
    await admin.page.getByRole('dialog').getByRole('spinbutton', { name: 'Phản hồi (phút)' }).fill('481');
    await admin.page.getByRole('dialog').getByRole('button', { name: 'Lưu SLA' }).click();
    await expect(admin.page.getByText('Phản hồi: 481 phút')).toBeVisible();
    await admin.page.screenshot({ path: path.join(shots, '06-rules-admin.png') });

    await admin.page.goto('/users');
    await expect(admin.page.getByRole('heading', { name: 'Tài khoản và Vai trò' })).toBeVisible();
    const approvedEmail = `${randomUUID()}@example.invalid`;
    await admin.page.getByRole('textbox', { name: 'Email' }).fill(approvedEmail);
    await admin.page.getByRole('button', { name: 'Phê duyệt' }).click();
    await expect(admin.page.getByText(approvedEmail)).toBeVisible();
    approvedUserId = (await db('users').where('email', approvedEmail).first()).id;
    await admin.page.goto('/dashboard');
    await expect(admin.page.getByRole('heading', { name: 'Báo Cáo Hiệu Suất' })).toBeVisible();
    await expect(admin.page.getByText('Từ tạo ticket đến ACK đầu tiên')).toBeVisible();
    await admin.page.screenshot({ path: path.join(shots, '05-dashboard-admin.png') });
    const actions = await db('audit_logs').whereIn('actor_id', ids).whereIn('action', ['TICKET_ACKNOWLEDGED', 'RULE_CREATED', 'USER_APPROVED']);
    expect(new Set(actions.map(row => row.action))).toEqual(new Set(['TICKET_ACKNOWLEDGED', 'RULE_CREATED', 'USER_APPROVED']));

    const httpErrors = [];
    admin.page.on('response', response => { if (response.status() >= 400) httpErrors.push(`${response.status()} ${new URL(response.url()).pathname}`); });
    for (const width of [1440, 1280, 950, 768, 390]) {
      await admin.page.setViewportSize({ width, height: width < 500 ? 844 : 900 });
      for (const route of (width === 1440 || width === 390 ? ['/kanban', '/rules', '/dashboard'] : ['/kanban'])) {
        await admin.page.goto(route);
        await expect(admin.page.locator('.main'), `HTTP errors: ${httpErrors.join(', ')}`).toBeVisible();
        expect(await admin.page.evaluate(() => document.documentElement.scrollWidth), `${route} at ${width}`).toBeLessThanOrEqual(width + 2);
      }
    }
    await admin.page.screenshot({ path: path.join(shots, 'mobile-dashboard-admin.png'), fullPage: true });
  } finally {
    for (const context of contexts) await context.close();
    if (originalPolicy) await db('sla_policies').where('id', originalPolicy.id).update({
      response_minutes: originalPolicy.response_minutes, resolution_minutes: originalPolicy.resolution_minutes,
      is_active: originalPolicy.is_active,
    });
    if (ruleId) await db('priority_rules').where('id', ruleId).delete();
    for (const sid of sessions) await db('sessions').where('session_id', sid).delete();
    if (ticketId) {
      await db('notifications').where('ticket_id', ticketId).delete();
      await db('audit_logs').where({ entity_type: 'ticket', entity_id: String(ticketId) }).delete();
      await db('tickets').where('id', ticketId).delete();
    }
    if (storedName) await unlink(path.resolve('server/private-uploads', storedName)).catch(() => {});
    if (approvedUserId) await db('users').where('id', approvedUserId).delete();
    if (ids.length) {
      await db('audit_logs').whereIn('actor_id', ids).delete();
      await db('users').whereIn('id', ids).delete();
    }
    if (categoryId) await db('categories').where('id', categoryId).delete();
    await db.destroy();
  }
});

test('measure Kanban p95 with 30 MySQL tickets and a test-only browser session', async ({ browser }) => {
  test.setTimeout(90000);
  const config = createDatabaseConfig('test');
  validateDatabaseConfig('test', 'runtime', config);
  const db = knex(config);
  const token = randomUUID();
  let userId;
  let sid;
  const ticketIds = [];
  let context;
  try {
    const [identity] = await db.raw('SELECT DATABASE() AS selected_database, CURRENT_USER() AS matched_account');
    assertIdentity('test', 'runtime', identity[0]);
    [userId] = await db('users').insert({ email: `${token}@example.invalid`, full_name: 'Kanban benchmark fixture', role: 'IT_AGENT', is_active: true });
    sid = randomUUID();
    await db('sessions').insert({ session_id: sid, expires: Date.now() + 120000,
      data: JSON.stringify({ cookie: { expires: new Date(Date.now() + 120000) }, user: { id: userId, role: 'IT_AGENT' } }) });
    for (let i = 0; i < 30; i++) {
      const [id] = await db('tickets').insert({ ticket_code: randomUUID().replaceAll('-', ''),
        reporter_id: userId, title: `Benchmark ${token} #${i}`, description: 'Fixture',
        priority: i % 2 ? 'P1' : 'P3', status: ['OPEN', 'IN_PROGRESS', 'RESOLVED'][i % 3],
        resolution_deadline_at: new Date(Date.now() + (i + 1) * 60000) });
      ticketIds.push(id);
    }
    context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addCookies([{ name: 'smart_helpdesk_sid',
      value: `s:${signature.sign(sid, process.env.SESSION_SECRET)}`,
      domain: '127.0.0.1', path: '/', httpOnly: true, sameSite: 'Lax' }]);
    const page = await context.newPage();
    const samples = [];
    for (let i = 0; i < 23; i++) {
      const start = performance.now();
      await page.goto('/kanban');
      await expect(page.getByRole('button', { name: new RegExp(`Benchmark ${token}`) }).first()).toBeVisible();
      if (i >= 3) samples.push(performance.now() - start);
    }
    samples.sort((a, b) => a - b);
    const result = { scenario: 'Vite dev + Express + isolated MySQL test, 30 cards, signed test fixture session',
      sampleCount: samples.length, p50Ms: Math.round(samples[9]), p95Ms: Math.round(samples[18]),
      p99Ms: Math.round(samples[19]), targetMs: 2000 };
    await mkdir(path.resolve('docs/benchmarks'), { recursive: true });
    const { writeFile } = await import('node:fs/promises');
    await writeFile(path.resolve('docs/benchmarks/kanban-test.json'), JSON.stringify(result, null, 2) + '\n');
    process.stdout.write(JSON.stringify(result) + '\n');
    expect(result.p95Ms).toBeLessThanOrEqual(result.targetMs);
  } finally {
    if (context) await context.close();
    if (sid) await db('sessions').where('session_id', sid).delete();
    if (ticketIds.length) {
      await db('notifications').whereIn('ticket_id', ticketIds).delete();
      await db('tickets').whereIn('id', ticketIds).delete();
    }
    if (userId) await db('users').where('id', userId).delete();
    await db.destroy();
  }
});
