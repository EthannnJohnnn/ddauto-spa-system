import { readFileSync } from 'node:fs';

const migrations = [
  {
    version: 1,
    name: 'auth foundation',
    sql: readFileSync(new URL('./migrations/001_auth_foundation.sql', import.meta.url), 'utf8'),
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
