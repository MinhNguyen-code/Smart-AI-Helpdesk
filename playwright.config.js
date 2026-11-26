import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: ['wireframe.spec.js', 'design-review.spec.js', 'private-files.spec.js'],
  timeout: 30000,
  retries: 0,
  reporter: 'list',
  workers: 2,
  use: { baseURL: 'http://127.0.0.1:5187', browserName: 'chromium',
    channel: process.platform === 'win32' ? 'msedge' : undefined },
  webServer: { command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5187 --strictPort',
    url: 'http://127.0.0.1:5187/login', reuseExistingServer: false, timeout: 30000,
    env: { VITE_API_BASE_URL: '/api/v1' } },
});
