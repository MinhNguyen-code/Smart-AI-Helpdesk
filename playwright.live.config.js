import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'live-api.spec.js',
  timeout: 90000,
  retries: 0,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5174', browserName: 'chromium', channel: 'msedge' },
  webServer: [
    { command: 'node server/src/index.js', url: 'http://127.0.0.1:5001/api/v1/ready',
      env: { NODE_ENV: 'test', PORT: '5001', CLIENT_URL: 'http://127.0.0.1:5174' },
      reuseExistingServer: false, timeout: 30000 },
    { command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5174 --strictPort',
      url: 'http://127.0.0.1:5174/login',
      env: { VITE_API_BASE_URL: 'http://127.0.0.1:5001/api/v1' },
      reuseExistingServer: false, timeout: 30000 },
  ],
});
