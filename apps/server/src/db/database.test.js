import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { openDatabase } from './database.js';
import { migrateDatabase } from './migrate.js';
import { getDatabasePath, getDataDirectory } from './paths.js';

describe('database foundation', () => {
  it('applies the initial migration exactly once with foreign keys enabled', () => {
    const database = openDatabase({ filename: ':memory:' });

    migrateDatabase(database);

    const tables = database
      .prepare(
        `SELECT name
         FROM sqlite_master
         WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
         ORDER BY name`,
      )
      .all()
      .map((row) => row.name);

    expect(tables).toEqual([
      'audit_events',
      'canteen_inventory_document_items',
      'canteen_inventory_documents',
      'canteen_products',
      'daily_attendance',
      'daily_close_runs',
      'employees',
      'expense_categories',
      'expense_transactions',
      'payroll_run_items',
      'payroll_runs',
      'recovery_codes',
      'schema_migrations',
      'service_prices',
      'service_ticket_item_workers',
      'service_ticket_items',
      'service_tickets',
      'services',
      'sessions',
      'tire_inventory_document_items',
      'tire_inventory_documents',
      'tire_products',
      'users',
      'vehicle_classes',
    ]);
    expect(database.prepare('SELECT COUNT(*) AS count FROM schema_migrations').get().count).toBe(8);
    expect(database.prepare('SELECT COUNT(*) AS count FROM expense_categories').get().count).toBe(
      10,
    );
    expect(database.prepare('SELECT COUNT(*) AS count FROM services').get().count).toBe(5);
    expect(
      database.prepare("SELECT labor_policy FROM services WHERE name = 'Painting'").get()
        .labor_policy,
    ).toBe('EXTERNAL');
    expect(database.pragma('foreign_keys', { simple: true })).toBe(1);

    database.close();
  });

  it('keeps the default database outside the source tree and supports an explicit override', () => {
    const localAppData = path.resolve('local-app-data');
    const overrideDirectory = path.resolve('safe-data');

    expect(getDataDirectory({ LOCALAPPDATA: localAppData })).toBe(
      path.join(localAppData, 'DD Auto Spa', 'data'),
    );
    expect(getDatabasePath({ DDAUTO_DATA_DIR: overrideDirectory })).toBe(
      path.join(overrideDirectory, 'ddauto-spa.db'),
    );
  });
});
