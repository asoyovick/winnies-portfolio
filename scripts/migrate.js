/**
 * Runs database migrations against the SQLite database.
 *
 * Usage: node scripts/migrate.js
 *        DATABASE_URL=path/to/db.sqlite node scripts/migrate.js
 *
 * The database path defaults to data/app.db relative to the project root.
 */
import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const DB_PATH = process.env.DATABASE_URL || join(PROJECT_ROOT, 'data', 'app.db');
const MIGRATIONS_DIR = join(PROJECT_ROOT, 'data', 'migrations');

async function main() {
  const db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON');

  // Track applied migrations.
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const applied = new Set(
    db.prepare('SELECT version FROM schema_migrations').all().map((row) => row.version)
  );

  const files = []
    .concat(readMigrations(MIGRATIONS_DIR))
    .sort((a, b) => a.version.localeCompare(b.version));

  let ran = 0;
  for (const { version, sql } of files) {
    if (applied.has(version)) continue;
    const tx = db.transaction(() => {
      db.exec(sql);
      db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(version);
    });
    tx();
    ran += 1;
    console.log(`migrated: ${version}`);
  }

  if (ran === 0) {
    console.log('database is up to date');
  }
  db.close();
}

import { readdirSync } from 'fs';

function readMigrations(dir) {
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith('.sql'))
      .map((f) => {
        const version = f.replace(/\.sql$/, '');
        const sql = readFileSync(join(dir, f), 'utf8');
        return { version, sql };
      });
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
