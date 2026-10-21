/**
 * The application's database interface.
 *
 * One small surface — query, get, run, transaction — over PostgreSQL. Every
 * query in the application is written in PostgreSQL syntax with $1
 * placeholders and is always parameterised.
 */
import { describeDatabaseError, getPool } from './postgres';

export interface QueryResult<T> {
  rows: T[];
  rowCount: number;
}

export class DatabaseError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'DatabaseError';
    this.cause = cause;
  }
}

export async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  try {
    const result = await getPool().query(sql, params as never[]);
    return result.rows as T[];
  } catch (error) {
    throw new DatabaseError(describeDatabaseError(error), error);
  }
}

export async function get<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows.length > 0 ? (rows[0] as T) : null;
}

export async function run(
  sql: string,
  params: unknown[] = []
): Promise<{ rowCount: number }> {
  try {
    const result = await getPool().query(sql, params as never[]);
    return { rowCount: result.rowCount ?? 0 };
  } catch (error) {
    throw new DatabaseError(describeDatabaseError(error), error);
  }
}

/**
 * Runs a function inside a transaction. The work is rolled back if it throws.
 */
export async function transaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const tx: Tx = {
      query: async <R = Record<string, unknown>>(sql: string, params: unknown[] = []) => {
        const result = await client.query(sql, params as never[]);
        return result.rows as R[];
      },
      get: async <R = Record<string, unknown>>(sql: string, params: unknown[] = []) => {
        const result = await client.query(sql, params as never[]);
        return (result.rows as R[])[0] ?? null;
      },
      run: async (sql: string, params: unknown[] = []) => {
        const result = await client.query(sql, params as never[]);
        return { rowCount: result.rowCount ?? 0 };
      },
    };
    const value = await fn(tx);
    await client.query('COMMIT');
    return value;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // The connection is already broken; it will be discarded.
    }
    throw error instanceof DatabaseError
      ? error
      : new DatabaseError(describeDatabaseError(error), error);
  } finally {
    client.release();
  }
}

export interface Tx {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  get<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | null>;
  run(sql: string, params?: unknown[]): Promise<{ rowCount: number }>;
}

export { closePool } from './postgres';
export * from './types';
