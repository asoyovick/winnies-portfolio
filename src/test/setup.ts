import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { createTestDatabase } from './postgres';

/**
 * Test setup: every test file gets a PostgreSQL database of its own with the
 * migrations applied, so the tests never touch development or production
 * data.
 */
const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..', '..');
const MIGRATIONS_DIR = join(PROJECT_ROOT, 'db', 'migrations');

async function applyMigrations(url: string): Promise<void> {
  const client = new pg.Client({ connectionString: url, ssl: false });
  await client.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    const applied = new Set(
      (
        await client.query('SELECT version FROM schema_migrations')
      ).rows.map((row) => row.version)
    );
    const files = readdirSync(MIGRATIONS_DIR)
      .filter((file) => file.endsWith('.sql'))
      .sort();
    for (const file of files) {
      const version = file.replace(/\.sql$/, '');
      if (applied.has(version)) continue;
      await client.query('BEGIN');
      try {
        await client.query(readFileSync(join(MIGRATIONS_DIR, file), 'utf8'));
        await client.query(
          'INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT (version) DO NOTHING',
          [version]
        );
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    await client.end();
  }
}

const database = await createTestDatabase();
await applyMigrations(database.url);

process.env.DATABASE_URL = database.url;
process.env.SESSION_SECRET = 'test-secret-key-with-at-least-thirty-two-chars';

process.on('exit', () => {
  void database.cleanup();
});
