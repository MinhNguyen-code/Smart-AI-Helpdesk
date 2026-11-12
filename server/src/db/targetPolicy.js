export const targets = {
  development: { schema: 'smart_it_helpdesk_new_dev', runtime: 'sih_new_app', migration: 'sih_new_dev_migrate' },
  test: { schema: 'smart_it_helpdesk_new_test', runtime: 'sih_new_test', migration: 'sih_new_test_migrate' },
};

export function assertTarget(environment, purpose, connection) {
  const target = targets[environment];
  if (!target || !['runtime', 'migration'].includes(purpose)
      || connection.database !== target.schema || connection.user !== target[purpose]) {
    throw new Error('DATABASE_TARGET_REJECTED');
  }
}

export function assertIdentity(environment, purpose, identity) {
  const target = targets[environment];
  if (!target || identity.selected_database !== target.schema
      || identity.matched_account !== `${target[purpose]}@127.0.0.1`) {
    throw new Error('DATABASE_IDENTITY_REJECTED');
  }
}
