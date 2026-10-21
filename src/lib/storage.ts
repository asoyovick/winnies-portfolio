import { createHash, randomUUID } from 'crypto';
import { promises as fs, createReadStream } from 'fs';
import { join, dirname } from 'path';
import { Readable } from 'stream';
import { fileTypeFromBuffer } from 'file-type';

/**
 * File storage for the portfolio.
 *
 * Three drivers are supported and selected explicitly by configuration:
 *
 *   * filesystem — the default for local development. Files live under
 *     MEDIA_DIR and are served by the application.
 *   * s3         — any S3-compatible object store (the S3_* variables).
 *   * supabase   — Supabase Storage, using the service-role key on the
 *     server only. This is what the production deployment uses.
 *
 * Only the storage location changes between the drivers; the rest of the
 * application works with a storage key ("profile/9f2c1ab4cd11.png") and the
 * public path built from it.
 */

const MEDIA_DIR = process.env.MEDIA_DIR || 'data/uploads';
const MEDIA_BASE_URL = process.env.MEDIA_BASE_URL || '/api/media';

const S3_ENDPOINT = process.env.S3_ENDPOINT;
const S3_BUCKET = process.env.S3_BUCKET;
const S3_REGION = process.env.S3_REGION || 'us-east-1';
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID;
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY;
const S3_PUBLIC_BASE_URL = process.env.S3_PUBLIC_BASE_URL;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const PUBLIC_BUCKET =
  process.env.SUPABASE_PUBLIC_BUCKET || 'portfolio-public';
export const PRIVATE_BUCKET =
  process.env.SUPABASE_PRIVATE_BUCKET || 'portfolio-private';

export type StorageDriverName = 'filesystem' | 's3' | 'supabase';

export function storageDriver(): StorageDriverName {
  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) return 'supabase';
  if (S3_ENDPOINT && S3_BUCKET && S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY) {
    return 's3';
  }
  return 'filesystem';
}

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
export const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Where each kind of asset is kept inside the storage directory. The folder
 * is part of the storage key, so the same layout works on a filesystem and in
 * an object store.
 */
export const ASSET_FOLDERS = {
  profile: 'profile',
  general: 'media',
} as const;

export type AssetFolder = (typeof ASSET_FOLDERS)[keyof typeof ASSET_FOLDERS];

export type AssetVisibility = 'public' | 'private';

export type StoredAsset = {
  storageName: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  bucket: string | null;
  visibility: AssetVisibility;
  width: number | null;
  height: number | null;
  publicUrl: string;
};

type S3Client = import('@aws-sdk/client-s3').S3Client;

let s3Client: S3Client | null = null;

// Allowed MIME types. Active content (HTML, scripts, SVG, executables) is
// explicitly excluded.
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

function safeExtension(originalName: string, mimeType: string): string {
  const fallback = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'application/pdf': '.pdf',
  }[mimeType] ?? '.bin';
  const match = originalName.match(/\.([^./]+)$/);
  const ext = match ? `.${match[1]}` : fallback;
  // Only keep safe characters in the extension.
  const safe = ext.replace(/[^a-z0-9.]/gi, '').toLowerCase();
  return safe || fallback;
}

/**
 * A storage key is a relative path built by this module: a folder (if any)
 * and a generated file name. Anything else — a path from a URL, a name with a
 * slash in it — is refused, so a request can never walk out of the storage
 * directory.
 */
const SAFE_KEY = /^[a-z0-9][a-z0-9._-]*(\/[a-z0-9][a-z0-9._-]*)*$/;

export function isSafeStorageKey(key: string): boolean {
  if (!key || key.length > 200) return false;
  if (key.includes('..')) return false;
  if (key.includes('\\') || key.includes('\0')) return false;
  return SAFE_KEY.test(key);
}

