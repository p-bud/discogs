import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { DiscogsOAuth, apiConfig } from '@/app/utils/auth';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const missing: string[] = [];
  if (!process.env.DISCOGS_CONSUMER_KEY) missing.push('DISCOGS_CONSUMER_KEY');
  if (!process.env.DISCOGS_CONSUMER_SECRET) missing.push('DISCOGS_CONSUMER_SECRET');
  if (missing.length > 0) {
    return NextResponse.json(
      { error: 'Missing required environment variables for Discogs OAuth.', missing },
      { status: 503 }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const oauthToken = searchParams.get('oauth_token');
    const oauthVerifier = searchParams.get('oauth_verifier');

    if (!oauthToken || !oauthVerifier) {
      console.error('Missing oauth_token or oauth_verifier in callback');
      return NextResponse.redirect(new URL('/?auth_error=missing_params', request.url));
    }

    const cookieStore = cookies();

    // Verify the CSRF state nonce is still present (proves same browser session initiated OAuth).
    const storedState = cookieStore.get('discogs_oauth_state')?.value;
    if (!storedState) {
      console.error('Missing CSRF state nonce in cookie — possible CSRF attempt');
      return NextResponse.redirect(new URL('/?auth_error=invalid_state', request.url));
    }

    const tokenSecret = cookieStore.get('discogs_oauth_token_secret')?.value;
    if (!tokenSecret) {
      console.error('Missing oauth_token_secret in cookie');
      return NextResponse.redirect(new URL('/?auth_error=missing_token_secret', request.url));
    }

    const oauth = new DiscogsOAuth();
    const accessTokenUrl = apiConfig.DISCOGS_ACCESS_TOKEN_URL;

    const oauthParams = oauth.authorize(
      { url: accessTokenUrl, method: 'POST', data: { oauth_verifier: oauthVerifier } },
      { key: oauthToken, secret: tokenSecret }
    );

    const authHeaders = oauth.toHeader(oauthParams);
    authHeaders['User-Agent'] = 'DiscogsBarginFinder/1.0';
    authHeaders['Content-Type'] = 'application/x-www-form-urlencoded';

    const response = await axios.post(
      accessTokenUrl,
      `oauth_verifier=${oauthVerifier}`,
      { headers: authHeaders }
    );

    const parsedData = new URLSearchParams(response.data);
    const accessToken = parsedData.get('oauth_token');
    const accessTokenSecret = parsedData.get('oauth_token_secret');

    if (!accessToken || !accessTokenSecret) {
      console.error('Invalid access token response from Discogs');
      return NextResponse.redirect(new URL('/?auth_error=invalid_access_token', request.url));
    }

    const responseObj = NextResponse.redirect(new URL('/', request.url));
    const oneMonth = 60 * 60 * 24 * 30;
    const cookieOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: oneMonth,
      path: '/',
      sameSite: 'lax' as const,
    };

    responseObj.cookies.set('discogs_oauth_token', accessToken, cookieOpts);
    responseObj.cookies.set('discogs_oauth_token_secret', accessTokenSecret, cookieOpts);
    // Clear the state nonce and temporary request-token secret.
    responseObj.cookies.delete('discogs_oauth_state');

    return responseObj;
  } catch (error) {
    console.error('OAuth callback error:', error);

    let errorParam = 'unknown_error';
    if (axios.isAxiosError(error) && error.response) {
      errorParam = `api_error_${error.response.status}`;
    }

    return NextResponse.redirect(new URL(`/?auth_error=${errorParam}`, request.url));
  }
}
