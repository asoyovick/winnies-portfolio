import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { validateCsrfToken, requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

function entryResponse(row: any) {
  return {
    id: row.id,
    institution: row.institution,
    qualification: row.qualification,
    field_of_study: row.field_of_study,
    start_date: row.start_date,
    end_date: row.end_date,
    status: row.status,
    description: row.description,
    display_order: row.display_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function GET() {
  const rows = db
    .prepare('SELECT * FROM education ORDER BY display_order ASC, created_at DESC')
    .all() as any[];
  return NextResponse.json(rows.map(entryResponse));
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('portfolio_session')?.value ?? null;
  const admin = requireAdmin(sessionToken);
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

  for (const field of ['institution', 'qualification', 'status']) {
    if (!body[field]) {
      return NextResponse.json({ error: `${field} is required.` }, { status: 400 });
    }
  }

  const now = new Date().toISOString();
  // Ongoing qualifications do not require completion dates.
  const endDate = body.status === 'ongoing' ? null : body.end_date || null;

  const result = db.prepare(
    `INSERT INTO education (institution, qualification, field_of_study, start_date, end_date, status, description, display_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    body.institution,
    body.qualification,
    body.field_of_study ?? '',
    body.start_date || null,
    endDate,
    body.status,
    body.description ?? '',
    Number(body.display_order ?? 0),
    now,
    now
  );

  const row = db.prepare('SELECT * FROM education WHERE id = ?').get(result.lastInsertRowid);
  return NextResponse.json(entryResponse(row), { status: 201 });
}

export async function PUT(request: Request) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('portfolio_session')?.value ?? null;
  const admin = requireAdmin(sessionToken);
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

  const now = new Date().toISOString();
  const fields: string[] = [];
  const values: unknown[] = [];

  const allowed: Record<string, unknown> = {};
  if (typeof body.institution === 'string') allowed.institution = body.institution.trim();
  if (typeof body.qualification === 'string') allowed.qualification = body.qualification.trim();
  if (typeof body.field_of_study === 'string') allowed.field_of_study = body.field_of_study.trim();
  if (typeof body.start_date !== 'undefined') allowed.start_date = body.start_date || null;
  if (typeof body.end_date !== 'undefined') allowed.end_date = body.end_date === null ? null : body.end_date;
  if (typeof body.status === 'string') allowed.status = body.status;
  if (typeof body.description === 'string') allowed.description = body.description;
  if (typeof body.display_order === 'number') allowed.display_order = body.display_order;

  for (const [key, value] of Object.entries(allowed)) {
    fields.push(`${key} = ?`);
    values.push(value);
  }

  if (fields.length === 0) {
    return NextResponse.json({ error: 'No updatable fields provided.' }, { status: 400 });
  }

  if (allowed.status === 'ongoing') {
    fields.push('end_date = ?');
    values.push(null);
  }

  fields.push('updated_at = ?');
  values.push(now, id);

  db.prepare(`UPDATE education SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  const row = db.prepare('SELECT * FROM education WHERE id = ?').get(id);
  if (!row) {
    return NextResponse.json({ error: 'Entry not found.' }, { status: 404 });
  }
  return NextResponse.json(entryResponse(row));
}

export async function DELETE(request: Request) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('portfolio_session')?.value ?? null;
  const admin = requireAdmin(sessionToken);
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

  const row = db.prepare('SELECT id FROM education WHERE id = ?').get(id);
  if (!row) {
    return NextResponse.json({ error: 'Entry not found.' }, { status: 404 });
  }

  const confirm = searchParams.get('confirm');
  if (confirm !== 'delete') {
    return NextResponse.json(
      { error: 'Deletion requires confirmation. Include ?confirm=delete.' },
      { status: 400 }
    );
  }

  db.prepare('DELETE FROM education WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
