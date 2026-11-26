import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: ['production-guard.spec.js', 'production-states.spec.js', 'ticket-pagination.spec.js', 'agent-queues.spec.js'],
  reporter: 'list',
  workers: 2,
  use: { baseURL: 'http://127.0.0.1:4173', browserName: 'chromium',
    channel: process.platform === 'win32' ? 'msedge' : undefined },
  webServer: { command: 'node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173/login', reuseExistingServer: false, timeout: 30000 },
});
