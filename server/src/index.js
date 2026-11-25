import app from './app.js';
import config from './config/index.js';
import { db, checkDatabaseHealth } from './db/index.js';
import { startSlaWorker } from './workers/slaWorker.js';

let slaWorker;
let startupCheck;
let stopping = false;

const server = app.listen(config.port, () => {
  if (stopping) return;
  console.log(`====================================================`);
  console.log(`🚀 Smart IT Helpdesk Server started on port ${config.port}`);
  console.log(`📡 Environment: ${config.nodeEnv}`);
  console.log(`🔗 API Base: http://localhost:${config.port}/api/v1`);
  console.log(`🌐 Client Origin: ${config.clientUrl}`);
  console.log(`====================================================`);

  if (process.argv.includes('--with-sla-worker')) {
    slaWorker = startSlaWorker();
    console.log('SLA worker started.');
  }
  startupCheck = logDatabaseHealth();
});

async function logDatabaseHealth() {
  const dbHealth = await checkDatabaseHealth();
  if (dbHealth.connected) {
    console.log(`✅ MySQL connected: Database '${dbHealth.targetDatabase}' (Latency: ${dbHealth.latencyMs}ms)`);
  } else {
    console.warn(`⚠️ MySQL is NOT currently connected: ${dbHealth.error}`);
    console.warn(`💡 Note: Database-dependent endpoints will return 503 until MySQL is available.`);
  }
}

// Graceful shutdown handling
async function handleShutdown(signal) {
  if (stopping) return;
  stopping = true;
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  const timeout = setTimeout(() => {
    console.error('Forced shutdown due to timeout.');
    process.exit(1);
  }, 10000);

  try {
    const httpClosed = new Promise(resolve => server.close(() => resolve()));
    await Promise.all([httpClosed, slaWorker?.stop(), startupCheck]);
    await db.destroy();
    console.log('HTTP server and database connection pool closed.');
  } catch (error) {
    console.error('Shutdown failed:', error.code || 'SHUTDOWN_FAILURE');
    process.exitCode = 1;
  } finally {
    clearTimeout(timeout);
  }
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
