import { NextResponse } from 'next/server';
import { getFileStream } from '@/lib/storage';

export const runtime = 'nodejs';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ storageName: string }> }
) {
  const { storageName } = await params;
  const decodedName = decodeURIComponent(storageName);

  try {
    const { stream, mimeType, size, originalName } = await getFileStream(decodedName);
    const isPdf = mimeType === 'application/pdf';
    return new NextResponse(stream as any, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': String(size),
        'Content-Disposition': isPdf ? `attachment; filename="${originalName}"` : 'inline',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    if (error.code === 'ENOENT' || /NoSuchKey/.test(error.message ?? '')) {
      return NextResponse.json({ error: 'File not found.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Unable to serve file.' }, { status: 500 });
  }
}
