import { Pool, types } from 'pg';
import {
  DatabaseConfigurationError,
  describeConnection,
  readDatabaseConfig,
} from './config';

/**
 * The PostgreSQL connection pool.
 *
 * The pool is created lazily so a build (which imports the modules) never
 * opens a connection, and one pool is reused for the life of the process
 * rather than a new connection per query.
 */

let pool: Pool | null = null;

function applyTypeParsers(): void {
  // Keep dates and timestamps as strings so the rest of the application sees
  // exactly what it saw with SQLite, and nothing has to change how it reads
  // a date.
  types.setTypeParser(1082, (value) => value); // date
  types.setTypeParser(1114, (value) => value); // timestamp without time zone
  types.setTypeParser(1184, (value) => {
    // timestamp with time zone -> ISO 8601
    const normalised = value.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00');
    const parsed = new Date(normalised);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
  });
  types.setTypeParser(16, (value) => value === 't'); // boolean -> true/false
}

export function getPool(): Pool {
  if (pool) return pool;

  let config;
  try {
    config = readDatabaseConfig();
  } catch (error) {
    if (error instanceof DatabaseConfigurationError) throw error;
    throw new DatabaseConfigurationError(
      'The database connection could not be read from the environment.'
    );
  }

  applyTypeParsers();

  pool = new Pool({
    connectionString: config.connectionString,
    max: config.maxConnections,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 15_000,
    allowExitOnIdle: false,
    ssl: config.ssl ? { rejectUnauthorized: false } : false,
  });

  // A pool-level error (for example the database going away) must not take
  // the process down.
  pool.on('error', (error) => {
    console.error(
      '[database] idle client error:',
      error instanceof Error ? error.message : 'unknown error'
    );
  });

  return pool;
}

/**
 * Wraps a database error so a connection problem is reported plainly, with
 * the address of the database but never the credentials.
 */
export function describeDatabaseError(error: unknown): string {
  if (error instanceof DatabaseConfigurationError) return error.message;
  const message = error instanceof Error ? error.message : String(error);
  if (/password|auth failed|ENOTFOUND|ECONNREFUSED|timeout/i.test(message)) {
    return `The database could not be reached (${describeConnection(
      process.env.DATABASE_URL ?? ''
    )}). Check DATABASE_URL and that the database is running.`;
  }
  return message;
}

export async function closePool(): Promise<void> {
  if (!pool) return;
  const current = pool;
  pool = null;
  await current.end();
}
