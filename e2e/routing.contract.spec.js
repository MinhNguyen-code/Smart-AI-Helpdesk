import { test, expect } from '@playwright/test';

const categories = [{ id: 91, name: 'Mạng & Kết nối' }, { id: 45, name: 'Phần cứng & Thiết bị' },
  { id: 81, name: 'Phần mềm & Hệ thống LMS' }, { id: 66, name: 'Tài khoản & Quyền truy cập' }];
const defaults = [
  { code: 'NETWORK', name: 'IT Mạng', category: categories[0].name, keywords: ['wifi', 'mất mạng'] },
  { code: 'APPLICATION_LMS', name: 'Ứng dụng / LMS', category: categories[2].name, keywords: ['lms'] },
  { code: 'HARDWARE_ONSITE', name: 'Phần cứng / Tại chỗ', category: categories[1].name, keywords: ['máy in'] },
  { code: 'ACCOUNT_ACCESS', name: 'Tài khoản / Quyền truy cập', category: categories[3].name, keywords: ['mật khẩu'] },
];
const agents = [{ id: 20, full_name: 'An · IT Mạng', email: 'network@example.invalid', open_count: 2 },
  { id: 21, full_name: 'Bình · Ứng dụng', email: 'app@example.invalid', open_count: 1 },
  { id: 22, full_name: 'Chi · Thiết bị', email: 'device@example.invalid', open_count: 3 }];
async function fixtures(page, role = 'ADMIN') {
  const state = { settings: { version: 7, auto_assign: true, max_open_per_agent: 10, units: [], routes: [], agents, categories, defaults },
    role, userId: role === 'IT_AGENT' ? 21 : role === 'END_USER' ? 1 : 10, writes: [], nextConflict: false };
  await page.route('**/api/v1/**', async route => {
    const req = route.request(); const url = new URL(req.url()); const path = url.pathname.replace('/api/v1', '');
    const send = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (req.method() !== 'GET') state.writes.push({ path, method: req.method(), body: req.postDataJSON() });
    if (path === '/auth/me') return send({ user: { id: state.userId, role: state.role, full_name: 'Tài khoản kiểm tra' } });
    if (path === '/auth/csrf') return send({ csrfToken: 'synthetic-ui-only-token' });
    if (path === '/categories') return send(categories);
    if (path === '/agents') return send(agents);
    if (path.startsWith('/notifications')) return send({ items: [], unreadCount: 0 });
    if (path === '/routing/capabilities') return send({ enabled: true });
    if (path === '/routing/me') return send({ enabled: true, version: 7, units: [{ id: 2, name: 'Ứng dụng / LMS', is_available: true }] });
    if (path === '/routing/settings') {
      if (req.method() === 'PUT') {
        if (state.nextConflict) { state.nextConflict = false; return send({ error: { message: 'Cấu hình đã thay đổi; tải lại trước khi lưu.' } }, 409); }
        state.settings = { ...state.settings, ...req.postDataJSON(), version: state.settings.version + 1 };
        state.settings.units = state.settings.units.map((unit, index) => ({ ...unit, id: index + 1 }));
        return send({ saved: true });
      }
      return send(state.settings);
    }
    const ticket = { id: 900, ticket_code: 'CI-ROUTING-900', title: 'Wifi phòng học mất kết nối', description: 'Không truy cập được wifi trong phòng học.',
      status: 'OPEN', category_id: 91, reporter_id: 1, reporter_name: 'Người báo tổng hợp', assignee_id: 20, assignee_name: agents[0].full_name,
      priority: 'P3', impact: 'individual', version: 3, owner_unit_id: 1, owner_unit_name: 'IT Mạng', routing_status: 'ASSIGNED',
      routing_permissions: { can_handle: false, can_attach: false, can_assign: false, can_route: false, can_read_internal: false },
      comments: [{ id: 1, message: 'Đội mạng đang kiểm tra kết nối.', visibility: 'public', author_name: agents[0].full_name }], history: [], attachments: [] };
    if (path === '/tickets') return send({ items: state.role === 'IT_AGENT' ? [ticket] : [], total: state.role === 'IT_AGENT' ? 1 : 0, page: 1, pageSize: 30, routing: true });
    if (path === '/tickets/900') return send(ticket);
    // Fail closed: never pass an unexpected fixture request to a local backend.
    return send({ error: { message: `Unexpected UI fixture endpoint ${req.method()} ${path}` } }, 501);
  });
  return state;
}

