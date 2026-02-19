import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/utils/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * Handles the Supabase Auth email confirmation callback.
 * Supabase redirects here with ?code= after the user clicks the confirmation link.
 * We exchange the code for a session, then redirect to the home page.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const next = request.nextUrl.searchParams.get('next') ?? '/';

  if (code) {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }

    console.error('Supabase code exchange error:', error);
  }

  return NextResponse.redirect(new URL('/?auth_error=confirmation_failed', request.url));
}
