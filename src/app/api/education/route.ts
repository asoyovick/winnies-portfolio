import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { validateCsrfToken, requireAdmin } from '@/lib/auth';
import { get, query, run } from '@/lib/db';

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
  const rows = await query<any>(
    'SELECT * FROM education ORDER BY display_order ASC, created_at DESC'
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

  for (const field of ['institution', 'qualification', 'status']) {
    if (!body[field]) {
      return NextResponse.json({ error: `${field} is required.` }, { status: 400 });
    }
  }

  // Ongoing qualifications do not require completion dates.
  const endDate = body.status === 'ongoing' ? null : body.end_date || null;

  const row = await get<any>(
    `INSERT INTO education (
       institution, qualification, field_of_study, start_date, end_date,
       status, description, display_order, created_at, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), now())
     RETURNING *`,
    [
      body.institution,
      body.qualification,
      body.field_of_study ?? '',
      body.start_date || null,
      endDate,
      body.status,
      body.description ?? '',
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
  if (typeof body.institution === 'string') allowed.institution = body.institution.trim();
  if (typeof body.qualification === 'string') allowed.qualification = body.qualification.trim();
  if (typeof body.field_of_study === 'string') allowed.field_of_study = body.field_of_study.trim();
  if (typeof body.start_date !== 'undefined') allowed.start_date = body.start_date || null;
  if (typeof body.end_date !== 'undefined') allowed.end_date = body.end_date === null ? null : body.end_date;
  if (typeof body.status === 'string') allowed.status = body.status;
  if (typeof body.description === 'string') allowed.description = body.description;
  if (typeof body.display_order === 'number') allowed.display_order = body.display_order;

  for (const [key, value] of Object.entries(allowed)) {
    fields.push(`${key} = $${index++}`);
    values.push(value);
  }

  if (fields.length === 0) {
    return NextResponse.json({ error: 'No updatable fields provided.' }, { status: 400 });
  }

  if (allowed.status === 'ongoing') {
    fields.push('end_date = NULL');
  }

  fields.push('updated_at = now()');
  values.push(id);

  await run(
    `UPDATE education SET ${fields.join(', ')} WHERE id = $${index}`,
    values
  );

  const row = await get<any>('SELECT * FROM education WHERE id = $1', [id]);
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

  const row = await get<any>('SELECT id FROM education WHERE id = $1', [id]);
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

  await run('DELETE FROM education WHERE id = $1', [id]);
  return NextResponse.json({ ok: true });
}
