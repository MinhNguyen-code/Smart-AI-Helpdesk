import { defineConfig } from '@playwright/test';

// UI contract only: every API request is intercepted by synthetic fixtures.
// Does not launch a backend or connect to any database/Google account.
export default defineConfig({
  testDir: './e2e', testMatch: 'routing.contract.spec.js', workers: 1, retries: 0,
  use: { baseURL: 'http://127.0.0.1:5188', channel: process.platform === 'win32' ? 'msedge' : undefined,
    headless: true, viewport: { width: 1440, height: 900 } },
  webServer: { command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5188 --strictPort', url: 'http://127.0.0.1:5188', reuseExistingServer: false,
    env: { VITE_API_BASE_URL: '/api/v1' }, stdout: 'ignore', stderr: 'pipe' },
});
