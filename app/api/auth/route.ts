import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';
import axios from 'axios';
import { NextResponse } from 'next/server';
import { DiscogsOAuth, apiConfig } from '@/app/utils/auth';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/** Derives the app's base URL from env vars — never from untrusted request headers. */
function getAppBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  // VERCEL_URL is automatically set on all Vercel deployments (including previews).
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return process.env.NODE_ENV === 'production' ? 'https://raerz.fyi' : 'http://localhost:3000';
}

export async function GET() {
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
    const oauth = new DiscogsOAuth();

    // Build the callback URL from a trusted source — never from the Host header.
    const callbackUrl = `${getAppBaseUrl()}/api/auth/callback`;

    // Generate a CSRF state nonce and store it in a short-lived httpOnly cookie.
    const stateNonce = randomBytes(16).toString('hex');

    const requestTokenUrl = apiConfig.DISCOGS_REQUEST_TOKEN_URL;
    const oauthParams = oauth.authorize({
      url: requestTokenUrl,
      method: 'GET',
      data: { oauth_callback: callbackUrl },
    });

    const authHeaders = oauth.toHeader(oauthParams);
    authHeaders['User-Agent'] = 'DiscogsBarginFinder/1.0';

    const response = await axios.get(
      `${requestTokenUrl}?oauth_callback=${encodeURIComponent(callbackUrl)}`,
      { headers: authHeaders }
    );

    const parsedData = new URLSearchParams(response.data);
    const oauthToken = parsedData.get('oauth_token');
    const oauthTokenSecret = parsedData.get('oauth_token_secret');

    if (!oauthToken || !oauthTokenSecret) {
      console.error('Invalid response from Discogs:', response.data);
      return NextResponse.json(
        { error: 'Failed to get request token: Invalid response' },
        { status: 500 }
      );
    }

    const oneHour = 60 * 60;
    const cookieOpts = {
      maxAge: oneHour,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax' as const,
    };

    cookies().set('discogs_oauth_token_secret', oauthTokenSecret, cookieOpts);
    // Store the CSRF nonce — verified in the callback handler.
    cookies().set('discogs_oauth_state', stateNonce, cookieOpts);

    const authUrl = `${apiConfig.DISCOGS_AUTHORIZE_URL}?oauth_token=${oauthToken}`;
    return NextResponse.json({ url: authUrl });
  } catch (error) {
    console.error('OAuth flow error:', error);

    let errorMessage = 'Failed to initiate OAuth flow';
    let statusCode = 500;

    if (axios.isAxiosError(error) && error.response) {
      errorMessage = `Failed to get request token: ${error.response.status} ${error.response.data}`;
      statusCode = error.response.status;
    }

    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
