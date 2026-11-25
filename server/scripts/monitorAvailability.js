import 'dotenv/config';
import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { businessHoursConfig, localBusinessMinute } from './businessHours.js';
import { availabilityLogPath } from './availabilityLog.js';

const output = availabilityLogPath();
const origin = process.env.MONITOR_ORIGIN || 'http://127.0.0.1:5000';
const webOrigin = process.env.MONITOR_WEB_ORIGIN || 'http://localhost:5173';
const intervalMs = Math.max(10000, Number(process.env.MONITOR_INTERVAL_SECONDS || 60) * 1000);
let stopped = false;
const schedule = businessHoursConfig();

async function sample() {
  const at = new Date();
  const start = performance.now();
  const result = { at: at.toISOString(), monitorVersion: 2, schedule: schedule.label,
    businessHours: localBusinessMinute(at, schedule).business, health: null,
    ready: null, web: null, latencyMs: null };
  for (const [field, base, route] of [['health', origin, '/api/v1/health'],
    ['ready', origin, '/api/v1/ready'], ['web', webOrigin, '/login']]) {
    try {
      const response = await fetch(new URL(route, base), { signal: AbortSignal.timeout(5000) });
      result[field] = response.status;
    } catch { result[field] = 0; }
  }
  result.latencyMs = Math.round(performance.now() - start);
  await mkdir(path.dirname(output), { recursive: true });
  await appendFile(output, JSON.stringify(result) + '\n', { encoding: 'utf8' });
  process.stdout.write(JSON.stringify(result) + '\n');
}

process.on('SIGINT', () => { stopped = true; });
process.on('SIGTERM', () => { stopped = true; });
while (!stopped) {
  await sample();
  if (process.argv.includes('--once')) break;
  await new Promise(resolve => setTimeout(resolve, intervalMs));
}
