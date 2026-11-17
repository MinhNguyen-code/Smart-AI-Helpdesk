import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { businessHoursConfig, localBusinessMinute } from './businessHours.js';

const source = path.resolve('server/monitoring/availability.jsonl');
let lines;
try { lines = (await readFile(source, 'utf8')).split(/\r?\n/).filter(Boolean); }
catch (error) { if (error.code !== 'ENOENT') throw error; lines = []; }
const samples = lines.map(line => { try { return JSON.parse(line); } catch { return null; } })
  .filter(row => row && Number.isFinite(Date.parse(row.at))).sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
const schedule = businessHoursConfig();
const compatibleSamples = samples.filter(row => row.monitorVersion === 2 && row.schedule === schedule.label);
const businessSamples = new Map();
for (const row of compatibleSamples) {
  const minute = localBusinessMinute(new Date(row.at), schedule);
  if (minute.business) businessSamples.set(minute.key, { day: minute.day,
    healthy: row.health === 200 && row.ready === 200 && row.web === 200 });
}
let expectedMinutes = 0;
if (compatibleSamples.length) {
  const start = Math.floor(Date.parse(compatibleSamples[0].at) / 60000) * 60000;
  const end = Math.floor(Date.parse(compatibleSamples.at(-1).at) / 60000) * 60000;
  for (let time = start; time <= end; time += 60000) if (localBusinessMinute(new Date(time), schedule).business) expectedMinutes++;
}
const observed = businessSamples.size;
const healthy = [...businessSamples.values()].filter(row => row.healthy).length;
const businessDays = new Set([...businessSamples.values()].map(row => row.day)).size;
const coveragePercent = expectedMinutes ? Math.round(observed / expectedMinutes * 10000) / 100 : 0;
const availabilityPercent = observed ? Math.round(healthy / observed * 10000) / 100 : null;
const sufficient = businessDays >= 10 && coveragePercent >= 95;
const result = { schedule: schedule.label, sampleCount: samples.length,
  acceptedSampleCount: compatibleSamples.length, excludedIncompatibleSamples: samples.length - compatibleSamples.length,
  businessDays, observedBusinessMinutes: observed, expectedBusinessMinutes: expectedMinutes,
  coveragePercent, availabilityPercent, targetPercent: 99,
  verdict: !sufficient ? 'NOT_VERIFIED' : availabilityPercent >= 99 ? 'PASS' : 'FAIL',
  criterion: 'At least 10 business days and 95% one-minute sample coverage of health, ready and web before a verdict' };
process.stdout.write(JSON.stringify(result) + '\n');
