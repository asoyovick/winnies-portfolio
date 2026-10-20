/**
 * Storage abstraction for portfolio media assets.
 *
 * Default implementation stores files on the local filesystem under MEDIA_DIR
 * (default: data/uploads). When S3_* environment variables are provided, assets
 * are uploaded to an S3-compatible bucket instead.
 *
 * All storage credentials live on the server only and are never exposed to the
 * browser.
 */
import { createHash } from 'crypto';
import { randomUUID } from 'crypto';
import { promises as fs, createReadStream } from 'fs';
import { join, dirname } from 'path';
import { fileTypeFromBuffer } from 'file-type';

const MEDIA_DIR = process.env.MEDIA_DIR || 'data/uploads';
const MEDIA_BASE_URL = process.env.MEDIA_BASE_URL || '/api/media';

const S3_ENDPOINT = process.env.S3_ENDPOINT;
const S3_BUCKET = process.env.S3_BUCKET;
const S3_REGION = process.env.S3_REGION || 'us-east-1';
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID;
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY;
const S3_PUBLIC_BASE_URL = process.env.S3_PUBLIC_BASE_URL;

const USE_S3 = Boolean(S3_ENDPOINT && S3_BUCKET && S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY);

// Allowed MIME types. Active content (HTML, scripts, SVG, executables) is
// explicitly excluded.
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

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

export type StoredAsset = {
  storageName: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  width: number | null;
  height: number | null;
  publicUrl: string;
};

type S3Client = import('@aws-sdk/client-s3').S3Client;
type GetObjectOutput = import('@aws-sdk/client-s3').GetObjectCommandOutput;

let s3Client: S3Client | null = null;

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

function safeStorageName(originalName: string, mimeType: string, folder?: string): string {
  const random = randomUUID().replace(/-/g, '');
  const hash = createHash('sha256').update(`${random}:${Date.now()}`).digest('hex').slice(0, 12);
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

export function assetPublicUrl(storageName: string): string {
  const encoded = storageName.split('/').map(encodeURIComponent).join('/');
  if (USE_S3 && S3_PUBLIC_BASE_URL) {
    return `${S3_PUBLIC_BASE_URL.replace(/\/$/, '')}/${encoded}`;
  }
  return `${MEDIA_BASE_URL}/${encoded}`;
}

/** Whether a stored asset is still on disk (or in the bucket). */
export async function assetExists(storageName: string): Promise<boolean> {
  if (!isSafeStorageKey(storageName)) return false;
  if (USE_S3) {
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
    throw new Error('Unsupported file type. Only JPEG, PNG, WebP images and PDF documents are allowed.');
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

export async function storeFile({
  buffer,
  originalName,
  folder,
}: {
  buffer: Buffer;
  originalName: string;
  folder?: string;
}): Promise<StoredAsset> {
  const { mimeType } = await validateFileBuffer(buffer, originalName);
  const storageName = safeStorageName(originalName, mimeType, folder);

  if (USE_S3) {
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
      width: null,
      height: null,
      publicUrl: assetPublicUrl(storageName),
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
    width: null,
    height: null,
    publicUrl: assetPublicUrl(storageName),
  };
}

export async function getFileStream(storageName: string): Promise<{
  stream: NodeJS.ReadableStream;
  mimeType: string;
  size: number;
  originalName: string;
}> {
  if (USE_S3) {
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const output = (await (await getS3Client()).send(
      new GetObjectCommand({ Bucket: S3_BUCKET!, Key: storageName })
    )) as GetObjectOutput;
    return {
      stream: output.Body as NodeJS.ReadableStream,
      mimeType: output.ContentType ?? 'application/octet-stream',
      size: output.ContentLength ?? 0,
      originalName: storageName,
    };
  }

  const filePath = localPath(storageName);
  const stat = await fs.stat(filePath);
  const stream = createReadStream(filePath);
  const ext = storageName.slice(storageName.lastIndexOf('.'));
  const mimeType = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf',
  }[ext.toLowerCase()] ?? 'application/octet-stream';
  return { stream, mimeType, size: stat.size, originalName: storageName };
}

export async function deleteFile(storageName: string): Promise<void> {
  if (USE_S3) {
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

export function isStorageConfigured(): boolean {
  return true;
}

export function storageDescription(): string {
  if (USE_S3) {
    return `S3-compatible bucket ${S3_BUCKET} at ${S3_ENDPOINT}`;
  }
  return `Local filesystem: ${MEDIA_DIR}`;
}
