import { test, expect } from '@playwright/test';

async function ticketFixture(page) {
  const requests = [];
  const tickets = Array.from({ length: 31 }, (_, index) => ({ id: index + 1, ticket_code: index ? `PAGE-${index + 1}` : 'OLDEST-001',
    title: index ? `Synthetic ticket ${index + 1}` : 'Older incident outside the first page',
    description: 'Synthetic pagination contract', status: 'OPEN', priority: index ? 'P3' : 'P1', reporter_id: 3,
    reporter_name: 'Synthetic reporter', category_id: 1, version: 1,
    resolution_deadline_at: new Date(Date.now() + (index + 1) * 60000).toISOString() }));
  await page.route('**/api/v1/**', async route => {
    expect(route.request().method()).toBe('GET');
    const url = new URL(route.request().url());
    let data;
    if (url.pathname.endsWith('/tickets')) {
      requests.push(url.searchParams);
      const search = (url.searchParams.get('search') || '').toLowerCase();
      const priority = url.searchParams.get('priority');
      const sort = url.searchParams.get('sort');
      const pageNumber = Number(url.searchParams.get('page') || 1);
      const filtered = tickets.filter(ticket => (ticket.title + ' ' + ticket.ticket_code).toLowerCase().includes(search)
        && (!priority || ticket.priority === priority));
      filtered.sort((a, b) => sort === 'sla' ? Date.parse(a.resolution_deadline_at) - Date.parse(b.resolution_deadline_at)
        : sort === 'priority' ? a.priority.localeCompare(b.priority) || b.id - a.id : b.id - a.id);
      data = { items: filtered.slice((pageNumber - 1) * 30, pageNumber * 30), total: filtered.length, page: pageNumber, pageSize: 30, routing: false };
    } else data = url.pathname.endsWith('/auth/me') ? { user: { id: 3, full_name: 'Synthetic reporter', role: 'END_USER' } }
      : url.pathname.endsWith('/categories') ? [{ id: 1, name: 'Synthetic category' }]
        : url.pathname.endsWith('/notifications') ? { items: [], unreadCount: 0 } : [];
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
  });
  return requests;
}

test('pagination reaches ticket 31 and search/priority/SLA queries cover the complete authorized queue', async ({ page }) => {
  const requests = await ticketFixture(page);
  await page.goto('/kanban');
  await expect(page.locator('.ticket-card')).toHaveCount(30);
  await page.getByRole('combobox', { name: 'Sắp xếp ticket' }).selectOption('newest');
  await expect(page.locator('.ticket-card').filter({ hasText: 'OLDEST-001' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Trang tiếp' }).click();
  await expect(page.locator('.ticket-card')).toHaveCount(1);
  await expect(page.locator('.ticket-card')).toContainText('OLDEST-001');
  await expect(page.getByLabel('Phân trang ticket')).toContainText('Trang 2/2');
  await page.getByRole('textbox', { name: 'Tìm ticket', exact: true }).fill('OLDEST-001');
  await expect(page.locator('.toolbar .muted')).toHaveText('Hiển thị 1/1 ticket');
  await expect(page.getByLabel('Phân trang ticket')).toContainText('Trang 1/1');
  expect(requests.some(params => params.get('search') === 'OLDEST-001' && params.get('page') === '1')).toBe(true);
  await page.getByRole('textbox', { name: 'Tìm ticket', exact: true }).fill('');
  await page.getByRole('combobox', { name: 'Lọc mức độ ưu tiên' }).selectOption('P1');
  await expect.poll(() => requests.some(params => params.get('priority') === 'P1' && !params.has('search'))).toBe(true);
  await expect(page.locator('.toolbar .muted')).toHaveText('Hiển thị 1/1 ticket');
  await expect(page.locator('.ticket-card')).toContainText('OLDEST-001');
  await page.getByRole('combobox', { name: 'Lọc mức độ ưu tiên' }).selectOption('all');
  await page.getByRole('combobox', { name: 'Sắp xếp ticket' }).selectOption('sla');
  await expect(page.locator('.ticket-card')).toHaveCount(30);
  await expect(page.locator('.ticket-card').first()).toContainText('OLDEST-001');
  await expect(page.getByLabel('Phân trang ticket')).toContainText('Trang 1/2');
});

test('global search retains its query when navigating from overview to the ticket queue', async ({ page }) => {
  const requests = await ticketFixture(page);
  await page.goto('/');
  const search = page.getByRole('searchbox', { name: 'Tìm nhanh mã ticket hoặc tiêu đề' });
  await search.fill('OLDEST-001');
  await search.press('Enter');
  await expect(page).toHaveURL(/\/kanban$/);
  await expect(search).toHaveValue('OLDEST-001');
  await expect(page.locator('.toolbar .muted')).toHaveText('Hiển thị 1/1 ticket');
  await expect(page.locator('.ticket-card')).toContainText('OLDEST-001');
  expect(requests.some(params => params.get('search') === 'OLDEST-001')).toBe(true);
});