function safeStorageName(
  originalName: string,
  mimeType: string,
  folder?: string
): string {
  const random = randomUUID().replace(/-/g, '');
  const hash = createHash('sha256')
    .update(`${random}:${Date.now()}`)
    .digest('hex')
    .slice(0, 12);
  const name = `${hash}.${safeExtension(originalName, mimeType).slice(1)}`;
  return folder ? `${folder}/${name}` : name;
}

function isAllowedMime(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.has(mimeType.toLowerCase());
}

async function ensureLocalDir(): Promise<void> {
  await fs.mkdir(MEDIA_DIR, { recursive: true });
}

function localPath(storageName: string): string {
  if (!isSafeStorageKey(storageName)) {
    throw new Error('Invalid storage key.');
  }
  // The directory is configurable at runtime, so it is resolved at request time
  // rather than traced into the build output.
  return join(/* turbopackIgnore: true */ MEDIA_DIR, storageName);
}

function bucketFor(visibility: AssetVisibility): string {
  return visibility === 'public' ? PUBLIC_BUCKET : PRIVATE_BUCKET;
}

export function assetPublicUrl(
  storageName: string,
  bucket?: string | null,
  visibility: AssetVisibility = 'private'
): string {
  const encoded = storageName.split('/').map(encodeURIComponent).join('/');

  if (bucket && storageDriver() === 'supabase' && SUPABASE_URL) {
    // Supabase serves public objects from a stable, cacheable address.
    if (visibility === 'public') {
      return `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/${bucket}/${encoded}`;
    }
    return `${MEDIA_BASE_URL}/${encoded}`;
  }

  if (bucket && storageDriver() === 's3' && S3_PUBLIC_BASE_URL) {
    return `${S3_PUBLIC_BASE_URL.replace(/\/$/, '')}/${encoded}`;
  }

  return `${MEDIA_BASE_URL}/${encoded}`;
}

async function getS3Client(): Promise<S3Client> {
  if (!s3Client) {
    // Imported on demand so the module is not loaded when S3 is not configured.
    const { S3Client } = await import('@aws-sdk/client-s3');
    s3Client = new S3Client({
      region: S3_REGION,
      endpoint: S3_ENDPOINT,
      credentials: {
        accessKeyId: S3_ACCESS_KEY_ID as string,
        secretAccessKey: S3_SECRET_ACCESS_KEY as string,
      },
      // Force path-style for MinIO and other S3-compatible endpoints.
      forcePathStyle: !S3_ENDPOINT?.includes('amazonaws.com'),
    });
  }
  return s3Client;
}

let supabaseClientPromise: Promise<
  import('@supabase/supabase-js').SupabaseClient
> | null = null;

async function getSupabaseClient(): Promise<
  import('@supabase/supabase-js').SupabaseClient
> {
  if (!supabaseClientPromise) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase Storage is not configured.');
    }
    // The service-role key is only ever used here, on the server.
    const { createClient } = await import('@supabase/supabase-js');
    supabaseClientPromise = Promise.resolve(
      createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    );
  }
  return supabaseClientPromise;
}

/** Whether a stored asset is still on disk (or in the bucket). */
export async function assetExists(
  storageName: string,
  bucket?: string | null
): Promise<boolean> {
  if (!isSafeStorageKey(storageName)) return false;

  if (storageDriver() === 'supabase') {
    const target = bucket || PRIVATE_BUCKET;
    try {
      const { error } = await (await getSupabaseClient())
        .storage.from(target)
        .download(storageName);
      return !error;
    } catch {
      return false;
    }
  }

  if (storageDriver() === 's3') {
    try {
      const { HeadObjectCommand } = await import('@aws-sdk/client-s3');
      await (await getS3Client()).send(
        new HeadObjectCommand({ Bucket: S3_BUCKET!, Key: storageName })
      );
      return true;
    } catch {
      return false;
    }
  }

  try {
    await fs.access(localPath(storageName));
    return true;
  } catch {
    return false;
  }
}

