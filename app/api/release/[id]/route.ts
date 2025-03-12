import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getReleaseCommunityData } from '../../../utils/collection';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const releaseId = params.id;
    
    // Check for auth
    const cookieStore = cookies();
    const hasAuth = cookieStore.has('discogs_oauth_token') && cookieStore.has('discogs_oauth_token_secret');
    
    if (!hasAuth) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get the release details
    const releaseDetails = await getReleaseCommunityData(releaseId);
    
    return NextResponse.json(releaseDetails);
  } catch (error: any) {
    console.error('Error fetching release details:', error);
    
    // Handle rate limit errors
    if (error.message?.includes('rate limit') || error.response?.status === 429) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', details: error.message },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Error fetching release details' },
      { status: 500 }
    );
  }
} 