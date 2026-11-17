import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const folder = 'docs/screenshots/design-review';
const screens = [
  ['01-login', '/login', 'Đăng nhập hệ thống'],
  ['02-create-ticket', '/tickets/new?preview=1', 'Tạo Yêu Cầu Hỗ Trợ Mới'],
  ['03-kanban', '/kanban?preview=1', 'Bảng Kanban Tương tác'],
  ['05-dashboard', '/dashboard?preview=1', 'Báo Cáo Hiệu Suất'],
  ['06-rules-list', '/rules?preview=1', 'Cấu hình Rule-Based Engine'],
];

async function capture(page, size) {
  await mkdir(`${folder}/${size}`, { recursive: true });
  for (const [name, route, heading] of screens) {
    await page.goto(route);
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `${name} overflows ${size}`).toBeLessThanOrEqual((size === 'mobile' ? 390 : 1440) + 2);
    if (name === '01-login' && size === 'desktop') {
      await page.locator('.scene-card canvas').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    }
    await page.screenshot({ path: `${folder}/${size}/${name}.png`, fullPage: size === 'mobile' });
  }
  await page.goto('/kanban?preview=1');
  await page.getByRole('button', { name: /Sập hệ thống quản lý điểm/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.screenshot({ path: `${folder}/${size}/04-ticket-detail.png` });
  if (size === 'mobile') {
    await page.getByRole('dialog').locator('.sla-box').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${folder}/${size}/04-ticket-detail-sla.png` });
  }
  await page.getByRole('dialog').getByRole('button', { name: 'Đóng' }).click();
  await page.goto('/rules?preview=1');
  await page.getByRole('button', { name: 'Thêm Quy Tắc Mới' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.screenshot({ path: `${folder}/${size}/07-rule-dialog.png` });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

test('capture and check all seven wireframe screens at desktop width', async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await capture(page, 'desktop');
});

test('mobile layout, keyboard navigation and ticket validation remain usable', async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, 'mobile');

  await page.goto('/kanban?preview=1');
  await page.keyboard.press('Tab');
  if (await page.evaluate(() => document.activeElement === document.body)) await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
  await page.getByRole('button', { name: 'Mở điều hướng' }).click();
  await expect(page.getByRole('button', { name: 'Mở điều hướng' })).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('button', { name: 'Đóng điều hướng' }).click();
  await expect(page.getByRole('button', { name: 'Mở điều hướng' })).toHaveAttribute('aria-expanded', 'false');

  await page.goto('/tickets/new?preview=1');
  await page.getByRole('textbox', { name: 'Tiêu đề sự cố *' }).fill('   ');
  await page.getByRole('combobox', { name: 'Danh mục *' }).selectOption('1');
  await page.getByRole('textbox', { name: 'Mô tả chi tiết *' }).fill('Sự cố thử nghiệm');
  await page.getByRole('button', { name: 'Gửi yêu cầu' }).click();
  await expect(page.getByRole('alert')).toContainText('Nhập tiêu đề');
  await expect(page.getByRole('heading', { name: 'Tạo Yêu Cầu Hỗ Trợ Mới' })).toBeVisible();
});

test('Login uses the static illustration when reduced motion is requested', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/login');
  await expect(page.locator('.scene-static')).toBeVisible();
  await expect(page.locator('.scene-card canvas')).toHaveCount(0);
});

test('ticket and Rules dialogs keep keyboard focus inside and restore the opener', async ({ page }) => {
  await page.goto('/kanban?preview=1');
  const ticket = page.getByRole('button', { name: /Sập hệ thống quản lý điểm/ });
  await ticket.focus();
  await ticket.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Đóng' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(ticket).toBeFocused();

  await page.goto('/rules?preview=1');
  const add = page.getByRole('button', { name: 'Thêm Quy Tắc Mới' });
  await add.focus();
  await add.press('Enter');
  await expect(page.getByRole('dialog').getByRole('textbox', { name: 'Từ khóa' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(add).toBeFocused();
});
