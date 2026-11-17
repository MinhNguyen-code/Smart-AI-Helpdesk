import { assertIdentity } from '../src/db/targetPolicy.js';

export async function up(knex) {
  const [identity] = await knex.raw('SELECT DATABASE() AS selected_database, CURRENT_USER() AS matched_account');
  const environment = identity[0]?.selected_database === 'smart_it_helpdesk_new_test' ? 'test' : 'development';
  assertIdentity(environment, 'migration', identity[0]);
  if (!await knex.schema.hasTable('email_outbox')) await knex.schema.createTable('email_outbox', table => {
    table.increments('id').primary();
    table.integer('notification_id').unsigned().notNullable().unique()
      .references('id').inTable('notifications').onDelete('CASCADE');
    table.string('status', 16).notNullable().defaultTo('pending');
    table.integer('attempts').unsigned().notNullable().defaultTo(0);
    table.dateTime('next_attempt_at').notNullable().defaultTo(knex.fn.now());
    table.dateTime('locked_until').nullable();
    table.string('lease_token', 36).nullable();
    table.dateTime('sent_at').nullable();
    table.string('last_error_code', 64).nullable();
    table.timestamps(true, true);
    table.index(['status', 'next_attempt_at'], 'idx_email_outbox_due');
  });
}

export async function down() {
  throw new Error('Removing durable email delivery history requires a separate review');
}
