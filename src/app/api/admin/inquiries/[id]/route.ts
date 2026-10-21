import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { requireAdmin } from '@/lib/auth';
import { get, run } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('portfolio_session')?.value ?? null;
  const admin = await requireAdmin(sessionToken);
  if ('error' in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const { id } = await params;
  const numericId = Number(id);
  const row = await get<any>('SELECT * FROM contact_inquiries WHERE id = $1', [numericId]);
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
  const admin = await requireAdmin(sessionToken);
  if ('error' in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const { id } = await params;
  const numericId = Number(id);
  const row = await get<any>('SELECT id FROM contact_inquiries WHERE id = $1', [numericId]);
  if (!row) {
    return NextResponse.json({ error: 'Inquiry not found.' }, { status: 404 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (typeof body.is_read !== 'boolean') {
    return NextResponse.json({ error: 'No updatable fields.' }, { status: 400 });
  }

  await run('UPDATE contact_inquiries SET is_read = $1 WHERE id = $2', [
    body.is_read,
    numericId,
  ]);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('portfolio_session')?.value ?? null;
  const admin = await requireAdmin(sessionToken);
  if ('error' in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const { id } = await params;
  const numericId = Number(id);
  const row = await get<any>('SELECT id FROM contact_inquiries WHERE id = $1', [numericId]);
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

  await run('DELETE FROM contact_inquiries WHERE id = $1', [numericId]);
  return NextResponse.json({ ok: true });
}
