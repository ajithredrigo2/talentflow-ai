import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE } from './lib/auth';

const PUBLIC = ['/', '/login', '/api/auth/login', '/api/health'];

/**
 * Route protection. Session validity is re-checked server-side on every page
 * and API handler; this layer keeps unauthenticated users out of the app shell
 * and off protected APIs.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.includes(pathname) || pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next();
  }
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
