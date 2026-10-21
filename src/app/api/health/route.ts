import { NextResponse } from 'next/server';
import { get } from '@/lib/db';
import { storageDriver } from '@/lib/storage';

export const runtime = 'nodejs';

/**
 * A health check for the hosting platform.
 *
 * It reports whether the application can reach its database and where files
 * are stored. It never exposes credentials, environment variables, session
 * data or contact inquiries.
 */
export async function GET() {
  try {
    await get('SELECT 1 AS ok');
    return NextResponse.json({
      status: 'ok',
      database: 'postgresql',
      storage: storageDriver(),
      time: new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      '[health] database check failed:',
      error instanceof Error ? error.message : 'unknown error'
    );
    return NextResponse.json(
      { status: 'unavailable', database: 'postgresql' },
      { status: 503 }
    );
  }
}
