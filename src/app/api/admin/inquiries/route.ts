import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('portfolio_session')?.value ?? null;
  const admin = requireAdmin(sessionToken);
  if ('error' in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const rows = db
    .prepare(
      `SELECT id, name, email, subject, is_read, created_at FROM contact_inquiries ORDER BY created_at DESC`
    )
    .all() as any[];
  return NextResponse.json(rows);
}
