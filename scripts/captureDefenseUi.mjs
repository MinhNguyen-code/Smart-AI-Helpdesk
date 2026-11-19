import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

// Read-only visual capture. Every route uses the explicitly labelled development preview.
const output = path.resolve(process.argv[2] || 'docs/screenshots/defense-ui/current');
const baseURL = process.env.CAPTURE_BASE_URL || 'http://127.0.0.1:5173';
if (existsSync(output)) throw new Error(`Capture directory already exists: ${output}`);
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const sizes = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];
const results = [];

try {
  for (const size of sizes) {
    const folder = path.join(output, size.name);
    await mkdir(folder, { recursive: true });
    const context = await browser.newContext({
      viewport: { width: size.width, height: size.height },
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    const capture = async (name, route, selector) => {
      await page.goto(`${baseURL}${route}`);
      await page.locator(selector).first().waitFor();
      const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      results.push({ viewport: size.name, screen: name, horizontalOverflow });
      await page.screenshot({ path: path.join(folder, `${name}.png`), fullPage: size.name === 'mobile' });
    };

    await capture('01-login', '/login', '.login-content h2');
    await capture('02-create-ticket', '/tickets/new?preview=1', '.ticket-form');
    await capture('03-kanban', '/kanban?preview=1', '.ticket-card');
    await page.locator('.ticket-card').first().click();
    await page.locator('dialog[open] .ticket-detail').waitFor();
    await page.locator('dialog[open] .ticket-progress').waitFor();
    await page.screenshot({ path: path.join(folder, '04-ticket-detail.png') });
    await capture('05-dashboard', '/dashboard?preview=1', '.kpis');
    await capture('06-rules-list', '/rules?preview=1', '.rules-table');
    await page.getByRole('button', { name: /Thêm Quy Tắc Mới/i }).click();
    await page.locator('dialog[open] .rule-form').waitFor();
    await page.screenshot({ path: path.join(folder, '07-rule-dialog.png') });
    await context.close();
  }
} finally {
  await browser.close();
}

process.stdout.write(`${JSON.stringify({ output, results })}\n`);