export async function validateFileBuffer(
  buffer: Buffer,
  originalName: string,
  maxSize: number = MAX_FILE_SIZE
): Promise<{ mimeType: string; ext: string }> {
  if (!buffer || buffer.length === 0) {
    throw new Error('The file is empty.');
  }
  if (buffer.length > maxSize) {
    throw new Error(
      `File is too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)} MB.`
    );
  }

  // MIME-type check from file signature (magic bytes), not just extension.
  const detected = await fileTypeFromBuffer(buffer);
  const mimeType = detected?.mime;
  if (!mimeType || !isAllowedMime(mimeType)) {
    throw new Error(
      'Unsupported file type. Only JPEG, PNG, WebP images and PDF documents are allowed.'
    );
  }

  // The extension should agree with the detected type.
  const ext = safeExtension(originalName, mimeType);
  return { mimeType, ext };
}

/** Profile pictures: images only, and smaller than other uploads. */
export async function validateProfileImageBuffer(
  buffer: Buffer,
  originalName: string
): Promise<{ mimeType: string; ext: string }> {
  const result = await validateFileBuffer(
    buffer,
    originalName,
    MAX_PROFILE_IMAGE_SIZE
  );
  if (!result.mimeType.startsWith('image/')) {
    throw new Error('The profile picture must be an image (JPEG, PNG or WebP).');
  }
  return result;
}

/**
 * Saves an uploaded file.
 *
 * The file itself never goes into the database: only its metadata and the
 * storage key do.
 */
export async function storeFile({
  buffer,
  originalName,
  folder,
  visibility = 'private',
}: {
  buffer: Buffer;
  originalName: string;
  folder?: string;
  visibility?: AssetVisibility;
}): Promise<StoredAsset> {
  const { mimeType } = await validateFileBuffer(buffer, originalName);
  const storageName = safeStorageName(originalName, mimeType, folder);
  const driver = storageDriver();

  if (driver === 'supabase') {
    const bucket = bucketFor(visibility);
    const { error } = await (await getSupabaseClient())
      .storage.from(bucket)
      .upload(storageName, buffer, {
        contentType: mimeType,
        cacheControl: '31536000',
        upsert: false,
      });
    if (error) {
      throw new Error(error.message || 'The file could not be stored.');
    }
    return {
      storageName,
      originalName,
      mimeType,
      size: buffer.length,
      path: storageName,
      bucket,
      visibility,
      width: null,
      height: null,
      publicUrl: assetPublicUrl(storageName, bucket, visibility),
    };
  }

  if (driver === 's3') {
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    await (await getS3Client()).send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: storageName,
        Body: buffer,
        ContentType: mimeType,
        ContentDisposition: 'inline',
      })
    );
    return {
      storageName,
      originalName,
      mimeType,
      size: buffer.length,
      path: storageName,
      bucket: null,
      visibility,
      width: null,
      height: null,
      publicUrl: assetPublicUrl(storageName, null, visibility),
    };
  }

  await ensureLocalDir();
  // The key may name a folder (for example profile/), so make sure it exists.
  await fs.mkdir(dirname(localPath(storageName)), { recursive: true });
  await fs.writeFile(localPath(storageName), buffer);
  return {
    storageName,
    originalName,
    mimeType,
    size: buffer.length,
    path: localPath(storageName),
    bucket: null,
    visibility,
    width: null,
    height: null,
    publicUrl: assetPublicUrl(storageName, null, visibility),
  };
}

