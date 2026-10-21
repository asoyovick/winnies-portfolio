import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { validateCsrfToken, requireAdmin, authenticateRequest } from '@/lib/auth';
import { get, query, run } from '@/lib/db';
import { slugify } from '@/lib/validation';

export const runtime = 'nodejs';

function articleResponse(row: any) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    body: row.body,
    featured_image_id: row.featured_image_id,
    status: row.status,
    published_at: row.published_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function isAdminRequest(request: Request): Promise<boolean> {
  const sessionToken =
    request.headers.get('cookie')?.match(/portfolio_session=([^;]+)/)?.[1] ?? null;
  const result = await authenticateRequest(sessionToken);
  return result.ok;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const admin = await isAdminRequest(request);
  const slug = searchParams.get('slug');

  if (slug) {
    const row = await get<any>('SELECT * FROM articles WHERE slug = $1', [slug]);
    if (!row) {
      return NextResponse.json({ error: 'Article not found.' }, { status: 404 });
    }
    if (row.status !== 'published' && !admin) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    }
    return NextResponse.json(articleResponse(row));
  }

  const rows = admin
    ? await query<any>('SELECT * FROM articles ORDER BY updated_at DESC')
    : await query<any>(
        `SELECT * FROM articles WHERE status = 'published'
         ORDER BY published_at DESC, updated_at DESC`
      );
  return NextResponse.json(rows.map(articleResponse));
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

  let slug = body.slug || slugify(body.title);
  if (!slug) slug = `article-${Date.now()}`;
  let uniqueSlug = slug;
  let counter = 1;
  while ((await get<any>('SELECT id FROM articles WHERE slug = $1', [uniqueSlug]))) {
    uniqueSlug = `${slug}-${counter++}`;
  }

  const status: 'draft' | 'published' =
    body.status === 'published' ? 'published' : 'draft';
  const publishedAt =
    status === 'published' && !body.published_at ? new Date().toISOString() : body.published_at || null;

  const row = await get<any>(
    `INSERT INTO articles (
       title, slug, summary, body, featured_image_id, status, published_at,
       created_at, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, now(), now())
     RETURNING *`,
    [
      body.title,
      uniqueSlug,
      body.summary ?? '',
      body.body ?? '',
      body.featured_image_id === null || body.featured_image_id === undefined
        ? null
        : Number(body.featured_image_id),
      status,
      publishedAt,
    ]
  );
  return NextResponse.json(articleResponse(row), { status: 201 });
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
    return NextResponse.json({ error: 'Article id is required.' }, { status: 400 });
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  let index = 1;

  const allowed: Record<string, unknown> = {};
  if (typeof body.title === 'string') allowed.title = body.title.trim();
  if (typeof body.summary === 'string') allowed.summary = body.summary;
  if (typeof body.body === 'string') allowed.body = body.body;
  if (typeof body.slug === 'string') allowed.slug = body.slug.trim();
  if (typeof body.featured_image_id !== 'undefined') {
    allowed.featured_image_id =
      body.featured_image_id === null ? null : Number(body.featured_image_id);
  }
  if (typeof body.status === 'string') allowed.status = body.status;
  if (typeof body.published_at !== 'undefined') {
    allowed.published_at = body.published_at === null ? null : body.published_at;
  }

  for (const [key, value] of Object.entries(allowed)) {
    fields.push(`${key} = $${index++}`);
    values.push(value);
  }

  if (fields.length === 0) {
    return NextResponse.json({ error: 'No updatable fields provided.' }, { status: 400 });
  }

  if (allowed.status === 'published' && !allowed.published_at) {
    const existing = await get<any>(
      'SELECT published_at FROM articles WHERE id = $1',
      [id]
    );
    fields.push(`published_at = $${index++}`);
    values.push(
      existing && existing.published_at ? existing.published_at : new Date().toISOString()
    );
  }

  fields.push('updated_at = now()');
  values.push(id);

  await run(`UPDATE articles SET ${fields.join(', ')} WHERE id = $${index}`, values);

  const row = await get<any>('SELECT * FROM articles WHERE id = $1', [id]);
  if (!row) {
    return NextResponse.json({ error: 'Article not found.' }, { status: 404 });
  }
  return NextResponse.json(articleResponse(row));
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
    return NextResponse.json({ error: 'Article id is required.' }, { status: 400 });
  }

  const row = await get<any>('SELECT id FROM articles WHERE id = $1', [id]);
  if (!row) {
    return NextResponse.json({ error: 'Article id is required.' }, { status: 400 });
  }

  const confirm = searchParams.get('confirm');
  if (confirm !== 'delete') {
    return NextResponse.json(
      { error: 'Deletion requires confirmation. Include ?confirm=delete.' },
      { status: 400 }
    );
  }

  await run('DELETE FROM articles WHERE id = $1', [id]);
  return NextResponse.json({ ok: true });
}
