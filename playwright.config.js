import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testIgnore: ['live-api.spec.js', 'production-guard.spec.js', 'production-benchmark.spec.js', 'production-states.spec.js'],
  timeout: 30000,
  retries: 0,
  reporter: 'list',
  use: { baseURL: 'http://localhost:5173', browserName: 'chromium', channel: 'msedge' },
  webServer: { command: 'npm.cmd run dev', url: 'http://localhost:5173/login', reuseExistingServer: true, timeout: 30000 },
});
