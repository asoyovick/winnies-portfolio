import { NextResponse, type NextRequest } from 'next/server';
import { authenticateRequest } from './lib/auth';

export const config = {
  // Node.js runtime so better-sqlite3 is available in middleware.
  runtime: 'nodejs',
  matcher: ['/admin/:path*'],
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public admin entry points never require a session.
  if (pathname === '/admin/login' || pathname.startsWith('/api/admin/setup')) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get('portfolio_session')?.value ?? null;
  const result = authenticateRequest(sessionToken);

  if (!result.ok) {
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();
  // Refresh the session cookie on each admin request so the session stays alive.
  return response;
}
