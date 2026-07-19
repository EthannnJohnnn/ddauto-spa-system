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
      'recovery_codes',
      'schema_migrations',
      'sessions',
      'users',
    ]);
    expect(database.prepare('SELECT COUNT(*) AS count FROM schema_migrations').get().count).toBe(1);
    expect(database.pragma('foreign_keys', { simple: true })).toBe(1);

    database.close();
  });

  it('keeps the default database outside the source tree and supports an explicit override', () => {
    expect(
      getDataDirectory({
        LOCALAPPDATA: 'C:\\Users\\Owner\\AppData\\Local',
      }),
    ).toContain('DD Auto Spa');
    expect(getDatabasePath({ DDAUTO_DATA_DIR: 'D:\\safe-data' })).toBe(
      'D:\\safe-data\\ddauto-spa.db',
    );
  });
});
