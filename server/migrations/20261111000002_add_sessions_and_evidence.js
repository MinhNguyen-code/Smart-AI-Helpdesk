export async function up(knex) {
  await knex.schema.createTable('sessions', table => {
    table.string('session_id', 128).primary();
    table.bigInteger('expires').unsigned().notNullable().index();
    table.text('data', 'longtext').notNullable();
  });
  await knex.schema.alterTable('tickets', table => {
    table.json('priority_evidence').nullable();
  });
}

export async function down() {
  throw new Error('Destructive rollback requires a separately reviewed recovery procedure');
}
