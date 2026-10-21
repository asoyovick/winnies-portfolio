import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { requireAdmin, validateCsrfToken } from '@/lib/auth';
import { get, run } from '@/lib/db';
import {
  ASSET_FOLDERS,
  MAX_PROFILE_IMAGE_SIZE,
  assetPublicUrl,
  changeAssetVisibility,
  deleteFile,
  storeFile,
  validateProfileImageBuffer,
} from '@/lib/storage';

export const runtime = 'nodejs';

/**
 * Winnie's profile picture.
 *
 * The image file is written to the storage directory (or to Supabase Storage);
 * the database only ever holds the asset's metadata and the reference to it
 * in the profile. The old file is removed once the profile points at the new
 * one, and only when nothing else refers to it.
 */

async function authenticate(request: Request) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('portfolio_session')?.value ?? null;
  const admin = await requireAdmin(sessionToken);
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
async function assetIsReferenced(assetId: number): Promise<boolean> {
  const profile = await get<any>(
    'SELECT profile_image_id, cv_media_id FROM profile_settings WHERE id = 1'
  );
  if (profile?.profile_image_id === assetId || profile?.cv_media_id === assetId) {
    return true;
  }
  const article = await get<any>(
    'SELECT id FROM articles WHERE featured_image_id = $1',
    [assetId]
  );
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
      // The profile picture is shown on the public site.
      visibility: 'public',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'That file could not be stored.' },
      { status: 400 }
    );
  }

  const previous = await get<any>(
    'SELECT profile_image_id FROM profile_settings WHERE id = 1'
  );
  const previousId = previous?.profile_image_id ?? null;

  let assetId: number;
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
        auth.admin.admin.id,
      ]
    );
    assetId = Number(row.id);

    await run(
      'UPDATE profile_settings SET profile_image_id = $1, updated_at = now() WHERE id = 1',
      [assetId]
    );
  } catch {
    // The file is stored but the profile could not be updated: remove the
    // orphaned file rather than leaving it behind.
    try {
      await deleteFile(stored.storageName, stored.bucket);
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
  if (previousId && previousId !== assetId && !(await assetIsReferenced(previousId))) {
    const old = await get<any>('SELECT * FROM media WHERE id = $1', [previousId]);
    if (old) {
      try {
        await deleteFile(old.storage_name, old.bucket);
      } catch {
        // The file stays on disk if it cannot be removed; the site still works.
      }
      await run('DELETE FROM media WHERE id = $1', [previousId]);
    }
  }

  const profile = await get<any>('SELECT * FROM profile_settings WHERE id = 1');

  return NextResponse.json({
    ok: true,
    asset: {
      id: assetId,
      original_name: stored.originalName,
      mime_type: stored.mimeType,
      size: stored.size,
      public_url: assetPublicUrl(stored.storageName, stored.bucket, stored.visibility),
      created_at: new Date().toISOString(),
    },
    profile,
  });
}

export async function DELETE(request: Request) {
  const auth = await authenticate(request);
  if ('error' in auth) return auth.error;

  const profile = await get<any>(
    'SELECT profile_image_id FROM profile_settings WHERE id = 1'
  );
  const assetId = profile?.profile_image_id ?? null;

  if (!assetId) {
    return NextResponse.json({
      ok: true,
      profile: await get<any>('SELECT * FROM profile_settings WHERE id = 1'),
    });
  }

  await run(
    'UPDATE profile_settings SET profile_image_id = NULL, updated_at = now() WHERE id = 1'
  );

  // Only delete the file when nothing else still points at it.
  if (!(await assetIsReferenced(assetId))) {
    const asset = await get<any>('SELECT * FROM media WHERE id = $1', [assetId]);
    if (asset) {
      try {
        await deleteFile(asset.storage_name, asset.bucket);
      } catch {
        // The record is still removed; the file simply stays in storage.
      }
      await run('DELETE FROM media WHERE id = $1', [assetId]);
    }
  }

  return NextResponse.json({
    ok: true,
    profile: await get<any>('SELECT * FROM profile_settings WHERE id = 1'),
  });
}

/** Used when an existing asset is chosen as the profile picture. */
export async function publishProfilePicture(assetId: number): Promise<void> {
  const asset = await get<any>('SELECT * FROM media WHERE id = $1', [assetId]);
  if (!asset || asset.visibility === 'public') return;
  const moved = await changeAssetVisibility({
    storageName: asset.storage_name,
    bucket: asset.bucket,
    visibility: 'public',
  });
  await run(
    'UPDATE media SET bucket = $1, storage_name = $2, updated_at = now() WHERE id = $3',
    [moved.bucket, moved.storageName, assetId]
  );
}
