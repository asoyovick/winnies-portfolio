import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { validateCsrfToken, requireAdmin } from '@/lib/auth';
import { get, query, run } from '@/lib/db';

export const runtime = 'nodejs';

function entryResponse(row: any) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    display_order: row.display_order,
    is_featured: Boolean(row.is_featured),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function GET() {
  const rows = await query<any>(
    'SELECT * FROM expertise ORDER BY display_order ASC, created_at DESC'
  );
  return NextResponse.json(rows.map(entryResponse));
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('portfolio_session')?.value ?? null;
  const admin = await requireAdmin(sessionToken);
  if ('error' in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }
  const csrfCookie = cookieStore.get('portfolio_csrf')?.value ?? null;
  const csrfHeader = request.headers.get('x-csrf-token') ?? null;
  if (!validateCsrfToken(csrfHeader, csrfCookie)) {
    return NextResponse.json({ error: 'Invalid CSRF token.' }, { status: 403 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (!body.title) {
    return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
  }

  const row = await get<any>(
    `INSERT INTO expertise (
       title, description, category, display_order, is_featured,
       created_at, updated_at
     ) VALUES ($1, $2, $3, $4, $5, now(), now())
     RETURNING *`,
    [
      body.title,
      body.description ?? '',
      body.category ?? '',
      Number(body.display_order ?? 0),
      Boolean(body.is_featured),
    ]
  );
  return NextResponse.json(entryResponse(row), { status: 201 });
}

export async function PUT(request: Request) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('portfolio_session')?.value ?? null;
  const admin = await requireAdmin(sessionToken);
  if ('error' in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }
  const csrfCookie = cookieStore.get('portfolio_csrf')?.value ?? null;
  const csrfHeader = request.headers.get('x-csrf-token') ?? null;
  if (!validateCsrfToken(csrfHeader, csrfCookie)) {
    return NextResponse.json({ error: 'Invalid CSRF token.' }, { status: 403 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const id = Number(body.id);
  if (!id) {
    return NextResponse.json({ error: 'Entry id is required.' }, { status: 400 });
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  let index = 1;

  const allowed: Record<string, unknown> = {};
  if (typeof body.title === 'string') allowed.title = body.title.trim();
  if (typeof body.description === 'string') allowed.description = body.description;
  if (typeof body.category === 'string') allowed.category = body.category.trim();
  if (typeof body.display_order === 'number') allowed.display_order = body.display_order;
  if (typeof body.is_featured === 'boolean') allowed.is_featured = body.is_featured;

  for (const [key, value] of Object.entries(allowed)) {
    fields.push(`${key} = $${index++}`);
    values.push(value);
  }

  if (fields.length === 0) {
    return NextResponse.json({ error: 'No updatable fields provided.' }, { status: 400 });
  }

  fields.push('updated_at = now()');
  values.push(id);

  await run(
    `UPDATE expertise SET ${fields.join(', ')} WHERE id = $${index}`,
    values
  );

  const row = await get<any>('SELECT * FROM expertise WHERE id = $1', [id]);
  if (!row) {
    return NextResponse.json({ error: 'Entry not found.' }, { status: 404 });
  }
  return NextResponse.json(entryResponse(row));
}

export async function DELETE(request: Request) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('portfolio_session')?.value ?? null;
  const admin = await requireAdmin(sessionToken);
  if ('error' in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }
  const csrfCookie = cookieStore.get('portfolio_csrf')?.value ?? null;
  const csrfHeader = request.headers.get('x-csrf-token') ?? null;
  if (!validateCsrfToken(csrfHeader, csrfCookie)) {
    return NextResponse.json({ error: 'Invalid CSRF token.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get('id'));
  if (!id) {
    return NextResponse.json({ error: 'Entry id is required.' }, { status: 400 });
  }

  const row = await get<any>('SELECT id FROM expertise WHERE id = $1', [id]);
  if (!row) {
    return NextResponse.json({ error: 'Entry not found.' }, { status: 400 });
  }

  const confirm = searchParams.get('confirm');
  if (confirm !== 'delete') {
    return NextResponse.json(
      { error: 'Deletion requires confirmation. Include ?confirm=delete.' },
      { status: 400 }
    );
  }

  await run('DELETE FROM expertise WHERE id = $1', [id]);
  return NextResponse.json({ ok: true });
}
