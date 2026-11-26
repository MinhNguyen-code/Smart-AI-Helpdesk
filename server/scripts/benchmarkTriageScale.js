import { performance } from 'node:perf_hooks';
import { classifyPriority } from '../src/modules/ticketPolicy.js';

// In-process scale check only. It does not exercise Express, MySQL or concurrent requests.
const rules = Array.from({ length: 499 }, (_, index) => ({
  id: index + 1,
  keyword: `loi thiet bi ${index + 1}`,
  priority: 'P2',
  is_active: true,
}));
rules.push({ id: 500, keyword: 'mất mạng', priority: 'P1', is_active: true });

const filler = 'he thong van hoat dong binh thuong ';
const description = `${filler.repeat(Math.ceil(20_000 / filler.length)).slice(0, 20_000)} mất mạng`;
const ticket = { title: 'Báo sự cố', description, impact: 'individual' };
const warmup = 20;
const iterations = 100;
const timings = [];

for (let index = 0; index < warmup + iterations; index += 1) {
  const start = performance.now();
  const result = classifyPriority(ticket, rules);
  if (result.priority !== 'P1' || result.evidence.matches[0]?.id !== 500) {
    throw new Error('Benchmark classification mismatch');
  }
  if (index >= warmup) timings.push(performance.now() - start);
}

timings.sort((a, b) => a - b);
const percentile = fraction => Number(timings[Math.ceil(timings.length * fraction) - 1].toFixed(3));
process.stdout.write(`${JSON.stringify({
  operation: 'classifyPriority in-process, scale fixture',
  node: process.version,
  ruleCount: rules.length,
  descriptionCharacters: description.length,
  warmup,
  iterations,
  p50Ms: percentile(0.5),
  p95Ms: percentile(0.95),
  p99Ms: percentile(0.99),
  targetMs: 500,
  caveat: 'Synthetic fixture; no HTTP, MySQL, or concurrent load included',
})}\n`);
