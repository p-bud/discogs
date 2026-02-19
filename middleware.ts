import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Central middleware:
 * 1. Refreshes the Supabase Auth session on every request (required by @supabase/ssr).
 * 2. Guards /api/collection and /api/release/* with Discogs OAuth cookie check.
 */

const DISCOGS_PROTECTED_PATTERNS = [
  /^\/api\/collection(\/|$)/,
  /^\/api\/release\//,
];

export async function middleware(request: NextRequest) {
  // --- Supabase session refresh ---
  // @supabase/ssr rotates short-lived access tokens; the middleware must call
  // supabase.auth.getUser() on every request so the cookies stay current.
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          request.cookies.set(name, value);
          response = NextResponse.next({ request });
          response.cookies.set(name, value, options as any);
        },
        remove(name: string, options: Record<string, unknown>) {
          request.cookies.set(name, '');
          response = NextResponse.next({ request });
          response.cookies.set(name, '', options as any);
        },
      },
    });

    // Refresh session — important: must await before returning response.
    await supabase.auth.getUser();
  }

  // --- Discogs OAuth guard ---
  const { pathname } = request.nextUrl;
  const isDiscogProtected = DISCOGS_PROTECTED_PATTERNS.some(p => p.test(pathname));

  if (isDiscogProtected) {
    const hasToken = request.cookies.has('discogs_oauth_token');
    const hasSecret = request.cookies.has('discogs_oauth_token_secret');

    if (!hasToken || !hasSecret) {
      return NextResponse.json(
        { error: 'Authentication required. Please login with Discogs first.' },
        { status: 401 }
      );
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Run on all paths except Next.js internals and static files.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
