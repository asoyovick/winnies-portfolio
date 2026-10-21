import { execFileSync, spawnSync } from 'child_process';
import pg from 'pg';

/**
 * A PostgreSQL database for the tests.
 *
 * The suite needs a real PostgreSQL server, not a SQLite stand-in: the
 * application speaks PostgreSQL SQL, and the behaviour of the queries (jsonb,
 * identity columns, upserts, transactions) has to be the same in the tests as
 * in production.
 *
 * The database comes from TEST_DATABASE_URL when it is set. Otherwise a
 * PostgreSQL container is started for the run.
 */

export const CONTAINER_NAME = 'winnie-portfolio-test-pg';
export const CONTAINER_PORT = 55432;
export const CONTAINER_PASSWORD = 'portfolio_test_password';

export type TestDatabase = {
  adminUrl: string;
  stop: () => Promise<void>;
};

function dockerAvailable(): boolean {
  try {
    execFileSync('docker', ['info', '--format', '{{.ServerVersion}}'], {
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

function containerIsRunning(): boolean {
  const result = spawnSync(
    'docker',
    ['inspect', '-f', '{{.State.Running}}', CONTAINER_NAME],
    { encoding: 'utf8' }
  );
  return result.status === 0 && result.stdout.trim() === 'true';
}

async function waitForPostgres(url: string, timeoutMs = 60_000): Promise<void> {
  const start = Date.now();
  let lastError: unknown = null;
  while (Date.now() - start < timeoutMs) {
    const client = new pg.Client({ connectionString: url, ssl: false });
    try {
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      return;
    } catch (error) {
      lastError = error;
      try {
        await client.end();
      } catch {
        // The connection never opened.
      }
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error(
    `The test database did not become ready: ${
      lastError instanceof Error ? lastError.message : 'unknown error'
    }`
  );
}

async function startContainer(): Promise<TestDatabase> {
  const adminUrl = `postgresql://postgres:${CONTAINER_PASSWORD}@127.0.0.1:${CONTAINER_PORT}/postgres?sslmode=disable`;

  if (!containerIsRunning()) {
    spawnSync(
      'docker',
      [
        'run',
        '-d',
        '--rm',
        '--name',
        CONTAINER_NAME,
        '-e',
        `POSTGRES_PASSWORD=${CONTAINER_PASSWORD}`,
        '-e',
        'POSTGRES_DB=postgres',
        '-p',
        `${CONTAINER_PORT}:5432`,
        'postgres:16-alpine',
      ],
      { stdio: 'ignore' }
    );
  }

  await waitForPostgres(adminUrl);

  return {
    adminUrl,
    stop: async () => {
      if (!containerIsRunning()) return;
      spawnSync('docker', ['rm', '-f', CONTAINER_NAME], { stdio: 'ignore' });
    },
  };
}

/**
 * Starts the PostgreSQL server the tests use. Called once per test run; the
 * container is reused if it is already running.
 */
export async function startTestDatabase(): Promise<TestDatabase | null> {
  if (process.env.TEST_DATABASE_URL?.trim()) {
    // An external database was provided: it is not ours to stop.
    return null;
  }
  if (!dockerAvailable()) {
    throw new Error(
      'No PostgreSQL is available. Start one with Docker, or set TEST_DATABASE_URL.'
    );
  }
  return startContainer();
}

/**
 * Prepares the test database for one test file: a database of its own, with
 * the migrations applied.
 */
export async function createTestDatabase(): Promise<{
  url: string;
  cleanup: () => Promise<void>;
}> {
  const external = process.env.TEST_DATABASE_URL?.trim();
  const adminUrl = external
    ? external
    : `postgresql://postgres:${CONTAINER_PASSWORD}@127.0.0.1:${CONTAINER_PORT}/postgres?sslmode=disable`;

  if (!external) {
    if (!dockerAvailable()) {
      throw new Error(
        'No PostgreSQL is available. Start one with Docker, or set TEST_DATABASE_URL.'
      );
    }
    await waitForPostgres(adminUrl);
  }

  const name = `portfolio_test_${process.pid}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;

  const admin = new pg.Client({ connectionString: adminUrl, ssl: false });
  await admin.connect();
  await admin.query(`CREATE DATABASE ${name}`);
  await admin.end();

  const [base = adminUrl, query] = adminUrl.split('?');
  const url = `${base.replace(/\/[^/]*$/, '')}/${name}${query ? `?${query}` : ''}`;

  const cleanup = async () => {
    const client = new pg.Client({ connectionString: adminUrl, ssl: false });
    try {
      await client.connect();
      await client.query(
        `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1`,
        [name]
      );
      await client.query(`DROP DATABASE IF EXISTS ${name}`);
    } catch {
      // The database is gone already.
    } finally {
      await client.end().catch(() => {});
    }
  };

  return { url, cleanup };
}

/** Removes the rows a test file created, keeping the schema. */
export async function truncateAll(url: string): Promise<void> {
  const client = new pg.Client({ connectionString: url, ssl: false });
  await client.connect();
  try {
    await client.query(
      'TRUNCATE sessions, contact_inquiries, articles, expertise, education, experience, media, rate_limits, admins RESTART IDENTITY CASCADE'
    );
  } finally {
    await client.end();
  }
}
