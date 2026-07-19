import { mkdirSync } from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { migrateDatabase } from './migrate.js';
import { getDatabasePath } from './paths.js';

export function openDatabase({ filename = getDatabasePath() } = {}) {
  if (filename !== ':memory:') {
    mkdirSync(path.dirname(filename), { recursive: true });
  }

  const database = new Database(filename);

  database.pragma('foreign_keys = ON');
  database.pragma('busy_timeout = 5000');

  if (filename !== ':memory:') {
    database.pragma('journal_mode = WAL');
    database.pragma('synchronous = NORMAL');
  }

  migrateDatabase(database);
  return database;
}
