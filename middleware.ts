import { NextRequest, NextResponse } from 'next/server';

/**
 * Central authentication guard.
 * Checks for OAuth cookies before the request reaches any protected route handler.
 * This removes the need for duplicated cookie-check logic in each individual route.
 */

const PROTECTED_PATTERNS = [
  /^\/api\/collection(\/|$)/,
  /^\/api\/release\//,
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PATTERNS.some(pattern => pattern.test(pathname));
  if (!isProtected) return NextResponse.next();

  const hasToken = request.cookies.has('discogs_oauth_token');
  const hasSecret = request.cookies.has('discogs_oauth_token_secret');

  if (!hasToken || !hasSecret) {
    return NextResponse.json(
      { error: 'Authentication required. Please login with Discogs first.' },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

export const config = {
  // Only run middleware on API routes that need auth — keeps it fast.
  matcher: ['/api/collection/:path*', '/api/release/:path*'],
};
