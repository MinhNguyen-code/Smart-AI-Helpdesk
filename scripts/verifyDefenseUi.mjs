import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

// Read-only browser checks. Every application route below uses the labelled preview.
const origin = process.env.CAPTURE_BASE_URL || 'http://127.0.0.1:5173';
const viewports = [
  { name: 'desktop-large', width: 1440, height: 900 },
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'tablet-wide', width: 950, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
];
const results = [];
const browser = await chromium.launch({ channel: 'msedge', headless: true });

async function noHorizontalOverflow(page, viewport, screen) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  assert.equal(overflow, false, `${viewport}: ${screen} overflows horizontally`);
  results.push(`${viewport}: ${screen}`);
}

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();

    await page.goto(`${origin}/login`);
    await page.locator('.login-content h2').waitFor();
    assert.equal(await page.getByRole('link', { name: /Tiếp tục với Google/i }).count(), 1);
    await noHorizontalOverflow(page, viewport.name, 'login');
    if (viewport.name === 'desktop-large') {
      const toggle = page.getByRole('button', { name: 'Xem bàn hỗ trợ 3D' });
      await toggle.click();
      await page.locator('.support-scene').waitFor();
      assert.equal(await page.getByRole('button', { name: 'Xem ticket mẫu' }).getAttribute('aria-pressed'), 'true');
      await page.getByRole('button', { name: 'Xem ticket mẫu' }).click();
      await page.locator('.saas-preview-ticket').waitFor();
      results.push(`${viewport.name}: optional Three.js toggle`);
    }

    await page.goto(`${origin}/tickets/new?preview=1`);
    await page.locator('.ticket-form').waitFor();
    assert.ok(await page.locator('.ticket-form [required]').count() >= 3);
    await noHorizontalOverflow(page, viewport.name, 'create-ticket');

    await page.goto(`${origin}/kanban?preview=1`);
    await page.locator('.ticket-card').first().waitFor();
    await noHorizontalOverflow(page, viewport.name, 'kanban');
    const firstCard = page.locator('.ticket-card').first();
    await firstCard.focus();
    await firstCard.click();
    await page.locator('dialog[open] .ticket-detail').waitFor();
    assert.ok(await page.locator('dialog[open] .sla-box').count() > 0);
    if (viewport.width <= 650) {
      const mobileSla = page.locator('dialog[open] .ticket-mobile-summary');
      assert.equal(await mobileSla.isVisible(), true);
      const dialogBox = await page.locator('dialog[open]').boundingBox();
      const slaBox = await mobileSla.boundingBox();
      assert.ok(slaBox.y - dialogBox.y < 300, 'Mobile SLA should appear near ticket title');
      const reply = page.locator('dialog[open]').getByRole('button', { name: 'Gửi phản hồi' });
      await reply.scrollIntoViewIfNeeded();
      const replyBox = await reply.boundingBox();
      assert.ok(replyBox && replyBox.y >= 0 && replyBox.y + replyBox.height <= viewport.height,
        'Mobile reply action should be reachable inside the dialog');
      results.push(`${viewport.name}: ticket reply reachable`);
    }
    await noHorizontalOverflow(page, viewport.name, 'ticket-detail');
    await page.locator('dialog[open]').getByRole('button', { name: 'Đóng' }).click();
    assert.equal(await page.locator('dialog[open]').count(), 0);
    assert.equal(await firstCard.evaluate(element => document.activeElement === element), true);
    results.push(`${viewport.name}: ticket dialog focus return`);

    await page.goto(`${origin}/dashboard?preview=1`);
    await page.locator('.kpis').waitFor();
    assert.equal(await page.locator('.kpis .panel').count(), 4);
    await noHorizontalOverflow(page, viewport.name, 'dashboard');
    if (viewport.name === 'desktop-large') {
      await page.locator('.date-filter input[type="date"]').nth(1).fill('2026-10-06');
      await page.waitForFunction(() => document.querySelector('.kpis .panel strong')?.textContent === '42');
      const counts = (await page.locator('.charts .panel').nth(1).locator('.legend > div > span:nth-child(2)').allTextContents())
        .map(value => Number.parseInt(value, 10));
      assert.deepEqual(counts, [4, 12, 17, 9]);
      assert.equal(counts.reduce((sum, value) => sum + value, 0), 42);
      results.push(`${viewport.name}: dashboard date filter consistency`);
    }

    await page.goto(`${origin}/rules?preview=1`);
    await page.locator('.rules-table').waitFor();
    await noHorizontalOverflow(page, viewport.name, 'rules-list');
    if (viewport.width <= 650) {
      const edit = page.locator('.rules-table button[aria-label^="Sửa "]').first();
      const box = await edit.boundingBox();
      assert.ok(box.width >= 44 && box.height >= 44, 'Rule edit touch target should be at least 44px');
      results.push(`${viewport.name}: rule touch target`);
    }
    const addRule = page.getByRole('button', { name: 'Thêm Quy Tắc Mới' });
    await addRule.focus();
    await addRule.click();
    await page.locator('dialog[open] .rule-form').waitFor();
    assert.equal(await page.locator('dialog[open] input[name="keyword"]').evaluate(element => document.activeElement === element), true);
    await noHorizontalOverflow(page, viewport.name, 'rule-dialog');
    await page.locator('dialog[open]').getByRole('button', { name: 'Đóng' }).click();
    assert.equal(await page.locator('dialog[open]').count(), 0);
    assert.equal(await addRule.evaluate(element => document.activeElement === element), true);
    results.push(`${viewport.name}: rule dialog focus return`);

    if (viewport.width <= 850) {
      const menu = page.getByRole('button', { name: 'Mở điều hướng' });
      await menu.click();
      assert.equal(await menu.getAttribute('aria-expanded'), 'true');
      assert.equal(await page.locator('#workspace-navigation').isVisible(), true);
      await page.getByRole('button', { name: 'Đóng điều hướng' }).click({ position: { x: viewport.width - 10, y: 100 } });
      assert.equal(await menu.getAttribute('aria-expanded'), 'false');
      results.push(`${viewport.name}: mobile navigation`);
    }
    await context.close();
  }
} finally {
  await browser.close();
}

process.stdout.write(`${JSON.stringify({ viewports: viewports.length, screenChecks: viewports.length * 7, checks: results.length, status: 'PASS', results })}\n`);
