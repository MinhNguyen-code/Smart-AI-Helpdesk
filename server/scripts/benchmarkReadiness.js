import { mkdir, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import os from 'node:os';

const origin = process.env.API_BENCHMARK_ORIGIN || 'http://127.0.0.1:5002';
const endpoint = new URL('/api/v1/ready', origin);
const percentile = (sorted, p) => Math.round(sorted[Math.ceil(sorted.length * p) - 1] * 10) / 10;
const scenarios = [];
async function probe() {
  const started = performance.now();
  try {
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(5000) });
    const result = await response.json();
    return { durationMs: performance.now() - started,
      ok: response.status === 200 && result.status === 'READY' && result.database?.connected === true && result.database?.isTargetVerified === true,
      status: response.status };
  } catch (error) { return { durationMs: performance.now() - started, ok: false, error: error.name }; }
}
for (const clients of [1, 4, 8]) {
  await Promise.all(Array.from({ length: clients }, probe));
  const samples = [];
  for (let round = 0; round < 40 / clients; round++) samples.push(...await Promise.all(Array.from({ length: clients }, probe)));
  const timings = samples.filter(sample => sample.ok).map(sample => sample.durationMs).sort((a, b) => a - b);
  const failed = samples.length - timings.length;
  scenarios.push({ clients, sampleCount: samples.length, p50Ms: timings.length ? percentile(timings, .5) : null,
    p95Ms: timings.length ? percentile(timings, .95) : null, p99Ms: timings.length ? percentile(timings, .99) : null,
    errorCount: failed, errorRatePercent: Math.round(failed / samples.length * 10000) / 100,
    statuses: [...new Set(samples.map(sample => sample.status ?? sample.error))] });
}
const evidence = { generatedAt: new Date().toISOString(), nodeVersion: process.version,
  platform: os.platform(), logicalCpus: os.cpus().length,
  memoryGiB: Math.round(os.totalmem() / 1073741824),
  kind: 'read-only production-mode Express /ready + real MySQL; no ticket API workload',
  method: 'One warmup per client; 40 requests per concurrency; nearest-rank percentiles', scenarios };
await mkdir('docs/benchmarks', { recursive: true });
await writeFile('docs/benchmarks/readiness-production.json', JSON.stringify(evidence, null, 2) + '\n');
process.stdout.write(JSON.stringify(evidence) + '\n');
if (scenarios.some(scenario => scenario.errorCount > 0)) process.exitCode = 1;
