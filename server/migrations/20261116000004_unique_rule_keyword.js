import { assertIdentity } from '../src/db/targetPolicy.js';

export async function up(knex) {
  const [identity] = await knex.raw('SELECT DATABASE() AS selected_database, CURRENT_USER() AS matched_account');
  const environment = identity[0]?.selected_database === 'smart_it_helpdesk_new_test' ? 'test' : 'development';
  assertIdentity(environment, 'migration', identity[0]);
  const duplicate = await knex('priority_rules').select('normalized_keyword')
    .groupBy('normalized_keyword').havingRaw('COUNT(*) > 1').first();
  if (duplicate) throw new Error('RULE_KEYWORD_DUPLICATES: resolve duplicates before adding the constraint');
  const [indexes] = await knex.raw("SHOW INDEX FROM priority_rules WHERE Key_name = 'uq_priority_rules_normalized_keyword'");
  if (!indexes.length) await knex.schema.alterTable('priority_rules', table => {
    table.unique('normalized_keyword', { indexName: 'uq_priority_rules_normalized_keyword' });
  });
}

export async function down() {
  throw new Error('Removing the keyword uniqueness constraint requires a separate review');
}
