export async function up(knex) {
  // Expand the enum first so existing rows remain valid during migration.
  for (const table of ['tickets', 'priority_rules', 'sla_policies']) {
    await knex.raw(`ALTER TABLE ?? MODIFY priority ENUM('URGENT','NORMAL','P1','P2','P3','P4') NOT NULL`, [table]);
    await knex(table).where('priority', 'URGENT').update({ priority: 'P1' });
    await knex(table).where('priority', 'NORMAL').update({ priority: 'P3' });
  }
  for (const policy of [
    { priority: 'P2', response_minutes: 60, resolution_minutes: 480, is_active: true },
    { priority: 'P4', response_minutes: 480, resolution_minutes: 2880, is_active: true },
  ]) {
    if (!await knex('sla_policies').where('priority', policy.priority).first()) await knex('sla_policies').insert(policy);
  }
  await knex.raw("ALTER TABLE tickets MODIFY priority ENUM('URGENT','NORMAL','P1','P2','P3','P4') NOT NULL DEFAULT 'P3'");
  await knex.raw("ALTER TABLE priority_rules MODIFY priority ENUM('URGENT','NORMAL','P1','P2','P3','P4') NOT NULL DEFAULT 'P1'");
}

export async function down() {
  throw new Error('Priority rollback requires an approved data mapping');
}
