import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

test('seven wireframe routes render and Rules dialog works in clearly labeled preview', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await mkdir('docs/screenshots', { recursive: true });
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Đăng nhập hệ thống' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Tiếp tục với Google/ })).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/day7-01-login.png' });

  await page.goto('/tickets/new?preview=1');
  await expect(page.getByRole('heading', { name: 'Tạo Yêu Cầu Hỗ Trợ Mới' })).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/day7-02-create-ticket.png' });

  await page.goto('/kanban?preview=1');
  await expect(page.getByRole('heading', { name: 'Bảng Kanban Tương tác' })).toBeVisible();
  await expect(page.getByText('Chế độ xem giao diện · Dữ liệu mẫu')).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/day7-03-kanban.png' });
  await page.getByRole('button', { name: /Sập hệ thống quản lý điểm/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/day7-04-ticket-detail.png' });

  await page.goto('/dashboard?preview=1');
  await expect(page.getByRole('heading', { name: 'Báo Cáo Hiệu Suất' })).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/day7-05-dashboard.png' });

  await page.goto('/rules?preview=1');
  await expect(page.getByRole('heading', { name: 'Cấu hình Rule-Based Engine' })).toBeVisible();
  await expect(page.getByText('server sập')).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/day7-06-rules-list.png' });
  await page.getByRole('button', { name: 'Thêm Quy Tắc Mới' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/day7-07-rule-dialog.png' });
});

test('mobile Rules dialog stays usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/rules?preview=1');
  await page.getByRole('button', { name: 'Thêm Quy Tắc Mới' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('textbox', { name: 'Từ khóa' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Lưu quy tắc' })).toBeVisible();
});

test('Rules page stays within viewport at all required widths', async ({ page }) => {
  await mkdir('docs/screenshots', { recursive: true });
  for (const [width, height] of [[1440, 900], [1280, 800], [950, 900], [768, 1024], [390, 844], [375, 812]]) {
    await page.setViewportSize({ width, height });
    await page.goto('/rules?preview=1');
    await expect(page.getByRole('heading', { name: 'Cấu hình Rule-Based Engine' })).toBeVisible();
    const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(pageWidth, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(width + 2);
    await page.screenshot({ path: `docs/screenshots/day7-rules-${width}.png` });
  }
});

test('core screens avoid page-level horizontal overflow at required widths', async ({ page }) => {
  test.setTimeout(90000);
  const routes = [
    ['/login', 'Đăng nhập hệ thống'],
    ['/tickets/new?preview=1', 'Tạo Yêu Cầu Hỗ Trợ Mới'],
    ['/kanban?preview=1', 'Bảng Kanban Tương tác'],
    ['/dashboard?preview=1', 'Báo Cáo Hiệu Suất'],
  ];
  for (const [width, height] of [[1440, 900], [1280, 800], [950, 900], [768, 1024], [390, 844], [375, 812]]) {
    await page.setViewportSize({ width, height });
    for (const [route, title] of routes) {
      await page.goto(route);
      await expect(page.getByRole('heading', { name: title })).toBeVisible();
      const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(pageWidth, `${route} overflows at ${width}px`).toBeLessThanOrEqual(width + 2);
    }
  }
});

test('user management preview adds an account without calling production authentication', async ({ page }) => {
  await page.goto('/users?preview=1');
  await expect(page.getByRole('heading', { name: 'Tài khoản và Vai trò' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Email' }).fill('new@example.invalid');
  await page.getByRole('combobox', { name: 'Vai trò' }).first().selectOption('IT_AGENT');
  await page.getByRole('button', { name: 'Phê duyệt' }).click();
  await expect(page.getByText('new@example.invalid')).toBeVisible();
  await expect(page.getByText('Đã thêm trong phiên mẫu.')).toBeVisible();
});

test('Kanban priority filter and ticket image drop zone remain usable in preview', async ({ page }) => {
  await page.goto('/kanban?preview=1');
  await page.getByRole('combobox', { name: 'Lọc mức độ ưu tiên' }).selectOption('P1');
  const cards = page.locator('.ticket-card');
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText('P1');
  await page.getByRole('combobox', { name: 'Lọc mức độ ưu tiên' }).selectOption('all');
  await expect(cards).toHaveCount(6);

  await page.goto('/tickets/new?preview=1');
  await page.locator('.upload-dropzone').evaluate(element => {
    const transfer = new DataTransfer();
    transfer.items.add(new File(['image'], 'proof.png', { type: 'image/png' }));
    element.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }));
  });
  await expect(page.getByText('proof.png')).toBeVisible();
  await page.getByRole('button', { name: 'Bỏ ảnh' }).click();
  await expect(page.getByText('proof.png')).toHaveCount(0);
  await page.locator('.upload-dropzone').evaluate(element => {
    const transfer = new DataTransfer();
    transfer.items.add(new File(['text'], 'invalid.txt', { type: 'text/plain' }));
    element.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }));
  });
  await expect(page.getByRole('alert')).toContainText('Chọn ảnh PNG');
});
