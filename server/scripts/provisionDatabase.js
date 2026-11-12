import { readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

const source = readFileSync('.env', 'utf8');
const environment = dotenv.parse(source);
const schemas = ['smart_it_helpdesk_new_dev', 'smart_it_helpdesk_new_test'];
const accounts = [
  { user: 'sih_new_app', schema: schemas[0], prefix: 'DB', migration: false },
  { user: 'sih_new_test', schema: schemas[1], prefix: 'DB_TEST', migration: false },
  { user: 'sih_new_dev_migrate', schema: schemas[0], prefix: 'DB_MIGRATION', migration: true },
  { user: 'sih_new_test_migrate', schema: schemas[1], prefix: 'DB_TEST_MIGRATION', migration: true },
];
let connection;
const completed = [];
try {
  connection = await mysql.createConnection({ host: environment.DB_HOST, port: Number(environment.DB_PORT), user: environment.DB_USER, password: environment.DB_PASSWORD, connectTimeout: 5000 });
  const [identity] = await connection.query('SELECT VERSION() AS version, CURRENT_USER() AS account, @@partial_revokes AS partial_revokes');
  console.log(JSON.stringify({ identity }));
  const [existingSchemas] = await connection.query('SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME IN (?, ?)', schemas);
  const [existingAccounts] = await connection.query('SELECT User, Host FROM mysql.user WHERE User IN (?, ?, ?, ?)', accounts.map(account => account.user));
  if (existingSchemas.length || existingAccounts.length) {
    console.log(JSON.stringify({ collision: true, existingSchemas, existingAccounts }));
    throw new Error('RESOURCE_COLLISION');
  }
  const values = { DB_HOST: '127.0.0.1', DB_PORT: '3306', DB_NAME: schemas[0], DB_TEST_HOST: '127.0.0.1', DB_TEST_PORT: '3306', DB_TEST_NAME: schemas[1] };
  for (const account of accounts) {
    account.password = randomBytes(36).toString('base64url');
    values[`${account.prefix}_USER`] = account.user;
    values[`${account.prefix}_PASSWORD`] = account.password;
  }
  // Recovery credentials are local and ignored. Exclusive creation prevents overwriting a prior attempt.
  writeFileSync('.env.provision.local', Object.entries(values).map(([key, value]) => `${key}=${value}`).join('\n') + '\n', { flag: 'wx', mode: 0o600 });
  for (const schema of schemas) {
    await connection.query(`CREATE DATABASE \`${schema}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`);
    completed.push(`schema:${schema}`);
  }
  for (const account of accounts) {
    await connection.query('CREATE USER ?@? IDENTIFIED BY ?', [account.user, '127.0.0.1', account.password]);
    completed.push(`account:${account.user}`);
    const privileges = 'SELECT, INSERT, UPDATE, DELETE' + (account.migration ? ', CREATE, ALTER, INDEX, REFERENCES' : '');
    const scope = identity[0].partial_revokes ? account.schema : account.schema.replaceAll('_', '\\_');
    await connection.query(`GRANT ${privileges} ON \`${scope}\`.* TO ?@?`, [account.user, '127.0.0.1']);
    completed.push(`grant:${account.user}`);
  }
  let updated = source;
  for (const [key, value] of Object.entries(values)) {
    const pattern = new RegExp(`^${key}=.*$`, 'm');
    updated = pattern.test(updated) ? updated.replace(pattern, `${key}=${value}`) : `${updated}\n${key}=${value}`;
  }
  writeFileSync('.env', updated);
  console.log(JSON.stringify({ status: 'PROVISIONED', completed }));
} catch (error) {
  console.log(JSON.stringify({ status: 'STOPPED', code: error.code || (error.message === 'RESOURCE_COLLISION' ? error.message : 'PROVISIONING_FAILED'), completed }));
  process.exitCode = 1;
} finally { if (connection) await connection.end(); }
