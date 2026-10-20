import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { requireAdmin, validateCsrfToken } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  ASSET_FOLDERS,
  MAX_PROFILE_IMAGE_SIZE,
  assetPublicUrl,
  deleteFile,
  storeFile,
  validateProfileImageBuffer,
} from '@/lib/storage';

export const runtime = 'nodejs';

/**
 * Winnie's profile picture.
 *
 * The image file is written to the storage directory (or the object store);
 * the database only ever holds the asset's metadata and the reference to it
 * in the profile. The old file is removed once the profile points at the new
 * one, and only when nothing else refers to it.
 */

async function authenticate(request: Request) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('portfolio_session')?.value ?? null;
  const admin = requireAdmin(sessionToken);
  if ('error' in admin) {
    return { error: NextResponse.json({ error: admin.error }, { status: admin.status }) };
  }
  const csrfCookie = cookieStore.get('portfolio_csrf')?.value ?? null;
  const csrfHeader = request.headers.get('x-csrf-token') ?? null;
  if (!validateCsrfToken(csrfHeader, csrfCookie)) {
    return {
      error: NextResponse.json({ error: 'Invalid CSRF token.' }, { status: 403 }),
    };
  }
  return { admin };
}

/** Is this asset still referenced by the profile or by an article? */
function assetIsReferenced(assetId: number): boolean {
  const profile = db
    .prepare('SELECT profile_image_id, cv_media_id FROM profile_settings WHERE id = 1')
    .get() as { profile_image_id: number | null; cv_media_id: number | null } | undefined;
  if (profile?.profile_image_id === assetId || profile?.cv_media_id === assetId) {
    return true;
  }
  const article = db
    .prepare('SELECT id FROM articles WHERE featured_image_id = ?')
    .get(assetId);
  return Boolean(article);
}

export async function POST(request: Request) {
  const auth = await authenticate(request);
  if ('error' in auth) return auth.error;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Unable to read the upload.' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Choose an image to upload.' }, { status: 400 });
  }
  if (file.size > MAX_PROFILE_IMAGE_SIZE) {
    return NextResponse.json(
      {
        error: `That image is too large. The maximum size is ${Math.round(
          MAX_PROFILE_IMAGE_SIZE / 1024 / 1024
        )} MB.`,
      },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let stored;
  try {
    // Validated on the file's own bytes, not on its name or the type the
    // browser claims.
    await validateProfileImageBuffer(buffer, file.name);
    stored = await storeFile({
      buffer,
      originalName: file.name,
      folder: ASSET_FOLDERS.profile,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'That file could not be stored.' },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const previous = db
    .prepare('SELECT profile_image_id FROM profile_settings WHERE id = 1')
    .get() as { profile_image_id: number | null } | undefined;
  const previousId = previous?.profile_image_id ?? null;

  let assetId: number;
  try {
    const result = db
      .prepare(
        `INSERT INTO media (original_name, storage_name, mime_type, size, path, width, height, uploaded_by_admin_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        stored.originalName,
        stored.storageName,
        stored.mimeType,
        stored.size,
        stored.path,
        stored.width,
        stored.height,
        auth.admin.admin.id,
        now
      );
    assetId = Number(result.lastInsertRowid);

    db.prepare(
      'UPDATE profile_settings SET profile_image_id = ?, updated_at = ? WHERE id = 1'
    ).run(assetId, now);
  } catch {
    // The file is stored but the profile could not be updated: remove the
    // orphaned file rather than leaving it behind.
    try {
      await deleteFile(stored.storageName);
    } catch {
      // Nothing more we can do; the file is harmless on its own.
    }
    return NextResponse.json(
      { error: 'The picture could not be attached to the profile. Nothing was changed.' },
      { status: 500 }
    );
  }

  // The old picture is removed only now that the profile points at the new
  // one, and only if nothing else still refers to it.
  if (previousId && previousId !== assetId && !assetIsReferenced(previousId)) {
    const old = db.prepare('SELECT storage_name FROM media WHERE id = ?').get(previousId) as
      | { storage_name: string }
      | undefined;
    if (old) {
      try {
        await deleteFile(old.storage_name);
      } catch {
        // The file stays on disk if it cannot be removed; the site still works.
      }
      db.prepare('DELETE FROM media WHERE id = ?').run(previousId);
    }
  }

  const profile = db.prepare('SELECT * FROM profile_settings WHERE id = 1').get();

  return NextResponse.json({
    ok: true,
    asset: {
      id: assetId,
      original_name: stored.originalName,
      mime_type: stored.mimeType,
      size: stored.size,
      public_url: assetPublicUrl(stored.storageName),
      created_at: now,
    },
    profile,
  });
}

export async function DELETE(request: Request) {
  const auth = await authenticate(request);
  if ('error' in auth) return auth.error;

  const profile = db
    .prepare('SELECT profile_image_id FROM profile_settings WHERE id = 1')
    .get() as { profile_image_id: number | null } | undefined;
  const assetId = profile?.profile_image_id ?? null;

  if (!assetId) {
    return NextResponse.json({ ok: true, profile });
  }

  const now = new Date().toISOString();
  db.prepare('UPDATE profile_settings SET profile_image_id = NULL, updated_at = ? WHERE id = 1').run(now);

  // Only delete the file when nothing else still points at it.
  if (!assetIsReferenced(assetId)) {
    const asset = db.prepare('SELECT storage_name FROM media WHERE id = ?').get(assetId) as
      | { storage_name: string }
      | undefined;
    if (asset) {
      try {
        await deleteFile(asset.storage_name);
      } catch {
        // The record is still removed; the file simply stays on disk.
      }
      db.prepare('DELETE FROM media WHERE id = ?').run(assetId);
    }
  }

  return NextResponse.json({
    ok: true,
    profile: db.prepare('SELECT * FROM profile_settings WHERE id = 1').get(),
  });
}
