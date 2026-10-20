import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  authenticateRequest,
  cookieOptions,
  csrfCookieOptions,
  deleteSession,
} from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST() {
  const production = process.env.NODE_ENV === 'production';
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('portfolio_session')?.value ?? null;

  const result = authenticateRequest(sessionToken);
  if (result.ok && sessionToken) {
    deleteSession(sessionToken);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: 'portfolio_session',
    value: '',
    ...cookieOptions(production),
    maxAge: 0,
    expires: new Date(0),
  });
  response.cookies.set({
    name: 'portfolio_csrf',
    value: '',
    ...csrfCookieOptions(production),
    maxAge: 0,
    expires: new Date(0),
  });
  return response;
}
