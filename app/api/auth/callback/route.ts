import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { DiscogsOAuth, apiConfig } from '@/app/utils/auth';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const oauthToken = searchParams.get('oauth_token');
    const oauthVerifier = searchParams.get('oauth_verifier');
    
    if (!oauthToken || !oauthVerifier) {
      console.error('Missing oauth_token or oauth_verifier in callback');
      return NextResponse.redirect(new URL('/?auth_error=missing_params', request.url));
    }
    
    // Get the token secret from cookie
    const cookieStore = cookies();
    const tokenSecret = cookieStore.get('discogs_oauth_token_secret')?.value;
    
    if (!tokenSecret) {
      console.error('Missing oauth_token_secret in cookie');
      return NextResponse.redirect(new URL('/?auth_error=missing_token_secret', request.url));
    }
    
    // Create OAuth instance
    const oauth = new DiscogsOAuth();
    
    // Exchange the verifier for an access token
    const accessTokenUrl = apiConfig.DISCOGS_ACCESS_TOKEN_URL;
    
    // Create OAuth parameters
    const oauthParams = oauth.authorize(
      {
        url: accessTokenUrl,
        method: 'POST',
        data: { oauth_verifier: oauthVerifier }
      },
      { key: oauthToken, secret: tokenSecret }
    );
    
    // Get the Authorization header
    const authHeaders = oauth.toHeader(oauthParams);
    
    // Add User-Agent required by Discogs
    authHeaders['User-Agent'] = 'DiscogsBarginFinder/1.0';
    authHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
    
    // Request the access token
    const response = await axios.post(
      accessTokenUrl, 
      `oauth_verifier=${oauthVerifier}`,
      { headers: authHeaders }
    );
    
    // Parse the response
    const responseData = response.data;
    const parsedData = new URLSearchParams(responseData);
    const accessToken = parsedData.get('oauth_token');
    const accessTokenSecret = parsedData.get('oauth_token_secret');
    
    if (!accessToken || !accessTokenSecret) {
      console.error('Invalid access token response from Discogs');
      return NextResponse.redirect(new URL('/?auth_error=invalid_access_token', request.url));
    }
    
    // Create response with redirect to home
    const responseObj = NextResponse.redirect(new URL('/', request.url));
    
    // Set secure HTTP-only cookies
    const oneMonth = 60 * 60 * 24 * 30;
    
    responseObj.cookies.set('discogs_oauth_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: oneMonth,
      path: '/',
      sameSite: 'lax',
    });
    
    responseObj.cookies.set('discogs_oauth_token_secret', accessTokenSecret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: oneMonth,
      path: '/',
      sameSite: 'lax',
    });
    
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