import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const screenshotDir = 'docs/screenshots/acceptance-production';
const ticket = { id: 1, ticket_code: 'BENCH-0001', title: 'Sự cố kiểm thử trạng thái',
  reporter_id: 1, reporter_name: 'Tài khoản kiểm thử', category_id: 1,
  priority: 'P2', status: 'OPEN', version: 1,
  resolution_deadline_at: '2026-11-18T12:00:00.000Z' };

async function fixture(page, ticketResponse) {
  await page.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url());
    const pathname = url.pathname;
    const headers = { 'Access-Control-Allow-Origin': 'http://127.0.0.1:4173',
      'Access-Control-Allow-Credentials': 'true' };
    if (pathname.endsWith('/tickets')) {
      const result = await ticketResponse(url);
      await route.fulfill({ ...result, contentType: 'application/json', headers });
      return;
    }
    const data = pathname.endsWith('/auth/me') ? { user: { id: 1, role: 'IT_AGENT', full_name: 'Benchmark Agent' } }
      : pathname.endsWith('/categories') ? [{ id: 1, name: 'Hỗ trợ CNTT' }]
        : pathname.endsWith('/agents') ? []
          : pathname.endsWith('/notifications') ? { items: [], unreadCount: 0 }
            : pathname.endsWith('/routing/me') ? { enabled: false, units: [] }
            : null;
    await route.fulfill({ status: data === null ? 500 : 200, contentType: 'application/json',
      headers, body: JSON.stringify(data ?? { error: { message: 'Unexpected fixture route' } }) });
  });
}

test('production Kanban shows loading before ticket data arrives', async ({ page }) => {
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  await fixture(page, async () => {
    await pending;
    return { status: 200, body: JSON.stringify({ items: [ticket], total: 1, page: 1, pageSize: 30 }) };
  });
  const navigation = page.goto('/kanban', { waitUntil: 'domcontentloaded' });
  try {
    await expect(page.getByRole('status').filter({ hasText: 'Đang tải ticket…' })).toBeVisible();
    await expect(page.locator('.toolbar .muted')).toHaveText('Đang tải…');
    await expect(page.getByText('Chưa có ticket')).toHaveCount(0);
    await mkdir(screenshotDir, { recursive: true });
    await page.screenshot({ path: `${screenshotDir}/kanban-loading.png` });
  } finally { release(); }
  await navigation;
  await expect(page.locator('.ticket-card')).toHaveCount(1);
});

test('production Kanban reports API failure and recovers on retry', async ({ page }) => {
  let attempts = 0;
  let recovered = false;
  await fixture(page, async () => {
    attempts++;
    return recovered
      ? { status: 200, body: JSON.stringify({ items: [ticket], total: 1, page: 1, pageSize: 30 }) }
      : { status: 503, body: JSON.stringify({ error: { message: 'Tạm thời không sẵn sàng' } }) };
  });
  await page.goto('/kanban');
  await expect(page.locator('.board-state[role="alert"]')).toContainText('Không tải được ticket');
  await expect(page.locator('.toolbar .muted')).toHaveText('Lỗi tải dữ liệu');
  await expect(page.getByText('Chưa có ticket')).toHaveCount(0);
  await mkdir(screenshotDir, { recursive: true });
  await page.screenshot({ path: `${screenshotDir}/kanban-error.png` });
  recovered = true;
  await page.getByRole('button', { name: 'Thử lại' }).click();
  await expect(page.locator('.ticket-card')).toHaveCount(1);
  expect(attempts).toBeGreaterThanOrEqual(2);
});

test('production Rules does not show an empty result while loading', async ({ page }) => {
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/rules') || path.endsWith('/sla/policies')) await pending;
    const data = path.endsWith('/auth/me') ? { user: { id: 1, role: 'ADMIN', full_name: 'Benchmark Admin' } }
      : path.endsWith('/tickets') ? { items: [], total: 0, page: 1, pageSize: 30 }
        : path.endsWith('/rules') ? [{ id: 1, keyword: 'quy tắc thử', priority: 'P1', is_active: true }]
          : path.endsWith('/sla/policies') ? []
            : path.endsWith('/categories') || path.endsWith('/agents') ? []
              : { items: [], unreadCount: 0 };
    await route.fulfill({ status: 200, contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': 'http://127.0.0.1:4173', 'Access-Control-Allow-Credentials': 'true' },
      body: JSON.stringify(data) });
  });
  const navigation = page.goto('/rules', { waitUntil: 'domcontentloaded' });
  try {
    await expect(page.getByText('Đang tải quy tắc…')).toBeVisible();
    await expect(page.getByText('Không có quy tắc phù hợp.')).toHaveCount(0);
  } finally { release(); }
  await navigation;
  await expect(page.getByText('quy tắc thử')).toBeVisible();
});

