import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { rateLimit, rateLimitKey } from '@/lib/rate-limit';
import {
  cookieOptions,
  createSession,
  csrfCookieOptions,
  getAdminByEmail,
  isConfigured,
  validateCsrfToken,
} from '@/lib/auth';
import { comparePassword, hashToken } from '@/lib/auth';

export const runtime = 'nodejs';

const LOGIN_LIMIT = {
  limit: Number(process.env.LOGIN_RATE_LIMIT || 5),
  windowMs: Number(process.env.LOGIN_RATE_WINDOW_MS || 15 * 60 * 1000),
}; // 5 attempts per 15 min per IP by default

export async function POST(request: Request) {
  if (!isConfigured()) {
    return NextResponse.json(
      { error: 'Authentication is not configured on the server.' },
      { status: 500 }
    );
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined;
  const rl = rateLimit(rateLimitKey(ip, 'login'), LOGIN_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many login attempts. Try again later.' },
      { status: 429 }
    );
  }

  const cookieStore = await cookies();
  const csrfCookie = cookieStore.get('portfolio_csrf')?.value ?? null;
  const csrfHeader = request.headers.get('x-csrf-token') ?? null;
  if (!validateCsrfToken(csrfHeader, csrfCookie)) {
    return NextResponse.json({ error: 'Invalid CSRF token.' }, { status: 403 });
  }

  let body: { email?: string; password?: string };
  try {
    body = (await request.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
  }

  const admin = getAdminByEmail(email);
  if (!admin) {
    // Always hash something so timing does not reveal whether the email exists.
    await comparePassword(password, '$2b$12$invalidhashfornonexistinguserxxyyzz');
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
  }

  const valid = await comparePassword(password, admin.password_hash);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
  }

  const { token, row } = createSession(admin.id);
  const production = process.env.NODE_ENV === 'production';

  const response = NextResponse.json({
    ok: true,
    admin: { id: admin.id, email: admin.email },
  });

  response.cookies.set({
    name: 'portfolio_session',
    value: token,
    ...cookieOptions(production),
    expires: new Date(row.expires_at),
  });
  response.cookies.set({
    name: 'portfolio_csrf',
    value: hashToken(token),
    ...csrfCookieOptions(production),
    expires: new Date(row.expires_at),
  });

  return response;
}
