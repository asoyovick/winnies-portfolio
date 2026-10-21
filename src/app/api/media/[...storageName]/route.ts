import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { get } from '@/lib/db';
import { getFileStream, isSafeStorageKey } from '@/lib/storage';
import { authenticateRequest } from '@/lib/auth';

export const runtime = 'nodejs';

/**
 * Serves a stored asset by its storage key, for example
 * `profile/9f2c1ab4cd11.png`.
 *
 * Public assets (the profile photograph, article covers, the published CV) are
 * served to anyone. Private assets are only ever handed to a signed-in
 * administrator. The key is checked against the pattern the storage layer
 * generates, so a request can never reach outside the storage directory, and
 * no directory listing is possible.
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

  const asset = await get<any>(
    'SELECT * FROM media WHERE storage_name = $1',
    [key]
  );

  if (!asset) {
    return NextResponse.json({ error: 'File not found.' }, { status: 404 });
  }

  if (asset.visibility !== 'public') {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('portfolio_session')?.value ?? null;
    const result = await authenticateRequest(sessionToken);
    if (!result.ok) {
      return NextResponse.json({ error: 'File not found.' }, { status: 404 });
    }
  }

  try {
    const { stream, mimeType, size, originalName } = await getFileStream(
      key,
      asset.bucket
    );
    const isPdf = mimeType === 'application/pdf';
    return new NextResponse(stream as any, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': String(size),
        'Content-Disposition': isPdf
          ? `attachment; filename="${originalName}"`
          : 'inline',
        'X-Content-Type-Options': 'nosniff',
        // The key changes when an asset is replaced, so the URL is safe to
        // cache for a long time.
        'Cache-Control': asset.visibility === 'public'
          ? 'public, max-age=31536000, immutable'
          : 'private, no-store',
      },
    });
  } catch (error: any) {
    if (error?.code === 'ENOENT' || /NoSuchKey|not found/i.test(error?.message ?? '')) {
      return NextResponse.json({ error: 'File not found.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Unable to serve file.' }, { status: 500 });
  }
}
