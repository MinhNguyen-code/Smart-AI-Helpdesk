import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import os from 'node:os';

const output = 'docs/benchmarks/kanban-production-fixture.json';
const screenshotDir = 'docs/screenshots/acceptance-production';
const percentile = (sorted, p) => Math.round(sorted[Math.ceil(sorted.length * p) - 1]);

function tickets(total) {
  return Array.from({ length: 30 }, (_, index) => ({
    id: index + 1, ticket_code: `BENCH-${String(index + 1).padStart(4, '0')}`,
    title: `Sự cố kiểm thử ${index + 1}`, reporter_name: 'Tài khoản kiểm thử',
    reporter_id: 1, category_id: 1, priority: `P${index % 4 + 1}`,
    status: ['OPEN', 'IN_PROGRESS', 'RESOLVED'][index % 3], version: 1,
    resolution_deadline_at: new Date(Date.now() + (index + 1) * 3600000).toISOString(),
  }));
}

test('production Kanban measures first-page rendering with controlled clients', async ({ browser }) => {
  await mkdir('docs/benchmarks', { recursive: true });
  await mkdir(screenshotDir, { recursive: true });
  const scenarios = [
    { totalTickets: 30, clients: 1 },
    { totalTickets: 300, clients: 4 },
    { totalTickets: 3000, clients: 8 },
  ];
  const results = [];
  for (const scenario of scenarios) {
    const contexts = [];
    const pages = [];
    const errors = [];
    const items = tickets(scenario.totalTickets);
    try {
      for (let i = 0; i < scenario.clients; i++) {
        const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        contexts.push(context);
        await context.route('**/api/v1/**', async route => {
          const path = new URL(route.request().url()).pathname;
          const payload = path.endsWith('/auth/me') ? { user: { id: 1, role: 'IT_AGENT', full_name: 'Benchmark Agent' } }
            : path.endsWith('/tickets') ? { items, total: scenario.totalTickets, page: 1, pageSize: 30 }
              : path.endsWith('/categories') ? [{ id: 1, name: 'Hỗ trợ CNTT' }]
                : path.endsWith('/agents') ? []
                  : path.endsWith('/notifications') ? { items: [], unreadCount: 0 }
                    : null;
          if (payload === null) errors.push(`unexpected API path: ${path}`);
          await route.fulfill({ status: payload === null ? 500 : 200,
            contentType: 'application/json', body: JSON.stringify(payload ?? { error: { message: 'Unexpected benchmark route' } }),
            headers: { 'Access-Control-Allow-Origin': 'http://127.0.0.1:4173', 'Access-Control-Allow-Credentials': 'true' } });
        });
        const page = await context.newPage();
        page.on('pageerror', error => errors.push(error.name));
        pages.push(page);
      }
      const navigate = async page => {
        const started = performance.now();
        await page.goto('/kanban', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('.ticket-card')).toHaveCount(30);
        return performance.now() - started;
      };
      await Promise.all(pages.map(navigate)); // warm browser caches and chunks
      const timings = [];
      const rounds = Math.ceil(40 / scenario.clients);
      for (let round = 0; round < rounds; round++) {
        const settled = await Promise.allSettled(pages.map(navigate));
        settled.forEach(item => item.status === 'fulfilled' ? timings.push(item.value) : errors.push(String(item.reason)));
      }
      timings.sort((a, b) => a - b);
      if (scenario.clients === 1 || scenario.clients === 8) {
        await pages[0].screenshot({ path: `${screenshotDir}/kanban-${scenario.totalTickets}-total-${scenario.clients}-clients.png` });
      }
      const attempted = rounds * scenario.clients;
      results.push({ ...scenario, renderedCards: 30, attemptedNavigations: attempted, sampleCount: timings.length,
        p50Ms: percentile(timings, .5), p95Ms: percentile(timings, .95), p99Ms: percentile(timings, .99),
        navigationFailures: attempted - timings.length, diagnosticErrors: errors.length,
        errorRatePercent: Math.round((attempted - timings.length) / attempted * 10000) / 100 });
      expect(errors, `benchmark errors for ${scenario.clients} clients`).toEqual([]);
    } finally { for (const context of contexts) await context.close(); }
  }
  const evidence = { generatedAt: new Date().toISOString(), nodeVersion: process.version,
    browserVersion: browser.version(), platform: os.platform(), logicalCpus: os.cpus().length,
    memoryGiB: Math.round(os.totalmem() / 1073741824),
    kind: 'production Vite bundle + Edge; isolated Playwright API fixture; no MySQL or Google session',
    method: 'Each client warms once, then 40 or more page navigations per scenario; time to 30 rendered cards; nearest-rank percentiles',
    targetP95Ms: 2000, scenarios: results };
  await writeFile(output, JSON.stringify(evidence, null, 2) + '\n');
  process.stdout.write(JSON.stringify(evidence) + '\n');
});