export async function getFileStream(
  storageName: string,
  bucket?: string | null
): Promise<{
  stream: NodeJS.ReadableStream;
  mimeType: string;
  size: number;
  originalName: string;
}> {
  if (!isSafeStorageKey(storageName)) {
    throw new Error('Invalid storage key.');
  }

  if (storageDriver() === 'supabase') {
    const target = bucket || PRIVATE_BUCKET;
    const { data, error } = await (await getSupabaseClient())
      .storage.from(target)
      .download(storageName);
    if (error || !data) {
      const notFound = Object.assign(new Error('File not found.'), {
        code: 'ENOENT',
      });
      throw notFound;
    }
    const buffer = Buffer.from(await data.arrayBuffer());
    return {
      stream: Readable.from(buffer),
      mimeType: data.type || mimeTypeForKey(storageName),
      size: buffer.length,
      originalName: storageName,
    };
  }

  if (storageDriver() === 's3') {
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const output = (await (await getS3Client()).send(
      new GetObjectCommand({ Bucket: S3_BUCKET!, Key: storageName })
    )) as import('@aws-sdk/client-s3').GetObjectCommandOutput;
    const body = output.Body as NodeJS.ReadableStream;
    return {
      stream: body,
      mimeType: output.ContentType || mimeTypeForKey(storageName),
      size: Number(output.ContentLength ?? 0),
      originalName: storageName,
    };
  }

  const filePath = localPath(storageName);
  const stat = await fs.stat(filePath);
  const stream = createReadStream(filePath);
  return {
    stream,
    mimeType: mimeTypeForKey(storageName),
    size: stat.size,
    originalName: storageName,
  };
}

function mimeTypeForKey(storageName: string): string {
  const ext = storageName.slice(storageName.lastIndexOf('.')).toLowerCase();
  return (
    {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
    }[ext] ?? 'application/octet-stream'
  );
}

export async function deleteFile(
  storageName: string,
  bucket?: string | null
): Promise<void> {
  if (!isSafeStorageKey(storageName)) return;

  if (storageDriver() === 'supabase') {
    const target = bucket || PRIVATE_BUCKET;
    await (await getSupabaseClient()).storage.from(target).remove([storageName]);
    return;
  }

  if (storageDriver() === 's3') {
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    await (await getS3Client()).send(
      new DeleteObjectCommand({ Bucket: S3_BUCKET!, Key: storageName })
    );
    return;
  }

  try {
    await fs.unlink(localPath(storageName));
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT') throw error;
  }
}

/**
 * Moves an asset between the private and the public bucket.
 *
 * Used when Winnie publishes a picture or a CV: the file is copied to the
 * public bucket first and only then removed from the private one, so the
 * asset is never missing.
 */
export async function changeAssetVisibility({
  storageName,
  bucket,
  visibility,
}: {
  storageName: string;
  bucket?: string | null;
  visibility: AssetVisibility;
}): Promise<{ bucket: string | null; storageName: string }> {
  if (storageDriver() !== 'supabase') {
    // The filesystem and S3 drivers serve every asset through the
    // application, so the bucket does not change.
    return { bucket: bucket ?? null, storageName };
  }

  const target = bucketFor(visibility);
  const source = bucket || PRIVATE_BUCKET;
  if (source === target) {
    return { bucket: source, storageName };
  }

  const { data, error } = await (await getSupabaseClient())
    .storage.from(source)
    .download(storageName);
  if (error || !data) {
    throw new Error('The file could not be read from storage.');
  }
  const buffer = Buffer.from(await data.arrayBuffer());

  const { error: uploadError } = await (await getSupabaseClient())
    .storage.from(target)
    .upload(storageName, buffer, { contentType: mimeTypeForKey(storageName), upsert: true });
  if (uploadError) {
    throw new Error(uploadError.message || 'The file could not be copied.');
  }
  await (await getSupabaseClient()).storage.from(source).remove([storageName]);
  return { bucket: target, storageName };
}

export function storageDescription(): string {
  if (storageDriver() === 'supabase') {
    return `Supabase Storage (buckets: ${PUBLIC_BUCKET}, ${PRIVATE_BUCKET})`;
  }
  if (storageDriver() === 's3') {
    return `S3-compatible bucket ${S3_BUCKET} at ${S3_ENDPOINT}`;
  }
  return `Local filesystem: ${MEDIA_DIR}`;
}
