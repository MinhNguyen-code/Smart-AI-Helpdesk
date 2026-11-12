import dotenv from 'dotenv';
import { assertTarget, assertIdentity } from './server/src/db/targetPolicy.js';
dotenv.config();

/**
 * @type { Object.<string, import("knex").Knex.Config> }
 */
const configurations = {
  development: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'smart_it_helpdesk_new_dev',
      charset: 'utf8mb4',
      timezone: 'Z',
      connectTimeout: 5000,
    },
    pool: {
      min: 0,
      max: 10,
    },
    migrations: {
      directory: './server/migrations',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: './server/seeds',
    },
  },

  test: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_TEST_HOST || process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_TEST_PORT || process.env.DB_PORT) || 3306,
      user: process.env.DB_TEST_USER,
      password: process.env.DB_TEST_PASSWORD || '',
      database: process.env.DB_TEST_NAME || 'smart_it_helpdesk_new_test',
      charset: 'utf8mb4',
      timezone: 'Z',
      connectTimeout: 5000,
    },
    pool: {
      min: 0,
      max: 5,
    },
    migrations: {
      directory: './server/migrations',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: './server/seeds',
    },
  },
};

export function createDatabaseConfig(environment, purpose = 'runtime') {
  const base = configurations[environment];
  if (!base) throw new Error('Unsupported database environment');
  const connection = { ...base.connection };
  if (purpose === 'migration') {
    const prefix = environment === 'test' ? 'DB_TEST_MIGRATION' : 'DB_MIGRATION';
    connection.user = process.env[`${prefix}_USER`];
    connection.password = process.env[`${prefix}_PASSWORD`] || '';
  }
  return {
    ...base,
    connection,
    acquireConnectionTimeout: 6000,
    pool: {
      ...base.pool,
      afterCreate(client, done) {
        try { assertTarget(environment, purpose, connection); }
        catch (failure) { return done(failure, client); }
        client.query('SELECT DATABASE() AS selected_database, CURRENT_USER() AS matched_account', (error, rows) => {
          if (error) return done(error, client);
          try { assertIdentity(environment, purpose, rows[0]); done(null, client); }
          catch (failure) { done(failure, client); }
        });
      },
    },
  };
}

export function validateDatabaseConfig(environment, purpose, configuration) {
  assertTarget(environment, purpose, configuration.connection);
}

export default {
  development: createDatabaseConfig('development'),
  test: createDatabaseConfig('test'),
};
