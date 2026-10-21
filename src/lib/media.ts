import { get, run } from './db';
import type { MediaAsset } from './db';
import { assetPublicUrl, changeAssetVisibility } from './storage';

/**
 * Helpers shared by the media routes.
 */

/** The shape an asset takes in an API response. */
export function assetResponse(row: MediaAsset) {
  return {
    id: row.id,
    original_name: row.original_name,
    storage_name: row.storage_name,
    mime_type: row.mime_type,
    size: row.size,
    width: row.width,
    height: row.height,
    bucket: row.bucket,
    visibility: row.visibility,
    public_url: assetPublicUrl(row.storage_name, row.bucket, row.visibility),
    created_at: row.created_at,
  };
}

/**
 * Makes an asset public: the file is copied to the public bucket and the
 * reference updated. The asset is never left pointing at a missing file.
 */
export async function publishAsset(assetId: number): Promise<void> {
  const asset = await get<MediaAsset>('SELECT * FROM media WHERE id = $1', [assetId]);
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
