import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('portfolio_session')?.value ?? null;
  const admin = requireAdmin(sessionToken);
  if ('error' in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const { id } = await params;
  const numericId = Number(id);
  const row = db
    .prepare('SELECT * FROM contact_inquiries WHERE id = ?')
    .get(numericId) as any | undefined;
  if (!row) {
    return NextResponse.json({ error: 'Inquiry not found.' }, { status: 404 });
  }
  return NextResponse.json(row);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('portfolio_session')?.value ?? null;
  const admin = requireAdmin(sessionToken);
  if ('error' in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const { id } = await params;
  const numericId = Number(id);
  const row = db.prepare('SELECT id FROM contact_inquiries WHERE id = ?').get(numericId);
  if (!row) {
    return NextResponse.json({ error: 'Inquiry not found.' }, { status: 404 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  if (typeof body.is_read === 'boolean') {
    fields.push('is_read = ?');
    values.push(body.is_read ? 1 : 0);
  }
  if (fields.length === 0) {
    return NextResponse.json({ error: 'No updatable fields.' }, { status: 400 });
  }
  values.push(numericId);
  db.prepare(`UPDATE contact_inquiries SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('portfolio_session')?.value ?? null;
  const admin = requireAdmin(sessionToken);
  if ('error' in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const { id } = await params;
  const numericId = Number(id);
  const row = db.prepare('SELECT id FROM contact_inquiries WHERE id = ?').get(numericId);
  if (!row) {
    return NextResponse.json({ error: 'Inquiry not found.' }, { status: 404 });
  }

  const confirm = new URL(request.url).searchParams.get('confirm');
  if (confirm !== 'delete') {
    return NextResponse.json(
      { error: 'Deletion requires confirmation. Include ?confirm=delete.' },
      { status: 400 }
    );
  }

  db.prepare('DELETE FROM contact_inquiries WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
