import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { validateCsrfToken, requireAdmin } from '@/lib/auth';
import { get, query, run } from '@/lib/db';

export const runtime = 'nodejs';

function entryResponse(row: any) {
  return {
    id: row.id,
    position: row.position,
    organization: row.organization,
    start_date: row.start_date,
    end_date: row.end_date,
    is_current: Boolean(row.is_current),
    description: row.description,
    responsibilities: row.responsibilities ?? [],
    achievements: row.achievements ?? [],
    display_order: row.display_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function GET() {
  const rows = await query<any>(
    'SELECT * FROM experience ORDER BY display_order ASC, start_date DESC'
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

  const required = ['position', 'organization', 'start_date'];
  for (const field of required) {
    if (!body[field]) {
      return NextResponse.json({ error: `${field} is required.` }, { status: 400 });
    }
  }

  const isCurrent = Boolean(body.is_current);
  const endDate = isCurrent ? null : body.end_date || null;
  const responsibilities = JSON.stringify(body.responsibilities ?? []);
  const achievements = JSON.stringify(body.achievements ?? []);

  const row = await get<any>(
    `INSERT INTO experience (
       position, organization, start_date, end_date, is_current, description,
       responsibilities, achievements, display_order, created_at, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, now(), now())
     RETURNING *`,
    [
      body.position,
      body.organization,
      body.start_date,
      endDate,
      isCurrent,
      body.description ?? '',
      responsibilities,
      achievements,
      Number(body.display_order ?? 0),
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
  if (typeof body.position === 'string') allowed.position = body.position.trim();
  if (typeof body.organization === 'string') allowed.organization = body.organization.trim();
  if (typeof body.start_date === 'string') allowed.start_date = body.start_date;
  if (typeof body.end_date !== 'undefined') allowed.end_date = body.end_date === null ? null : body.end_date;
  if (typeof body.is_current === 'boolean') allowed.is_current = body.is_current;
  if (typeof body.description === 'string') allowed.description = body.description;
  if (Array.isArray(body.responsibilities)) allowed.responsibilities = JSON.stringify(body.responsibilities);
  if (Array.isArray(body.achievements)) allowed.achievements = JSON.stringify(body.achievements);
  if (typeof body.display_order === 'number') allowed.display_order = body.display_order;

  for (const [key, value] of Object.entries(allowed)) {
    fields.push(`${key} = $${index++}`);
    values.push(value);
  }

  if (fields.length === 0) {
    return NextResponse.json({ error: 'No updatable fields provided.' }, { status: 400 });
  }

  // A current position must not carry an end date.
  if (allowed.is_current === true) {
    fields.push('end_date = NULL');
  }

  fields.push('updated_at = now()');
  values.push(id);

  await run(
    `UPDATE experience SET ${fields.join(', ')} WHERE id = $${index}`,
    values
  );

  const row = await get<any>('SELECT * FROM experience WHERE id = $1', [id]);
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

  const row = await get<any>('SELECT id FROM experience WHERE id = $1', [id]);
  if (!row) {
    return NextResponse.json({ error: 'Entry not found.' }, { status: 404 });
  }

  // Confirmation token prevents accidental deletion via a single link.
  const confirm = searchParams.get('confirm');
  if (confirm !== 'delete') {
    return NextResponse.json(
      { error: 'Deletion requires confirmation. Include ?confirm=delete.' },
      { status: 400 }
    );
  }

  await run('DELETE FROM experience WHERE id = $1', [id]);
  return NextResponse.json({ ok: true });
}
