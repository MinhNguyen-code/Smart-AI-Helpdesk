import test from 'node:test';
import assert from 'node:assert/strict';
import config from '../../src/config/index.js';

test('Configuration unit tests', async (t) => {
  await t.test('loads valid port and environment defaults', () => {
    assert.ok(typeof config.port === 'number', 'Port should be a number');
    assert.ok(config.port > 0, 'Port should be greater than 0');
    assert.ok(typeof config.nodeEnv === 'string', 'nodeEnv should be a string');
  });

  await t.test('loads database configuration targeting smart_it_helpdesk database', () => {
    assert.ok(config.db.name.includes('smart_it_helpdesk'), 'DB name should contain smart_it_helpdesk');
    assert.strictEqual(config.db.host, '127.0.0.1');
    assert.strictEqual(config.db.port, 3306);
  });

  await t.test('configures 3 initial approved Gmail accounts with correct roles', () => {
    assert.strictEqual(config.initialAccounts.length, 3);

    const admin = config.initialAccounts.find((a) => a.role === 'ADMIN');
    const agent = config.initialAccounts.find((a) => a.role === 'IT_AGENT');
    const user = config.initialAccounts.find((a) => a.role === 'END_USER');

    assert.ok(admin, 'Admin account should be configured');
    assert.strictEqual(admin.email, 'binmin109@gmail.com');

    assert.ok(agent, 'IT Agent account should be configured');
    assert.strictEqual(agent.email, 'nguyenbinhminh.1009.vn@gmail.com');

    assert.ok(user, 'End User account should be configured');
    assert.strictEqual(user.email, 'nguyenbinhminh.2006.vn@gmail.com');
  });

  await t.test('configures secure session settings', () => {
    assert.ok(config.session.secret.length >= 32, 'Session secret should be at least 32 characters');
    assert.strictEqual(config.session.name, 'smart_helpdesk_sid');
  });
});
