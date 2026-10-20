import { NextResponse, type NextRequest } from 'next/server';
import { authenticateRequest } from './lib/auth';

/**
 * Route protection for the administration area.
 *
 * Proxy runs before the route renders (Next 16 renamed the middleware file
 * convention to proxy). It runs on the Node.js runtime by default, so the
 * session store can be read here.
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

  const sessionToken = request.cookies.get('portfolio_session')?.value ?? null;
  const result = authenticateRequest(sessionToken);

  if (!result.ok) {
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}
