import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Get the cookie store
    const cookieStore = cookies();
    
    // Delete all Discogs related cookies
    cookieStore.delete('discogs_oauth_token');
    cookieStore.delete('discogs_oauth_token_secret');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to log out' },
      { status: 500 }
    );
  }
} 