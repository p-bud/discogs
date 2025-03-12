import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get the cookie store
    const cookieStore = cookies();
    
    // Check if we have the required OAuth tokens
    const oauthToken = cookieStore.get('discogs_oauth_token')?.value;
    const oauthTokenSecret = cookieStore.get('discogs_oauth_token_secret')?.value;
    
    // Check authentication status - keep this simple with just token presence
    const isAuthenticated = !!(oauthToken && oauthTokenSecret);
    
    // Minimal logging to avoid console noise
    console.log('Auth token exists:', !!oauthToken);
    console.log('Auth token secret exists:', !!oauthTokenSecret);
    
    return NextResponse.json({ 
      authenticated: isAuthenticated
    });
  } catch (error) {
    console.error('Auth status check error:', error);
    return NextResponse.json(
      { authenticated: false, error: 'Failed to check authentication status' },
      { status: 500 }
    );
  }
} 