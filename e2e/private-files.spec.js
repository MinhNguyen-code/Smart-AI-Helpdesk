import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, unlink, rmdir } from 'node:fs/promises';
import path from 'node:path';

test('Vite blocks private backend files, renamed backups and raw/URL imports without authentication', async ({ request }) => {
  const token = `browser-canary-${randomUUID()}`;
  const folder = path.resolve('server/private-uploads', token);
  const file = path.join(folder, 'environment.before');
  const envFile = path.resolve(`.env.${token}`);
  await mkdir(folder, { recursive: true });
  await writeFile(file, 'SYNTHETIC_PRIVATE_CANARY_NO_SECRETS=1\n', { flag: 'wx' });
  await writeFile(envFile, 'SYNTHETIC_ENV_CANARY_NO_SECRETS=1\n', { flag: 'wx' });
  try {
    const url = `/server/private-uploads/${token}/environment.before`;
    for (const suffix of ['', '?raw', '?url', '?import']) {
      const response = await request.get(url + suffix);
      expect(response.status(), url + suffix).toBe(403);
      expect(await response.text()).not.toContain('SYNTHETIC_PRIVATE_CANARY_NO_SECRETS=1');
    }
    expect((await request.get('/@fs/' + file.replaceAll('\\', '/'))).status()).toBe(403);
    expect((await request.head('/' + path.basename(envFile))).status()).toBe(403);
    expect((await request.head('/server/src/app.js')).status()).toBe(403);
    expect((await request.get('/login')).status()).toBe(200);
  } finally {
    await unlink(envFile);
    await unlink(file);
    await rmdir(folder); // Only this test's empty, UUID-named directory.
  }
});
