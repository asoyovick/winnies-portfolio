import { get } from './index';
import { describeConnection } from './config';

/**
 * A startup check.
 *
 * When the service starts it opens one connection and says what it found, so a
 * misconfigured database is visible in the host's logs straight away instead
 * of surfacing as a failing first request.
 */
export async function checkDatabase(): Promise<boolean> {
  const target = describeConnection(process.env.DATABASE_URL ?? '');
  try {
    await get('SELECT 1 AS ok');
    console.log(`[startup] connected to PostgreSQL at ${target}`);
    return true;
  } catch (error) {
    console.error(
      `[startup] the database at ${target} could not be reached: ${
        error instanceof Error ? error.message : 'unknown error'
      }`
    );
    return false;
  }
}
