import { NextResponse } from 'next/server';
import { getFileStream, isSafeStorageKey } from '@/lib/storage';

export const runtime = 'nodejs';

/**
 * Serves a stored asset by its storage key, for example
 * `profile/9f2c1ab4cd11.png`.
 *
 * The key is checked against the pattern the storage layer generates, so a
 * request can never reach outside the storage directory, and no directory
 * listing is possible.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ storageName: string[] }> }
) {
  const { storageName } = await params;
  const key = (storageName ?? []).map((part) => decodeURIComponent(part)).join('/');

  if (!isSafeStorageKey(key)) {
    return NextResponse.json({ error: 'File not found.' }, { status: 404 });
  }

  try {
    const { stream, mimeType, size, originalName } = await getFileStream(key);
    const isPdf = mimeType === 'application/pdf';
    return new NextResponse(stream as any, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': String(size),
        'Content-Disposition': isPdf ? `attachment; filename="${originalName}"` : 'inline',
        'X-Content-Type-Options': 'nosniff',
        // The key changes when an asset is replaced, so the URL is safe to
        // cache for a long time.
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    if (error?.code === 'ENOENT' || /NoSuchKey/.test(error?.message ?? '')) {
      return NextResponse.json({ error: 'File not found.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Unable to serve file.' }, { status: 500 });
  }
}
