import { NextResponse } from 'next/server';
import { generateToken, hashToken, csrfCookieOptions } from '@/lib/auth';

export const runtime = 'nodejs';

/**
 * Issues a fresh CSRF token cookie. The frontend reads this cookie and sends
 * the value back as the `X-CSRF-Token` header on state-changing requests.
 */
export async function GET() {
  const production = process.env.NODE_ENV === 'production';
  const token = generateToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: 'portfolio_csrf',
    value: hashToken(token),
    ...csrfCookieOptions(production),
  });
  return response;
}
