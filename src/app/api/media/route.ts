import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { validateCsrfToken, requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { storeFile } from '@/lib/storage';
import { rateLimit, rateLimitKey } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const UPLOAD_LIMIT = { limit: 40, windowMs: 60 * 60 * 1000 }; // 40 uploads per hour per IP

function assetResponse(row: any) {
  return {
    id: row.id,
    original_name: row.original_name,
    storage_name: row.storage_name,
    mime_type: row.mime_type,
    size: row.size,
    width: row.width,
    height: row.height,
    public_url: row.path ? `/api/media/${encodeURIComponent(row.storage_name)}` : null,
    created_at: row.created_at,
  };
}

export async function GET() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('portfolio_session')?.value ?? null;
  const admin = requireAdmin(sessionToken);
  if ('error' in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const rows = db
    .prepare('SELECT * FROM media ORDER BY created_at DESC')
    .all() as any[];
  return NextResponse.json(rows.map(assetResponse));
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined;
  const rl = rateLimit(rateLimitKey(ip, 'upload'), UPLOAD_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many uploads. Try again later.' }, { status: 429 });
  }

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

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Unable to read upload.' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const stored = await storeFile({
      buffer,
      originalName: file.name,
    });

    const now = new Date().toISOString();
    const result = db.prepare(
      `INSERT INTO media (original_name, storage_name, mime_type, size, path, width, height, uploaded_by_admin_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      stored.originalName,
      stored.storageName,
      stored.mimeType,
      stored.size,
      stored.path,
      stored.width,
      stored.height,
      admin.admin.id,
      now
    );

    const row = db.prepare('SELECT * FROM media WHERE id = ?').get(result.lastInsertRowid);
    return NextResponse.json(assetResponse(row), { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Upload failed.' }, { status: 400 });
  }
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
    return NextResponse.json({ error: 'Media id is required.' }, { status: 400 });
  }

  const row = db.prepare('SELECT * FROM media WHERE id = ?').get(id) as any | undefined;
  if (!row) {
    return NextResponse.json({ error: 'Media item not found.' }, { status: 404 });
  }

  // Reference check: warn the owner if the asset is referenced by published content.
  const references: string[] = [];
  const profile = db.prepare('SELECT cv_media_id, profile_image_id, display_name FROM profile_settings WHERE id = 1').get() as any;
  if (profile.cv_media_id === id) references.push(`downloadable CV (profile of ${profile.display_name})`);
  if (profile.profile_image_id === id) references.push(`profile photograph`);
  const articles = db.prepare('SELECT title FROM articles WHERE featured_image_id = ?').all(id) as any[];
  for (const article of articles) {
    references.push(`featured image of article "${article.title}"`);
  }

  const confirm = searchParams.get('confirm');
  if (references.length > 0 && confirm !== 'force') {
    return NextResponse.json(
      {
        error: 'This asset is referenced by published content and cannot be deleted.',
        references,
        hint: 'Remove the references first, or retry with ?confirm=force to delete anyway.',
      },
      { status: 409 }
    );
  }

  try {
    await import('@/lib/storage').then((mod) => mod.deleteFile(row.storage_name));
  } catch {
    // File may already be missing; continue to remove the database record.
  }

  db.prepare('DELETE FROM media WHERE id = ?').run(id);
  return NextResponse.json({ ok: true, storage_name: row.storage_name });
}
