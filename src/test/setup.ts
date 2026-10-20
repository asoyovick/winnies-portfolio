/**
 * Test setup: point the database at a throwaway SQLite file, run the
 * migrations and seed the schema so tests never touch the development
 * database.
 *
 * The file name carries the process id so two runs can never fight over the
 * same database, and the file is removed when the run ends.
 */
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, readdirSync, rmSync, existsSync } from 'fs';
import Database from 'better-sqlite3';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..', '..');
const MIGRATIONS_DIR = join(PROJECT_ROOT, 'data', 'migrations');

const TEST_DB = join(PROJECT_ROOT, 'data', `test-${process.pid}.db`);
process.env.DATABASE_URL = TEST_DB;
process.env.SESSION_SECRET = 'test-secret-key-at-least-thirty-two-chars';

const db = new Database(TEST_DB);
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = DELETE');

const files = readdirSync(MIGRATIONS_DIR)
  .filter((file) => file.endsWith('.sql'))
  .sort();
for (const file of files) {
  db.exec(readFileSync(join(MIGRATIONS_DIR, file), 'utf8'));
}
db.close();

function cleanup() {
  for (const suffix of ['', '-shm', '-wal']) {
    const path = `${TEST_DB}${suffix}`;
    if (existsSync(path)) {
      try {
        rmSync(path, { force: true });
      } catch {
        // The file may still be open; it is ignored by .gitignore either way.
      }
    }
  }
}

process.on('exit', cleanup);
process.on('SIGINT', () => {
  cleanup();
  process.exit(1);
});
