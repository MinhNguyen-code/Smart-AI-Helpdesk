import { performance } from 'node:perf_hooks';
import { classifyPriority } from '../src/modules/ticketPolicy.js';

const rules = [
  { id: 1, keyword: 'sập hệ thống', priority: 'P1', is_active: true },
  { id: 2, keyword: 'mất mạng', priority: 'P1', is_active: true },
  { id: 3, keyword: 'lỗi đăng nhập', priority: 'P2', is_active: true },
  { id: 4, keyword: 'máy in', priority: 'P3', is_active: true },
];
const ticket = { title: 'Sập hệ thống quản lý điểm', description: 'Không thể truy cập từ sáng nay', impact: 'department' };
const iterations = 10000;
const timings = [];
for (let i = 0; i < iterations + 1000; i++) {
  const start = performance.now();
  const result = classifyPriority(ticket, rules);
  if (result.priority !== 'P1') throw new Error('Benchmark classification mismatch');
  if (i >= 1000) timings.push(performance.now() - start);
}
timings.sort((a, b) => a - b);
const percentile = p => Number(timings[Math.ceil(iterations * p) - 1].toFixed(3));
process.stdout.write(JSON.stringify({ operation: 'classifyPriority in-process', iterations,
  p50Ms: percentile(.5), p95Ms: percentile(.95), p99Ms: percentile(.99),
  targetMs: 500, caveat: 'No HTTP, MySQL, or concurrent load included' }) + '\n');
