import { assertIdentity } from '../src/db/targetPolicy.js';

export async function up(knex) {
  const [identity] = await knex.raw('SELECT DATABASE() AS selected_database, CURRENT_USER() AS matched_account');
  const environment = identity[0]?.selected_database === 'smart_it_helpdesk_new_test' ? 'test' : 'development';
  assertIdentity(environment, 'migration', identity[0]);
  if (!await knex.schema.hasColumn('tickets', 'acknowledged_at')) {
    await knex.schema.alterTable('tickets', table => table.dateTime('acknowledged_at').nullable());
  }
}

export async function down() {
  throw new Error('Removing acknowledgment evidence requires a separate review');
}
