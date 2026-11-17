import test from 'node:test';
import assert from 'node:assert/strict';
import { businessHoursConfig, localBusinessMinute } from '../../scripts/businessHours.js';

test('monitoring defaults to the reporting timezone in Codex.md', () => {
  const schedule = businessHoursConfig({});
  assert.equal(schedule.timeZone, 'Asia/Ho_Chi_Minh');
  assert.equal(localBusinessMinute(new Date('2026-11-17T01:00:00Z'), schedule).business, true);
  assert.equal(localBusinessMinute(new Date('2026-11-17T10:00:00Z'), schedule).business, false);
  assert.equal(localBusinessMinute(new Date('2026-11-15T03:00:00Z'), schedule).business, false);
});

test('monitoring accepts a reviewed schedule and rejects invalid hours', () => {
  const schedule = businessHoursConfig({ BUSINESS_TIMEZONE: 'Asia/Ho_Chi_Minh', BUSINESS_START_HOUR: '9', BUSINESS_END_HOUR: '18' });
  assert.equal(localBusinessMinute(new Date('2026-11-17T01:00:00Z'), schedule).business, false);
  assert.equal(localBusinessMinute(new Date('2026-11-17T02:00:00Z'), schedule).business, true);
  assert.throws(() => businessHoursConfig({ BUSINESS_START_HOUR: '18', BUSINESS_END_HOUR: '9' }));
  assert.throws(() => businessHoursConfig({ BUSINESS_TIMEZONE: 'Invalid/Zone' }));
});
