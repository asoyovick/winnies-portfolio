import { NextResponse } from 'next/server';
import { adminCount, hashPassword } from '@/lib/auth';
import { get, run } from '@/lib/db';
import { sealCredential } from '@/lib/credential-vault';

export const runtime = 'nodejs';

/**
 * One-time protected administrator creation over HTTP.
 *
 * Only works when no administrator exists yet and the request carries the
 * ADMIN_SETUP_TOKEN (shared out of band, never committed). After the first
 * administrator exists this endpoint always rejects.
 */
export async function POST(request: Request) {
  const existing = await adminCount();
  if (existing > 0) {
    return NextResponse.json(
      { error: 'An administrator already exists. Setup is closed.' },
      { status: 403 }
    );
  }

  const expectedToken = process.env.ADMIN_SETUP_TOKEN;
  if (!expectedToken) {
    return NextResponse.json(
      { error: 'Setup is not configured on the server.' },
      { status: 500 }
    );
  }

  const provided = request.headers.get('x-admin-setup-token') ?? '';
  if (provided !== expectedToken) {
    return NextResponse.json({ error: 'Invalid setup token.' }, { status: 401 });
  }

  let body: { email?: string; password?: string };
  try {
    body = (await request.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
  }
  if (!password || password.length < 12) {
    return NextResponse.json(
      { error: 'Password must be at least 12 characters.' },
      { status: 400 }
    );
  }

  const existingAdmin = await get<any>('SELECT id FROM admins WHERE email = $1', [email]);
  if (existingAdmin) {
    return NextResponse.json(
      { error: 'An administrator with this email already exists.' },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);
  await run(
    `INSERT INTO admins (email, password_hash, password_ciphertext, password_updated_at, created_at, updated_at)
     VALUES ($1, $2, $3, now(), now(), now())`,
    [email, passwordHash, sealCredential(password)]
  );

  return NextResponse.json({
    ok: true,
    admin: { email },
  });
}
