import path from 'node:path';

export function availabilityLogPath(env = process.env) {
  const name = env.MONITOR_LOG_FILE || 'availability.jsonl';
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*\.jsonl$/.test(name)) throw new Error('Invalid monitoring log filename');
  return path.resolve('server/monitoring', name);
}
