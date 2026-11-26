import { test as base, expect } from '@playwright/test';

// Preview/login checks never reach a live API or create a real session.
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route('**/api/v1/**', route => route.fulfill({ status: 401, contentType: 'application/json',
      body: JSON.stringify({ error: { message: 'Synthetic unauthenticated preview' } }) }));
    await use(page);
  },
});
export { expect };
