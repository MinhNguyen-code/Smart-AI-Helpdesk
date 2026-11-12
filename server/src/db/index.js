import knex from 'knex';
import knexConfig from '../../../knexfile.js';
import config from '../config/index.js';

const environment = config.nodeEnv === 'test' ? 'test' : 'development';
const currentConfig = knexConfig[environment] || knexConfig.development;

export const db = knex(currentConfig);

/**
 * Check database connectivity and return status details.
 * Prevents throwing unhandled exceptions when MySQL server is unreachable.
 */
export async function checkDatabaseHealth() {
  const startTime = Date.now();
  try {
    // Run simple lightweight probe
    await db.raw('SELECT 1 AS alive');
    const latencyMs = Date.now() - startTime;

    // Verify target database
    const dbNameResult = await db.raw('SELECT DATABASE() AS currentDb');
    const currentDatabase = dbNameResult[0]?.[0]?.currentDb;

    return {
      connected: true,
      targetDatabase: currentDatabase,
      expectedDatabase: currentConfig.connection.database,
      isTargetVerified: currentDatabase === currentConfig.connection.database,
      latencyMs,
    };
  } catch (error) {
    return {
      connected: false,
      targetDatabase: currentConfig.connection.database,
      error: 'Database connection failed',
      code: error.code || 'UNKNOWN',
    };
  }
}

/**
 * Safely verify that the target database matches our intended development/testing database.
 * Prevents modifying production or unrelated local databases.
 */
export async function verifyTargetDatabase() {
  const health = await checkDatabaseHealth();
  if (!health.connected) {
    throw new Error(`Database is not reachable: ${health.error} (${health.code})`);
  }

  const allowedDatabases = ['smart_it_helpdesk_new_dev', 'smart_it_helpdesk_new_test'];
  if (!allowedDatabases.includes(health.targetDatabase)) {
    throw new Error(
      `SAFETY VIOLATION: Current database '${health.targetDatabase}' is not an authorized project database (${allowedDatabases.join(', ')}). Aborting operation to prevent data loss.`
    );
  }

  return health;
}

export default db;
