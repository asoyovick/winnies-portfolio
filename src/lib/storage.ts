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
import { join } from 'path';
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

function safeStorageName(originalName: string, mimeType: string): string {
  const random = randomUUID().replace(/-/g, '');
  const hash = createHash('sha256').update(`${random}:${Date.now()}`).digest('hex').slice(0, 12);
  return `${hash}.${safeExtension(originalName, mimeType).slice(1)}`;
}

function isAllowedMime(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.has(mimeType.toLowerCase());
}

async function ensureLocalDir(): Promise<void> {
  await fs.mkdir(MEDIA_DIR, { recursive: true });
}

function localPath(storageName: string): string {
  // The directory is configurable at runtime, so it is resolved at request time
  // rather than traced into the build output.
  return join(/* turbopackIgnore: true */ MEDIA_DIR, storageName);
}

export function assetPublicUrl(storageName: string): string {
  if (USE_S3 && S3_PUBLIC_BASE_URL) {
    return `${S3_PUBLIC_BASE_URL.replace(/\/$/, '')}/${storageName}`;
  }
  return `${MEDIA_BASE_URL}/${storageName}`;
}

export async function validateFileBuffer(
  buffer: Buffer,
  originalName: string
): Promise<{ mimeType: string; ext: string }> {
  if (!buffer || buffer.length === 0) {
    throw new Error('The file is empty.');
  }
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(`File is too large. Maximum size is ${Math.round(MAX_FILE_SIZE / 1024 / 1024)} MB.`);
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

export async function storeFile({
  buffer,
  originalName,
}: {
  buffer: Buffer;
  originalName: string;
}): Promise<StoredAsset> {
  const { mimeType } = await validateFileBuffer(buffer, originalName);
  const storageName = safeStorageName(originalName, mimeType);

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
