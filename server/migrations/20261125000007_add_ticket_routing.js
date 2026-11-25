import { assertIdentity } from '../src/db/targetPolicy.js';

export async function up(knex) {
  const [rows] = await knex.raw('SELECT DATABASE() AS selected_database, CURRENT_USER() AS matched_account');
  const environment = rows[0]?.selected_database === 'smart_it_helpdesk_new_test' ? 'test' : 'development';
  assertIdentity(environment, 'migration', rows[0]);
  await knex.schema.createTable('routing_settings', table => {
    table.integer('id').unsigned().primary();
    table.integer('version').unsigned().notNullable().defaultTo(1);
    table.boolean('auto_assign').notNullable().defaultTo(true);
    table.integer('max_open_per_agent').unsigned().notNullable().defaultTo(10);
  });
  await knex('routing_settings').insert({ id: 1 });
  await knex.schema.createTable('support_units', table => {
    table.increments('id').primary();
    table.string('code', 32).notNullable().unique();
    table.string('name', 120).notNullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamps(true, true);
  });
  await knex.schema.createTable('support_unit_memberships', table => {
    table.integer('unit_id').unsigned().notNullable().references('id').inTable('support_units').onDelete('RESTRICT');
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('RESTRICT');
    table.boolean('is_available').notNullable().defaultTo(true);
    table.dateTime('last_assigned_at', { precision: 3 }).nullable();
    table.primary(['unit_id', 'user_id']);
    table.index(['user_id'], 'idx_support_member_user');
  });
  await knex.schema.createTable('category_unit_routes', table => {
    table.integer('category_id').unsigned().primary().references('id').inTable('categories').onDelete('RESTRICT');
    table.integer('unit_id').unsigned().notNullable().references('id').inTable('support_units').onDelete('RESTRICT');
    table.json('keywords').notNullable();
  });
  await knex.schema.alterTable('tickets', table => {
    table.integer('owner_unit_id').unsigned().nullable().references('id').inTable('support_units').onDelete('RESTRICT');
    // NULL identifies historical tickets; no automatic reassignment/backfill.
    table.enum('routing_status', ['ASSIGNED', 'TEAM_QUEUE', 'REVIEW_REQUIRED']).nullable();
    table.json('routing_evidence').nullable();
    table.index(['owner_unit_id', 'status'], 'idx_tickets_unit_status');
  });
}

export async function down() {
  throw new Error('Routing rollback requires a reviewed recovery plan preserving ownership and history');
}
