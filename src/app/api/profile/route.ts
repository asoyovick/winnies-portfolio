import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { validateCsrfToken, requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { parseJson } from '@/lib/validation';
import { assetPublicUrl } from '@/lib/storage';

export const runtime = 'nodejs';

function profileResponse(row: any) {
  const picture = row.profile_image_id
    ? (db
        .prepare(
          'SELECT id, original_name, mime_type, size, storage_name, created_at FROM media WHERE id = ?'
        )
        .get(row.profile_image_id) as any | undefined)
    : undefined;

  return {
    id: row.id,
    display_name: row.display_name,
    professional_title: row.professional_title,
    biography: row.biography,
    location: row.location,
    public_email: row.public_email,
    public_phone: row.public_phone,
    hero_heading: row.hero_heading,
    hero_subheading: row.hero_subheading,
    cv_media_id: row.cv_media_id,
    profile_image_id: row.profile_image_id,
    profile_image: picture
      ? {
          id: picture.id,
          original_name: picture.original_name,
          mime_type: picture.mime_type,
          size: picture.size,
          created_at: picture.created_at,
          public_url: assetPublicUrl(picture.storage_name),
        }
      : null,
    social_links: parseJson(row.social_links, []),
    updated_at: row.updated_at,
  };
}

export async function GET() {
  const row = db.prepare('SELECT * FROM profile_settings WHERE id = 1').get();
  if (!row) {
    return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });
  }
  return NextResponse.json(profileResponse(row));
}

export async function PUT(request: Request) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('portfolio_session')?.value ?? null;
  const admin = requireAdmin(sessionToken);
  if ('error' in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const csrfCookie = cookieStore.get('portfolio_csrf')?.value ?? null;
  const csrfHeader = request.headers.get('x-csrf-token') ?? null;
  if (!validateCsrfToken(csrfHeader, csrfCookie)) {
    return NextResponse.json({ error: 'Invalid CSRF token.' }, { status: 403 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const fields: string[] = [];
  const values: unknown[] = [];

  const allowed: Record<string, unknown> = {};
  if (typeof body.display_name === 'string') allowed.display_name = body.display_name.trim();
  if (typeof body.professional_title === 'string') allowed.professional_title = body.professional_title.trim();
  if (typeof body.biography === 'string') allowed.biography = body.biography;
  if (typeof body.location === 'string') allowed.location = body.location.trim();
  if (typeof body.public_email === 'string') allowed.public_email = body.public_email.trim();
  if (typeof body.public_phone === 'string') allowed.public_phone = body.public_phone.trim();
  if (typeof body.hero_heading === 'string') allowed.hero_heading = body.hero_heading;
  if (typeof body.hero_subheading === 'string') allowed.hero_subheading = body.hero_subheading;
  if (typeof body.cv_media_id !== 'undefined') allowed.cv_media_id = body.cv_media_id === null ? null : Number(body.cv_media_id);
  if (typeof body.profile_image_id !== 'undefined') allowed.profile_image_id = body.profile_image_id === null ? null : Number(body.profile_image_id);
  if (Array.isArray(body.social_links)) allowed.social_links = JSON.stringify(body.social_links);

  for (const [key, value] of Object.entries(allowed)) {
    fields.push(`${key} = ?`);
    values.push(value);
  }

  if (fields.length === 0) {
    return NextResponse.json({ error: 'No updatable fields provided.' }, { status: 400 });
  }

  fields.push('updated_at = ?');
  values.push(now, 1);

  db.prepare(
    `UPDATE profile_settings SET ${fields.join(', ')} WHERE id = ?`
  ).run(...values);

  const row = db.prepare('SELECT * FROM profile_settings WHERE id = 1').get();
  return NextResponse.json(profileResponse(row));
}
