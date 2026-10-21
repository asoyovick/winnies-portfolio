/**
 * Applies the PostgreSQL migrations.
 *
 *   npm run migrate
 *
 * The connection comes from DATABASE_URL. Every migration file in
 * db/migrations is applied once, in order, and the applied versions are
 * recorded in schema_migrations so a file is never run twice.
 *
 * Migrations are never run automatically when the application starts: apply
 * them explicitly before deploying a release that depends on them.
 */
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const MIGRATIONS_DIR = join(PROJECT_ROOT, 'db', 'migrations');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set. Point it at the PostgreSQL database first.');
  process.exit(1);
}

if (!/^postgres(ql)?:\/\//i.test(DATABASE_URL)) {
  console.error('DATABASE_URL must be a PostgreSQL connection string.');
  process.exit(1);
}

function migrationFiles() {
  return readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map((file) => ({
      version: file.replace(/\.sql$/, ''),
      sql: readFileSync(join(MIGRATIONS_DIR, file), 'utf8'),
    }));
}

async function main() {
  const client = new pg.Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

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

    let ran = 0;
    for (const migration of migrationFiles()) {
      if (applied.has(migration.version)) continue;
      console.log(`applying ${migration.version}`);
      await client.query('BEGIN');
      try {
        await client.query(migration.sql);
        await client.query(
          'INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT (version) DO NOTHING',
          [migration.version]
        );
        await client.query('COMMIT');
        ran += 1;
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(
          `Migration ${migration.version} failed: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    console.log(
      ran === 0
        ? 'The database is already up to date.'
        : `Applied ${ran} migration${ran === 1 ? '' : 's'}.`
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
