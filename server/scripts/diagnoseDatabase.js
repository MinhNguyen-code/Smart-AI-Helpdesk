import knex from 'knex';
import configurations from '../../knexfile.js';
import request from 'supertest';
import app from '../src/app.js';
import { db } from '../src/db/index.js';

// Read-only diagnostics. No credentials, grant text or application records are printed.
try {
  for (const environment of ['development', 'test']) {
    const configuration = configurations[environment];
    console.log(JSON.stringify({ environment, host: configuration.connection.host,
      port: configuration.connection.port, user: configuration.connection.user || null,
      database: configuration.connection.database,
      passwordConfigured: Boolean(configuration.connection.password) }));
    if (!configuration.connection.user) {
      console.log(JSON.stringify({ environment, status: 'BLOCKED', code: 'DB_USER_MISSING' }));
      continue;
    }
    const connection = knex({ ...configuration, acquireConnectionTimeout: 6000 });
    try {
      const [identity] = await connection.raw('SELECT VERSION() AS version, DATABASE() AS selected_database, USER() AS login_identity, CURRENT_USER() AS matched_account');
      console.log(JSON.stringify({ environment, identity }));
      const [tables] = await connection.raw(
        'SELECT TABLE_NAME AS name, TABLE_TYPE AS type, TABLE_ROWS AS estimated_rows FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME',
        [configuration.connection.database]);
      console.log(JSON.stringify({ environment, tables, note: 'Row counts are estimates' }));
    } catch (error) {
      console.log(JSON.stringify({ environment, status: 'BLOCKED', code: error.code || 'CONNECTION_FAILED' }));
    } finally {
      await connection.destroy();
    }
  }
  for (const route of ['/health', '/ready']) {
    const response = await request(app).get(`/api/v1${route}`);
    console.log(JSON.stringify({ route, httpStatus: response.status, body: response.body }));
  }
} finally {
  await db.destroy();
}
