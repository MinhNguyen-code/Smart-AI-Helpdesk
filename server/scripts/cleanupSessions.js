import { db, verifyTargetDatabase } from '../src/db/index.js';
import { DatabaseSessionStore } from '../src/db/sessionStore.js';

const apply = process.argv.slice(2).length === 1 && process.argv[2] === '--apply';
if (process.argv.length > 2 && !apply) throw new Error('Usage: cleanupSessions.js [--apply]');

try {
  await verifyTargetDatabase();
  const cutoff = Date.now();
  const before = await db('sessions').where('expires', '<=', cutoff).count('* as count').first();
  if (!apply) {
    console.log(JSON.stringify({ mode: 'dry-run', expiredCount: Number(before.count) }));
  } else {
    const removed = await new DatabaseSessionStore(db).pruneExpired(cutoff);
    const after = await db('sessions').where('expires', '<=', cutoff).count('* as count').first();
    console.log(JSON.stringify({ mode: 'apply', expiredCount: Number(before.count), removed,
      remainingExpiredCount: Number(after.count) }));
  }
} catch (error) {
  console.error(JSON.stringify({ event: 'session_cleanup_failed', code: error.code || 'SESSION_CLEANUP_FAILED' }));
  process.exitCode = 1;
} finally {
  await db.destroy();
}
