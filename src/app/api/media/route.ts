import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { validateCsrfToken, requireAdmin } from '@/lib/auth';
import { get, query, run } from '@/lib/db';
import { deleteFile, storeFile } from '@/lib/storage';
import { assetResponse } from '@/lib/media';
import { rateLimit, rateLimitKey } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const UPLOAD_LIMIT = { limit: 40, windowMs: 60 * 60 * 1000 }; // 40 uploads per hour per IP

export async function GET() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('portfolio_session')?.value ?? null;
  const admin = await requireAdmin(sessionToken);
  if ('error' in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const rows = await query<any>('SELECT * FROM media ORDER BY created_at DESC');
  return NextResponse.json(rows.map(assetResponse));
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined;
  const rl = await rateLimit(rateLimitKey(ip, 'upload'), UPLOAD_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many uploads. Try again later.' }, { status: 429 });
  }

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

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Unable to read upload.' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let stored;
  try {
    stored = await storeFile({
      buffer,
      originalName: file.name,
      visibility: 'private',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Upload failed.' },
      { status: 400 }
    );
  }

  try {
    const row = await get<any>(
      `INSERT INTO media (
         original_name, storage_name, mime_type, size, path, bucket, visibility,
         width, height, uploaded_by_admin_id, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
       RETURNING *`,
      [
        stored.originalName,
        stored.storageName,
        stored.mimeType,
        stored.size,
        stored.path,
        stored.bucket,
        stored.visibility,
        stored.width,
        stored.height,
        admin.admin.id,
      ]
    );
    return NextResponse.json(assetResponse(row), { status: 201 });
  } catch {
    // The file is stored but the record could not be written: remove the
    // orphaned file rather than leaving it behind.
    try {
      await deleteFile(stored.storageName, stored.bucket);
    } catch {
      // Nothing more we can do; the file is harmless on its own.
    }
    return NextResponse.json(
      { error: 'The upload could not be recorded. Nothing was stored.' },
      { status: 500 }
    );
  }
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

  let body: { id?: number; replacement_id?: number };
  try {
    body = (await request.json()) as { id?: number; replacement_id?: number };
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const id = Number(body.id);
  const replacementId = Number(body.replacement_id);
  if (!id || !replacementId || id === replacementId) {
    return NextResponse.json(
      { error: 'A different replacement asset is required.' },
      { status: 400 }
    );
  }

  const current = await get<any>('SELECT * FROM media WHERE id = $1', [id]);
  const replacement = await get<any>('SELECT * FROM media WHERE id = $1', [replacementId]);
  if (!current || !replacement) {
    return NextResponse.json({ error: 'Media item not found.' }, { status: 404 });
  }

  // Move every reference to the replacement, then remove the old file.
  await run(
    'UPDATE profile_settings SET profile_image_id = $1 WHERE profile_image_id = $2',
    [replacementId, id]
  );
  await run('UPDATE profile_settings SET cv_media_id = $1 WHERE cv_media_id = $2', [
    replacementId,
    id,
  ]);
  await run(
    'UPDATE articles SET featured_image_id = $1 WHERE featured_image_id = $2',
    [replacementId, id]
  );
  await run('UPDATE profile_settings SET updated_at = now() WHERE id = 1');

  try {
    await deleteFile(current.storage_name, current.bucket);
  } catch {
    // The file may already be gone; the database record is still removed.
  }
  await run('DELETE FROM media WHERE id = $1', [id]);

  const row = await get<any>('SELECT * FROM media WHERE id = $1', [replacementId]);
  return NextResponse.json(assetResponse(row));
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
    return NextResponse.json({ error: 'Media id is required.' }, { status: 400 });
  }

  const row = await get<any>('SELECT * FROM media WHERE id = $1', [id]);
  if (!row) {
    return NextResponse.json({ error: 'Media item not found.' }, { status: 404 });
  }

  // Reference check: warn the owner if the asset is referenced by published content.
  const references: string[] = [];
  const profile = await get<any>(
    'SELECT cv_media_id, profile_image_id, display_name FROM profile_settings WHERE id = 1'
  );
  if (profile?.cv_media_id === id) references.push(`downloadable CV (profile of ${profile.display_name})`);
  if (profile?.profile_image_id === id) references.push(`profile photograph`);
  const articles = await query<any>(
    'SELECT title FROM articles WHERE featured_image_id = $1',
    [id]
  );
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
    await deleteFile(row.storage_name, row.bucket);
  } catch {
    // The file may already be missing; the database record is still removed.
  }

  await run('DELETE FROM media WHERE id = $1', [id]);
  return NextResponse.json({ ok: true, storage_name: row.storage_name });
}
