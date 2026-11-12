/**
 * Migration: Initial Database Schema for Smart IT Helpdesk
 * Creates 10 core tables with foreign keys, unique constraints, and indexes.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  // 1. users table
  await knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('google_sub', 255).nullable().unique();
    table.string('email', 255).notNullable().unique();
    table.string('full_name', 255).notNullable();
    table.text('avatar_url').nullable();
    table.enum('role', ['ADMIN', 'IT_AGENT', 'END_USER']).notNullable().defaultTo('END_USER');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamps(true, true);

    table.index(['email'], 'idx_users_email');
    table.index(['role'], 'idx_users_role');
  });

  // 2. categories table
  await knex.schema.createTable('categories', (table) => {
    table.increments('id').primary();
    table.string('name', 150).notNullable().unique();
    table.text('description').nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamps(true, true);
  });

  // 3. priority_rules table
  await knex.schema.createTable('priority_rules', (table) => {
    table.increments('id').primary();
    table.string('keyword', 200).notNullable();
    table.string('normalized_keyword', 200).notNullable();
    table.enum('priority', ['URGENT', 'NORMAL']).notNullable().defaultTo('URGENT');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamps(true, true);

    table.index(['is_active'], 'idx_priority_rules_active');
    table.index(['normalized_keyword'], 'idx_priority_rules_norm_kw');
  });

  // 4. sla_policies table
  await knex.schema.createTable('sla_policies', (table) => {
    table.increments('id').primary();
    table.enum('priority', ['URGENT', 'NORMAL']).notNullable().unique();
    table.integer('response_minutes').unsigned().notNullable();
    table.integer('resolution_minutes').unsigned().notNullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamps(true, true);
  });

  // 5. tickets table
  await knex.schema.createTable('tickets', (table) => {
    table.increments('id').primary();
    table.string('ticket_code', 32).notNullable().unique();
    table.integer('reporter_id').unsigned().notNullable().references('id').inTable('users').onDelete('RESTRICT');
    table.integer('assignee_id').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
    table.integer('category_id').unsigned().nullable().references('id').inTable('categories').onDelete('SET NULL');
    table.string('title', 255).notNullable();
    table.text('description').notNullable();
    table.enum('impact', ['individual', 'department', 'organization']).notNullable().defaultTo('individual');
    table.enum('priority', ['URGENT', 'NORMAL']).notNullable().defaultTo('NORMAL');
    table.enum('status', ['OPEN', 'IN_PROGRESS', 'RESOLVED']).notNullable().defaultTo('OPEN');
    table.text('priority_reason').nullable();
    table.datetime('response_deadline_at').nullable();
    table.datetime('resolution_deadline_at').nullable();
    table.datetime('first_response_at').nullable();
    table.datetime('resolved_at').nullable();
    table.integer('version').unsigned().notNullable().defaultTo(1);
    table.timestamps(true, true);

    table.index(['status'], 'idx_tickets_status');
    table.index(['priority'], 'idx_tickets_priority');
    table.index(['reporter_id'], 'idx_tickets_reporter');
    table.index(['assignee_id'], 'idx_tickets_assignee');
    table.index(['response_deadline_at'], 'idx_tickets_resp_deadline');
    table.index(['resolution_deadline_at'], 'idx_tickets_res_deadline');
  });

  // 6. ticket_comments table
  await knex.schema.createTable('ticket_comments', (table) => {
    table.increments('id').primary();
    table.integer('ticket_id').unsigned().notNullable().references('id').inTable('tickets').onDelete('CASCADE');
    table.integer('author_id').unsigned().notNullable().references('id').inTable('users').onDelete('RESTRICT');
    table.text('message').notNullable();
    table.enum('visibility', ['public', 'internal']).notNullable().defaultTo('public');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['ticket_id'], 'idx_ticket_comments_ticket_id');
  });

  // 7. ticket_attachments table
  await knex.schema.createTable('ticket_attachments', (table) => {
    table.increments('id').primary();
    table.integer('ticket_id').unsigned().notNullable().references('id').inTable('tickets').onDelete('CASCADE');
    table.integer('uploaded_by').unsigned().notNullable().references('id').inTable('users').onDelete('RESTRICT');
    table.string('original_filename', 255).notNullable();
    table.string('stored_filename', 255).notNullable().unique();
    table.string('mime_type', 127).notNullable();
    table.bigInteger('size_bytes').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['ticket_id'], 'idx_ticket_attachments_ticket_id');
  });

  // 8. ticket_history table
  await knex.schema.createTable('ticket_history', (table) => {
    table.increments('id').primary();
    table.integer('ticket_id').unsigned().notNullable().references('id').inTable('tickets').onDelete('CASCADE');
    table.integer('actor_id').unsigned().notNullable().references('id').inTable('users').onDelete('RESTRICT');
    table.string('event_type', 50).notNullable();
    table.string('old_value', 255).nullable();
    table.string('new_value', 255).nullable();
    table.text('note').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['ticket_id'], 'idx_ticket_history_ticket_id');
  });

  // 9. notifications table
  await knex.schema.createTable('notifications', (table) => {
    table.increments('id').primary();
    table.integer('recipient_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('ticket_id').unsigned().nullable().references('id').inTable('tickets').onDelete('SET NULL');
    table.string('notification_type', 50).notNullable();
    table.string('title', 255).notNullable();
    table.text('message').notNullable();
    table.string('deduplication_key', 191).nullable().unique();
    table.boolean('is_read').notNullable().defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['recipient_id'], 'idx_notifications_recipient');
    table.index(['is_read'], 'idx_notifications_is_read');
  });

  // 10. audit_logs table
  await knex.schema.createTable('audit_logs', (table) => {
    table.increments('id').primary();
    table.integer('actor_id').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
    table.string('action', 100).notNullable();
    table.string('entity_type', 80).notNullable();
    table.string('entity_id', 100).nullable();
    table.json('safe_metadata').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['actor_id'], 'idx_audit_logs_actor');
    table.index(['action'], 'idx_audit_logs_action');
  });
}

/**
 * Rollback Migration
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('audit_logs');
  await knex.schema.dropTableIfExists('notifications');
  await knex.schema.dropTableIfExists('ticket_history');
  await knex.schema.dropTableIfExists('ticket_attachments');
  await knex.schema.dropTableIfExists('ticket_comments');
  await knex.schema.dropTableIfExists('tickets');
  await knex.schema.dropTableIfExists('sla_policies');
  await knex.schema.dropTableIfExists('priority_rules');
  await knex.schema.dropTableIfExists('categories');
  await knex.schema.dropTableIfExists('users');
}
