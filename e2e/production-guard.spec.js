import { test, expect } from '@playwright/test';

test('production build never exposes sample Admin screens through preview query', async ({ page }) => {
  for (const route of ['/kanban', '/rules', '/dashboard', '/users']) {
    await page.goto(`${route}?preview=1`);
    await expect(page.getByRole('heading', { name: 'Đăng nhập hệ thống' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Xem giao diện mẫu/ })).toHaveCount(0);
    await expect(page.locator('.preview-bar')).toHaveCount(0);
  }
});
