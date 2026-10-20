import { NextResponse, type NextRequest } from 'next/server';

/**
 * Route protection for the administration area.
 *
 * Proxy runs before the route renders, in its own isolate. It deliberately
 * does not touch the database: better-sqlite3 cannot be finalised safely in
 * that context, and the authoritative checks already live where the data is
 * used — the admin layout redirects signed-out visitors, and every admin API
 * route verifies the session itself.
 *
 * Here we only do the cheap check: no session cookie means no session, so the
 * visitor is sent to the sign-in page before any page is rendered.
 */
export const config = {
  matcher: ['/admin/:path*'],
};

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public admin entry points never require a session.
  if (pathname === '/admin/login') {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get('portfolio_session')?.value;
  if (!sessionToken) {
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}
