import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { DiscogsOAuth } from '@/app/utils/auth';
import { createSupabaseServerClient } from '@/app/utils/supabase-server';
import { getSupabaseClient } from '@/app/utils/supabase';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // --- Discogs auth check ---
    const cookieStore = cookies();
    const oauthToken = cookieStore.get('discogs_oauth_token')?.value;
    const oauthTokenSecret = cookieStore.get('discogs_oauth_token_secret')?.value;

    let discogsAuthenticated = false;
    let discogsUsername: string | null = null;

    if (oauthToken && oauthTokenSecret) {
      // Validate the token by calling the lightweight Discogs identity endpoint.
      try {
        const identityUrl = 'https://api.discogs.com/oauth/identity';
        const oauth = new DiscogsOAuth();
        const oauthParams = oauth.authorize(
          { url: identityUrl, method: 'GET' },
          { key: oauthToken, secret: oauthTokenSecret }
        );
        const authHeaders = oauth.toHeader(oauthParams);
        authHeaders['User-Agent'] = 'DiscogsBarginFinder/1.0';

        const response = await axios.get(identityUrl, { headers: authHeaders, timeout: 5000 });
        discogsUsername = response.data?.username ?? null;
        discogsAuthenticated = true;
      } catch (identityError: any) {
        if (axios.isAxiosError(identityError) && identityError.response?.status === 401) {
          // Token revoked/expired — caller will get cookies cleared via the response below.
          const res = NextResponse.json({ authenticated: false });
          res.cookies.delete('discogs_oauth_token');
          res.cookies.delete('discogs_oauth_token_secret');
          return res;
        }
        console.error('Auth identity check error:', identityError);
      }
    }

    // --- Supabase auth check ---
    let supabaseUserId: string | null = null;
    let supabaseLinkedUsername: string | null = null;
    let displayName: string | null = null;
    let leaderboardOptIn: boolean = false;

    try {
      const supabase = createSupabaseServerClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        supabaseUserId = user.id;

        // Fetch linked Discogs username from user_profiles (use service-role to bypass RLS).
        const adminClient = getSupabaseClient();
        if (adminClient) {
          const { data } = await adminClient
            .from('user_profiles')
            .select('discogs_username, display_name, leaderboard_opt_in')
            .eq('id', user.id)
            .single();
          supabaseLinkedUsername = data?.discogs_username ?? null;
          displayName = data?.display_name ?? null;
          leaderboardOptIn = data?.leaderboard_opt_in ?? false;
        }
      }
    } catch (supabaseError) {
      // Non-fatal — Discogs auth remains valid independently.
      console.error('Supabase auth check error:', supabaseError);
    }

    return NextResponse.json({
      authenticated: discogsAuthenticated,
      username: discogsUsername,
      supabaseUserId,
      supabaseLinkedUsername,
      display_name: displayName,
      leaderboard_opt_in: leaderboardOptIn,
    });
  } catch (error) {
    console.error('Auth status check error:', error);
    return NextResponse.json(
      { authenticated: false, error: 'Failed to check authentication status' },
      { status: 500 }
    );
  }
}
