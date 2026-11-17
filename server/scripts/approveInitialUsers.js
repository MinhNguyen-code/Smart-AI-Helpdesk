import { db } from '../src/db/index.js';
import config from '../src/config/index.js';

// Owner approval of the three proposed roles is required before --apply.
const apply = process.argv.includes('--apply');

async function main() {
  if (config.nodeEnv !== 'development' || config.db.name !== 'smart_it_helpdesk_new_dev'
      || config.db.user !== 'sih_new_app') throw new Error('ONBOARDING_TARGET_REJECTED');

  const [rows] = await db.raw('SELECT DATABASE() AS selected_database, CURRENT_USER() AS matched_account');
  if (rows[0]?.selected_database !== 'smart_it_helpdesk_new_dev'
      || rows[0]?.matched_account !== 'sih_new_app@127.0.0.1') throw new Error('ONBOARDING_IDENTITY_REJECTED');

  const accounts = config.initialAccounts.map(account => ({
    email: account.email.toLowerCase().trim(), role: account.role, full_name: account.fullName,
  }));
  if (accounts.length !== 3 || accounts.some(account => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.email))
      || new Set(accounts.map(account => account.email)).size !== 3
      || accounts.map(account => account.role).join(',') !== 'ADMIN,IT_AGENT,END_USER') {
    throw new Error('ONBOARDING_MAPPING_REJECTED');
  }

  await db.transaction(async trx => {
    const existing = await trx('users').whereIn('email', accounts.map(account => account.email)).forUpdate();
    for (const account of accounts) {
      const row = existing.find(item => item.email.toLowerCase() === account.email);
      if (row && (row.role !== account.role || !row.is_active)) throw new Error('ONBOARDING_EXISTING_ACCOUNT_CONFLICT');
    }
    const missing = accounts.filter(account => !existing.some(row => row.email.toLowerCase() === account.email));
    if (apply && missing.length) await trx('users').insert(missing.map(account => ({ ...account, is_active: true })));
    console.log(`target_verified=true existing=${existing.length} ${apply ? 'created' : 'would_create'}=${missing.length}`);
  });
}

try { await main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
finally { await db.destroy(); }