test('Admin saves actual memberships/category routes, reads them back and retains draft after a conflict', async ({ page }) => {
  const state = await fixtures(page);
  await page.goto('/routing');
  await page.getByRole('button', { name: 'Tạo bản nháp 4 nhóm ban đầu' }).click();
  await page.getByRole('checkbox', { name: 'IT Mạng: An · IT Mạng', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Ứng dụng / LMS: Bình · Ứng dụng', exact: true }).check();
  await page.getByRole('button', { name: 'Lưu cấu hình phân tuyến' }).click();
  await expect(page.getByRole('status')).toContainText('Đã lưu cấu hình');
  const write = state.writes.find(row => row.path === '/routing/settings');
  expect(write.body.version).toBe(7);
  expect(write.body.units[0].members).toEqual([{ user_id: 20, is_available: true }]);
  expect(write.body.routes.find(row => row.category_id === 91).unit_code).toBe('NETWORK');
  await page.reload();
  await expect(page.getByRole('checkbox', { name: 'IT Mạng: An · IT Mạng', exact: true })).toBeChecked();
  await page.screenshot({ path: 'docs/screenshots/ticket-routing-2026-11-25/admin-desktop.png', fullPage: true });
  state.nextConflict = true;
  await page.getByLabel('Tên nhóm NETWORK').fill('Nhóm mạng ca sáng');
  await page.getByRole('button', { name: 'Lưu cấu hình phân tuyến' }).click();
  await expect(page.getByRole('alert')).toContainText('Cấu hình đã thay đổi');
  await expect(page.getByLabel('Tên nhóm NETWORK')).toHaveValue('Nhóm mạng ca sáng');
  await expect(page.getByRole('button', { name: 'Lưu cấu hình phân tuyến' })).toBeDisabled();
});

test('Outside-team agent reads the shared queue without processing or admin controls', async ({ page }) => {
  const state = await fixtures(page, 'IT_AGENT');
  await page.goto('/kanban');
  await page.getByRole('button').filter({ hasText: 'Wifi phòng học mất kết nối' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('IT Mạng', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('combobox', { name: 'Trạng thái', exact: true })).toBeDisabled();
  for (const name of ['Xác nhận tiếp nhận', 'Gửi phản hồi', 'Tải ảnh lên', 'Lưu phân công']) await expect(dialog.getByRole('button', { name, exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Phân tuyến & đội hỗ trợ', exact: true })).toHaveCount(0);
  expect(state.writes).toHaveLength(0);
  await page.screenshot({ path: 'docs/screenshots/ticket-routing-2026-11-25/agent-read-only.png', fullPage: true });
});

for (const [width, height] of [[1440, 900], [768, 1024], [390, 844]]) {
  test(`Routing configuration stays usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height }); await fixtures(page);
    await page.goto('/routing');
    await page.getByRole('button', { name: 'Tạo bản nháp 4 nhóm ban đầu' }).click();
    await expect(page.getByRole('button', { name: 'Lưu cấu hình phân tuyến' })).toBeEnabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await page.screenshot({ path: `docs/screenshots/ticket-routing-2026-11-25/admin-${width}.png`, fullPage: true });
  });
}

test('Reporter can choose automatic category from the real creation screen', async ({ page }) => {
  await fixtures(page, 'END_USER'); await page.goto('/tickets/new');
  await expect(page.getByLabel('Danh mục *')).toHaveValue('auto');
  await expect(page.getByRole('option', { name: 'Tự động phân loại' })).toHaveCount(1);
  await expect(page.getByRole('link', { name: 'Phân tuyến & đội hỗ trợ', exact: true })).toHaveCount(0);
});
