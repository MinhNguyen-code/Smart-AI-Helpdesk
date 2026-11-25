import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { availabilityLogPath } from '../../scripts/availabilityLog.js';

test('Availability campaigns retain the default and keep selected logs inside monitoring', () => {
  assert.equal(availabilityLogPath({}), path.resolve('server/monitoring/availability.jsonl'));
  assert.equal(availabilityLogPath({ MONITOR_LOG_FILE: 'availability-20261125.jsonl' }), path.resolve('server/monitoring/availability-20261125.jsonl'));
  for (const name of ['../old.jsonl', '/tmp/out.jsonl', 'C:\\out.jsonl', '.env', 'sample.log', 'folder/name.jsonl']) {
    assert.throws(() => availabilityLogPath({ MONITOR_LOG_FILE: name }), /Invalid monitoring log filename/);
  }
});
