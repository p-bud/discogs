import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { DiscogsOAuth } from '@/app/utils/auth';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const oauthToken = cookieStore.get('discogs_oauth_token')?.value;
    const oauthTokenSecret = cookieStore.get('discogs_oauth_token_secret')?.value;

    if (!oauthToken || !oauthTokenSecret) {
      return NextResponse.json({ authenticated: false });
    }

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
      const username = response.data?.username ?? null;

      return NextResponse.json({ authenticated: true, username });
    } catch (identityError: any) {
      // 401 from Discogs means the token is revoked/expired — clear cookies.
      if (axios.isAxiosError(identityError) && identityError.response?.status === 401) {
        const res = NextResponse.json({ authenticated: false });
        res.cookies.delete('discogs_oauth_token');
        res.cookies.delete('discogs_oauth_token_secret');
        return res;
      }
      // Network/timeout errors: don't invalidate the token, just report unauthenticated.
      console.error('Auth identity check error:', identityError);
      return NextResponse.json({ authenticated: false, error: 'Could not verify token' });
    }
  } catch (error) {
    console.error('Auth status check error:', error);
    return NextResponse.json(
      { authenticated: false, error: 'Failed to check authentication status' },
      { status: 500 }
    );
  }
}
