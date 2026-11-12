import app from './app.js';
import config from './config/index.js';
import { db, checkDatabaseHealth } from './db/index.js';

const server = app.listen(config.port, async () => {
  console.log(`====================================================`);
  console.log(`🚀 Smart IT Helpdesk Server started on port ${config.port}`);
  console.log(`📡 Environment: ${config.nodeEnv}`);
  console.log(`🔗 API Base: http://localhost:${config.port}/api/v1`);
  console.log(`🌐 Client Origin: ${config.clientUrl}`);
  console.log(`====================================================`);

  // Check database health on startup
  const dbHealth = await checkDatabaseHealth();
  if (dbHealth.connected) {
    console.log(`✅ MySQL connected: Database '${dbHealth.targetDatabase}' (Latency: ${dbHealth.latencyMs}ms)`);
  } else {
    console.warn(`⚠️ MySQL is NOT currently connected: ${dbHealth.error}`);
    console.warn(`💡 Note: Database-dependent endpoints will return 503 until MySQL is available.`);
  }
});

// Graceful shutdown handling
function handleShutdown(signal) {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    console.log('HTTP server closed.');
    try {
      await db.destroy();
      console.log('Database connection pool destroyed.');
    } catch (err) {
      console.error('Error closing database pool:', err.message);
    }
    process.exit(0);
  });

  // Force shutdown after timeout
  setTimeout(() => {
    console.error('Forced shutdown due to timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
