import { startTestDatabase, type TestDatabase } from './postgres';

/**
 * Starts the PostgreSQL server the test run uses, and stops it again at the
 * end. The container is reused between runs when it is already up.
 */
let database: TestDatabase | null = null;

export async function setup(): Promise<void> {
  database = await startTestDatabase();
}

export async function teardown(): Promise<void> {
  if (database) {
    await database.stop();
    database = null;
  }
}