test('production Dashboard displays an API error and retries successfully', async ({ page }) => {
  let fail = true;
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname;
    const dashboard = path.includes('/analytics/');
    const data = path.endsWith('/auth/me') ? { user: { id: 1, role: 'ADMIN', full_name: 'Benchmark Admin' } }
      : path.endsWith('/tickets') ? { items: [], total: 0, page: 1, pageSize: 30 }
        : path.endsWith('/analytics/summary') ? { total: 0, mttaSeconds: null, mttrSeconds: null,
          slaCompliancePercent: null, slaCompliant: 0, slaEvaluated: 0 }
          : path.endsWith('/notifications') ? { items: [], unreadCount: 0 } : [];
    await route.fulfill({ status: dashboard && fail ? 503 : 200, contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': 'http://127.0.0.1:4173', 'Access-Control-Allow-Credentials': 'true' },
      body: JSON.stringify(dashboard && fail ? { error: { message: 'Số liệu tạm thời không sẵn sàng' } } : data) });
  });
  await page.goto('/dashboard');
  await expect(page.getByRole('alert')).toContainText('Số liệu tạm thời không sẵn sàng');
  await mkdir(screenshotDir, { recursive: true });
  await page.screenshot({ path: `${screenshotDir}/dashboard-error.png` });
  fail = false;
  await page.getByRole('button', { name: 'Thử lại' }).click();
  await expect(page.getByText('Từ tạo ticket đến ACK đầu tiên')).toBeVisible();
});

test('production Login keeps the approved static illustration without downloading the retired 3D scene', async ({ page }) => {
  const sceneRequests = [];
  page.on('request', request => { if (/SupportScene-[^/]+\.js/.test(request.url())) sceneRequests.push(request.url()); });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login');
  await expect(page.locator('.login-hero-illustration svg')).toBeAttached();
  await expect(page.locator('.login-hero-illustration')).toBeHidden();
  expect(sceneRequests).toHaveLength(0);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator('.login-hero-illustration svg')).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(sceneRequests).toHaveLength(0);
});

test('API-connected production Kanban fits the five approved widths', async ({ page }) => {
  await fixture(page, async () => ({ status: 200,
    body: JSON.stringify({ items: [ticket], total: 1, page: 1, pageSize: 30 }) }));
  for (const width of [1440, 1280, 950, 768, 390]) {
    await page.setViewportSize({ width, height: width < 500 ? 844 : 900 });
    await page.goto('/kanban');
    await expect(page.locator('.ticket-card')).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `page overflow at ${width}px`)
      .toBeLessThanOrEqual(width + 2);
  }
  await mkdir(screenshotDir, { recursive: true });
  await page.screenshot({ path: `${screenshotDir}/kanban-mobile-390.png`, fullPage: true });
});

test('production Kanban filters API tickets by priority with a read-only server query', async ({ page }) => {
  const p1 = { ...ticket, id: 2, ticket_code: 'BENCH-0002', priority: 'P1' };
  let ticketRequests = 0;
  await fixture(page, async url => {
    ticketRequests++;
    const items = url.searchParams.get('priority') === 'P1' ? [p1] : [ticket, p1];
    return { status: 200, body: JSON.stringify({ items, total: items.length, page: 1, pageSize: 30 }) };
  });
  await page.goto('/kanban');
  await expect(page.locator('.ticket-card')).toHaveCount(2);
  const requestsBeforeFiltering = ticketRequests;
  await page.getByRole('combobox', { name: 'Lọc mức độ ưu tiên' }).selectOption('P1');
  await expect(page.locator('.ticket-card')).toHaveCount(1);
  await expect(page.locator('.ticket-card')).toContainText(['BENCH-0002']);
  await page.getByRole('combobox', { name: 'Lọc mức độ ưu tiên' }).selectOption('all');
  await expect(page.locator('.ticket-card')).toHaveCount(2);
  expect(ticketRequests).toBeGreaterThan(requestsBeforeFiltering);
});

test('production SLA distinguishes approaching deadline from breach', async ({ page }) => {
  const near = { ...ticket, id: 3, ticket_code: 'BENCH-0003', resolution_deadline_at: new Date(Date.now() + 10 * 60000).toISOString() };
  const breached = { ...ticket, id: 4, ticket_code: 'BENCH-0004', resolution_deadline_at: new Date(Date.now() - 10 * 60000).toISOString() };
  await fixture(page, async () => ({ status: 200,
    body: JSON.stringify({ items: [near, breached], total: 2, page: 1, pageSize: 30 }) }));
  await page.goto('/kanban');
  await expect(page.locator('.ticket-card .sla.approaching')).toContainText('Còn');
  await expect(page.locator('.ticket-card .sla.urgent')).toContainText('Quá hạn');
});
