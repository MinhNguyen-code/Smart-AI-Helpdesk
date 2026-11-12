import knex from 'knex';
import { createDatabaseConfig, validateDatabaseConfig } from '../../knexfile.js';
import { assertIdentity } from '../src/db/targetPolicy.js';

const [operation, environment] = process.argv.slice(2);
if (!['migrate', 'seed', 'check'].includes(operation) || !['development', 'test'].includes(environment)) {
  throw new Error('Usage: databaseCommand.js migrate|seed|check development|test');
}
const purpose = operation === 'migrate' ? 'migration' : 'runtime';
const configuration = createDatabaseConfig(environment, purpose);
validateDatabaseConfig(environment, purpose, configuration);
const db = knex(configuration);
try {
  const [rows] = await db.raw('SELECT VERSION() AS version, DATABASE() AS selected_database, CURRENT_USER() AS matched_account');
  assertIdentity(environment, purpose, rows[0]);
  console.log(JSON.stringify(rows[0]));
  if (operation === 'migrate') await db.migrate.latest();
  if (operation === 'seed') await db.seed.run();
} catch (error) {
  console.error(error.code || 'DATABASE_COMMAND_FAILED');
  process.exitCode = 1;
} finally {
  await db.destroy();
}
