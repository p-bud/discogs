import { cookies } from 'next/headers';
import axios from 'axios';
import { NextResponse } from 'next/server';
import { DiscogsOAuth, apiConfig } from '@/app/utils/auth';
import { headers as nextHeaders } from 'next/headers';

// Handler for GET requests to /api/auth
export async function GET() {
  try {
    // Create a new OAuth instance
    const oauth = new DiscogsOAuth();
    
    // Get the host for constructing the callback URL
    const headersList = nextHeaders();
    const host = headersList.get('host') || 'localhost:3000';
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    
    // Create the callback URL
    const callbackUrl = `${protocol}://${host}/api/auth/callback`;
    
    // Set up OAuth parameters for request token
    const requestTokenUrl = apiConfig.DISCOGS_REQUEST_TOKEN_URL;
    
    // Prepare OAuth parameters with callback
    const oauthParams = oauth.authorize({
      url: requestTokenUrl,
      method: 'GET',
      data: { oauth_callback: callbackUrl }
    });
    
    // Get the Authorization header
    const authHeaders = oauth.toHeader(oauthParams);
    
    // Add User-Agent required by Discogs
    authHeaders['User-Agent'] = 'DiscogsBarginFinder/1.0';
    
    // Request the request token from Discogs
    const response = await axios.get(
      `${requestTokenUrl}?oauth_callback=${encodeURIComponent(callbackUrl)}`, 
      { headers: authHeaders }
    );
    
    // Parse the response
    const responseData = response.data;
    const parsedData = new URLSearchParams(responseData);
    const oauthToken = parsedData.get('oauth_token');
    const oauthTokenSecret = parsedData.get('oauth_token_secret');
    
    if (!oauthToken || !oauthTokenSecret) {
      console.error('Invalid response from Discogs:', responseData);
      return NextResponse.json(
        { error: 'Failed to get request token: Invalid response' },
        { status: 500 }
      );
    }
    
    // Store the token secret in a cookie
    const oneHour = 60 * 60;
    cookies().set('discogs_oauth_token_secret', oauthTokenSecret, {
      maxAge: oneHour,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
    });
    
    // Return the authorization URL
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

export const dynamic = 'force-dynamic'; 