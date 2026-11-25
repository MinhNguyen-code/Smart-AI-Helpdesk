import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import { startSlaWorker } from '../../src/workers/slaWorker.js';
import { db } from '../../src/db/index.js';

test('SLA worker stop waits for the active check and prevents another tick', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  t.after(() => db.destroy());
  let finish;
  let calls = 0;
  const worker = startSlaWorker({
    check: async () => {
      calls++;
      return new Promise(resolve => { finish = resolve; });
    },
    logger: { log() {}, error() {} },
  });
  let stopped = false;
  const stop = worker.stop().then(() => { stopped = true; });
  await setImmediate();
  assert.equal(stopped, false);
  assert.equal(calls, 1);
  finish({ cursor: 0 });
  await stop;
  t.mock.timers.tick(120000);
  await setImmediate();
  assert.equal(calls, 1);
});

test('SLA worker retries failures with backoff and resets it after recovery', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  t.after(() => db.destroy());
  let calls = 0;
  const failures = [];
  const worker = startSlaWorker({
    check: async () => {
      calls++;
      if (calls !== 3) throw Object.assign(new Error('private diagnostic'), { code: 'TEST_UNAVAILABLE' });
      return { cursor: 0 };
    },
    logger: { log() {}, error(line) { failures.push(JSON.parse(line)); } },
  });
  try {
    await setImmediate();
    assert.equal(calls, 1);
    t.mock.timers.tick(999);
    await setImmediate();
    assert.equal(calls, 1);
    for (const delay of [1, 2000, 60000]) {
      t.mock.timers.tick(delay);
      await setImmediate();
    }
    assert.equal(calls, 4);
    assert.deepEqual(failures.map(row => row.retryInMs), [1000, 2000, 1000]);
    assert.ok(failures.every(row => row.code === 'TEST_UNAVAILABLE'));
    assert.ok(!JSON.stringify(failures).includes('private diagnostic'));
  } finally { await worker.stop(); }
});
