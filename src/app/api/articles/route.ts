import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { validateCsrfToken, requireAdmin } from '@/lib/auth';
import { authenticateRequest } from '@/lib/auth';
import { db } from '@/lib/db';
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

function isAdminRequest(request: Request): boolean {
  const sessionToken = request.headers.get('cookie')?.match(/portfolio_session=([^;]+)/)?.[1] ?? null;
  const result = authenticateRequest(sessionToken);
  return result.ok;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const admin = isAdminRequest(request);
  const slug = searchParams.get('slug');

  if (slug) {
    const row = db.prepare('SELECT * FROM articles WHERE slug = ?').get(slug) as any | undefined;
    if (!row) {
      return NextResponse.json({ error: 'Article not found.' }, { status: 404 });
    }
    if (row.status !== 'published' && !admin) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    }
    return NextResponse.json(articleResponse(row));
  }

  const rows = db
    .prepare(admin ? 'SELECT * FROM articles ORDER BY updated_at DESC' : 'SELECT * FROM articles WHERE status = ? ORDER BY published_at DESC, updated_at DESC')
    .all(admin ? [] : ['published']) as any[];
  return NextResponse.json(rows.map(articleResponse));
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

  if (!body.title) {
    return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
  }

  let slug = body.slug || slugify(body.title);
  if (!slug) slug = `article-${Date.now()}`;
  let uniqueSlug = slug;
  let counter = 1;
  while (db.prepare('SELECT id FROM articles WHERE slug = ?').get(uniqueSlug)) {
    uniqueSlug = `${slug}-${counter++}`;
  }

  const now = new Date().toISOString();
  const status: 'draft' | 'published' = body.status === 'published' ? 'published' : 'draft';
  const publishedAt = status === 'published' && !body.published_at ? now : body.published_at || null;

  const result = db.prepare(
    `INSERT INTO articles (title, slug, summary, body, featured_image_id, status, published_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    body.title,
    uniqueSlug,
    body.summary ?? '',
    body.body ?? '',
    body.featured_image_id === null || body.featured_image_id === undefined ? null : Number(body.featured_image_id),
    status,
    publishedAt,
    now,
    now
  );

  const row = db.prepare('SELECT * FROM articles WHERE id = ?').get(result.lastInsertRowid);
  return NextResponse.json(articleResponse(row), { status: 201 });
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
    return NextResponse.json({ error: 'Article id is required.' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const fields: string[] = [];
  const values: unknown[] = [];

  const allowed: Record<string, unknown> = {};
  if (typeof body.title === 'string') allowed.title = body.title.trim();
  if (typeof body.summary === 'string') allowed.summary = body.summary;
  if (typeof body.body === 'string') allowed.body = body.body;
  if (typeof body.slug === 'string') allowed.slug = body.slug.trim();
  if (typeof body.featured_image_id !== 'undefined') {
    allowed.featured_image_id = body.featured_image_id === null ? null : Number(body.featured_image_id);
  }
  if (typeof body.status === 'string') allowed.status = body.status;
  if (typeof body.published_at !== 'undefined') allowed.published_at = body.published_at === null ? null : body.published_at;
  if (typeof body.display_order === 'number') allowed.display_order = body.display_order;

  for (const [key, value] of Object.entries(allowed)) {
    fields.push(`${key} = ?`);
    values.push(value);
  }

  if (fields.length === 0) {
    return NextResponse.json({ error: 'No updatable fields provided.' }, { status: 400 });
  }

  if (allowed.status === 'published' && !allowed.published_at) {
    const existing = db.prepare('SELECT published_at FROM articles WHERE id = ?').get(id) as any;
    fields.push('published_at = ?');
    values.push((existing && existing.published_at) ? existing.published_at : now);
  }

  fields.push('updated_at = ?');
  values.push(now, id);

  db.prepare(`UPDATE articles SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  const row = db.prepare('SELECT * FROM articles WHERE id = ?').get(id);
  if (!row) {
    return NextResponse.json({ error: 'Article not found.' }, { status: 404 });
  }
  return NextResponse.json(articleResponse(row));
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
    return NextResponse.json({ error: 'Article id is required.' }, { status: 400 });
  }

  const row = db.prepare('SELECT id FROM articles WHERE id = ?').get(id);
  if (!row) {
    return NextResponse.json({ error: 'Article not found.' }, { status: 404 });
  }

  const confirm = searchParams.get('confirm');
  if (confirm !== 'delete') {
    return NextResponse.json(
      { error: 'Deletion requires confirmation. Include ?confirm=delete.' },
      { status: 400 }
    );
  }

  db.prepare('DELETE FROM articles WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
