import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

async function fixture(page, role = 'IT_AGENT') {
  const requests = [];
  const base = { description: 'Synthetic queue acceptance', category_id: 1, priority: 'P3', version: 1, reporter_id: 3,
    reporter_name: 'Người gửi', owner_unit_id: 1, owner_unit_name: 'IT Mạng', routing_status: 'ASSIGNED',
    resolution_deadline_at: new Date(Date.now() + 10 * 60000).toISOString() };
  const tickets = [
    { ...base, id: 1, ticket_code: 'WORK-001', title: 'Wifi phòng học mất kết nối', status: 'OPEN', assignee_id: 20,
      assignee_name: 'Kỹ thuật viên Mạng A', assignee_open_count: 1,
      routing_explanation: { reason: 'KEYWORD', auto_assigned: true, load_before: 0 }, routing_permissions: { can_handle: true } },
    { ...base, id: 2, ticket_code: 'WORK-002', title: 'Kiểm tra switch phòng máy', status: 'IN_PROGRESS', assignee_id: 21, assignee_name: 'Kỹ thuật viên Mạng B' },
    { ...base, id: 3, ticket_code: 'WORK-003', title: 'Máy in không nhận giấy', status: 'OPEN', owner_unit_id: 2, owner_unit_name: 'Phần cứng', assignee_id: 30, assignee_name: 'Kỹ thuật viên Phần cứng' },
    { ...base, id: 4, ticket_code: 'WORK-004', title: 'Wifi và máy in cần hỗ trợ', status: 'OPEN', routing_status: 'REVIEW_REQUIRED', owner_unit_id: null, owner_unit_name: null, assignee_id: null },
    { ...base, id: 5, ticket_code: 'WORK-005', title: 'Sự cố mạng đã giải quyết', status: 'RESOLVED', assignee_id: 20 },
  ];
  await page.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url());
    expect(route.request().method()).toBe('GET');
    let data;
    if (url.pathname.endsWith('/tickets')) {
      const scope = url.searchParams.get('scope') || 'all'; requests.push(scope);
      const items = tickets.filter(ticket => scope === 'all' || ticket.status !== 'RESOLVED'
        && (scope === 'mine' ? ticket.assignee_id === 20 : scope === 'team' ? ticket.owner_unit_id === 1 : ticket.routing_status === 'REVIEW_REQUIRED'));
      data = { items, total: items.length, page: 1, pageSize: 30, routing: true, queueCounts: { all: 5, mine: 1, team: 2, review: 1 } };
    } else data = url.pathname.endsWith('/auth/me') ? { user: { id: 20, role, full_name: 'Kỹ thuật viên Mạng A' } }
      : url.pathname.endsWith('/routing/me') ? { enabled: true, version: 2, open_count: 1, capacity: 8, units: [{ id: 1, name: 'IT Mạng', is_available: true }] }
        : url.pathname.endsWith('/notifications') ? { items: [], unreadCount: 0 } : [];
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
  });
  return requests;
}

test('Agent changes work queues, reads assignment/load/reason and sees approaching SLA at desktop/mobile', async ({ page }) => {
  const requests = await fixture(page);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/kanban');
    await expect(page.locator('.ticket-card')).toHaveCount(5);
    await page.getByRole('button', { name: /Việc của tôi/ }).click();
    await expect(page.locator('.ticket-card')).toHaveCount(1);
    for (const text of ['Kỹ thuật viên Mạng A', '1 ticket mở', 'tải mở thấp nhất', 'Sắp hết SLA']) await expect(page.locator('.ticket-card')).toContainText(text);
    await expect(page.getByRole('button', { name: /Việc của tôi/ })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: /Hàng chờ nhóm/ }).click();
    await expect(page.locator('.ticket-card')).toHaveCount(2);
    await page.getByRole('button', { name: /Cần Admin phân tuyến/ }).click();
    await expect(page.locator('.ticket-card')).toHaveCount(1);
    await expect(page.locator('.ticket-card')).toContainText('WORK-004');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 2);
    await page.getByRole('button', { name: /Việc của tôi/ }).click();
    await expect(page.locator('.ticket-card')).toHaveCount(1);
    if (width === 1440) {
      const sidebar = await page.locator('.sidebar').boundingBox();
      const heading = await page.getByRole('heading', { name: 'Bảng Kanban Tương tác' }).boundingBox();
      expect(heading.x).toBeGreaterThanOrEqual(sidebar.x + sidebar.width);
    }
    await mkdir('docs/screenshots/agent-queues', { recursive: true });
    await page.screenshot({ path: `docs/screenshots/agent-queues/my-work-${width}.png`, fullPage: true });
  }
  expect(requests).toEqual(expect.arrayContaining(['mine', 'team', 'review']));
});

test('Reporter has no staff queue controls', async ({ page }) => {
  await fixture(page, 'END_USER');
  await page.goto('/kanban');
  await expect(page.locator('.ticket-card')).toHaveCount(5);
  await expect(page.getByRole('region', { name: 'Hàng chờ công việc' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Việc của tôi/ })).toHaveCount(0);
});
