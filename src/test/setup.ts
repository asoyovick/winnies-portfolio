/**
 * Test setup: point the database at a temporary SQLite file, run migrations,
 * and seed the schema so tests never touch the development database.
 */
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import Database from 'better-sqlite3';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_DB = join(__dirname, '..', '..', 'data', 'test.db');
process.env.DATABASE_URL = TEST_DB;
process.env.SESSION_SECRET = 'test-secret-key-at-least-thirty-two-chars';

const db = new Database(TEST_DB);
db.pragma('foreign_keys = ON');
// Use rollback journal mode for the test database to avoid WAL sidecar file
// locking issues between the dev server and test workers.
db.pragma('journal_mode = DELETE');

const migrationSql = readFileSync(
  join(__dirname, '..', '..', 'data', 'migrations', '001_init.sql'),
  'utf8'
);
db.exec(migrationSql);
db.close();
