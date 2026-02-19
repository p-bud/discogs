import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

/**
 * Handles the Supabase Auth email confirmation callback.
 * Supabase redirects here with ?code= after the user clicks the confirmation link.
 *
 * IMPORTANT: we create the Supabase client inline here (not via createSupabaseServerClient)
 * so that cookies are written directly onto the redirect response object.
 * Using cookies() from next/headers doesn't attach Set-Cookie headers to NextResponse.redirect().
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const next = request.nextUrl.searchParams.get('next') ?? '/';

  if (code) {
    const redirectUrl = new URL(next, request.url);
    const response = NextResponse.redirect(redirectUrl);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name) => request.cookies.get(name)?.value,
          set: (name, value, options) => {
            response.cookies.set({ name, value, ...options } as any);
          },
          remove: (name, options) => {
            response.cookies.set({ name, value: '', ...options } as any);
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return response;
    }

    console.error('Supabase code exchange error:', error);
  }

  return NextResponse.redirect(new URL('/?auth_error=confirmation_failed', request.url));
}
