import { readFileSync } from 'node:fs';

const migrations = [
  {
    version: 1,
    name: 'auth foundation',
    sql: readFileSync(new URL('./migrations/001_auth_foundation.sql', import.meta.url), 'utf8'),
  },
  {
    version: 2,
    name: 'business catalogs',
    sql: readFileSync(new URL('./migrations/002_business_catalogs.sql', import.meta.url), 'utf8'),
  },
  {
    version: 3,
    name: 'service sales and attendance',
    sql: readFileSync(new URL('./migrations/003_service_sales.sql', import.meta.url), 'utf8'),
  },
  {
    version: 4,
    name: 'tire inventory ledger',
    sql: readFileSync(new URL('./migrations/004_tire_inventory.sql', import.meta.url), 'utf8'),
  },
  {
    version: 5,
    name: 'canteen inventory ledger',
    sql: readFileSync(new URL('./migrations/005_canteen_inventory.sql', import.meta.url), 'utf8'),
  },
  {
    version: 6,
    name: 'purchases and expenses ledger',
    sql: readFileSync(new URL('./migrations/006_purchases_expenses.sql', import.meta.url), 'utf8'),
  },
  {
    version: 7,
    name: 'payroll closing and generated expenses',
    sql: readFileSync(new URL('./migrations/007_payroll_closing.sql', import.meta.url), 'utf8'),
  },
  {
    version: 8,
    name: 'daily business closing',
    sql: readFileSync(new URL('./migrations/008_daily_close.sql', import.meta.url), 'utf8'),
  },
];

export function migrateDatabase(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    ) STRICT;
  `);

  const appliedVersions = new Set(
    database
      .prepare('SELECT version FROM schema_migrations')
      .all()
      .map((row) => row.version),
  );
  const recordMigration = database.prepare(
    'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)',
  );

  const applyPendingMigrations = database.transaction(() => {
    for (const migration of migrations) {
      if (appliedVersions.has(migration.version)) {
        continue;
      }

      database.exec(migration.sql);
      recordMigration.run(migration.version, migration.name, new Date().toISOString());
    }
  });

  applyPendingMigrations();
}
