import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserCollection } from '../../utils/collection';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Maximum items to fetch
const MAX_ITEMS = 50;

/**
 * API route to get a user's Discogs collection
 * Gets a user's Discogs collection with basic info (no community data)
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username');
  
    // Check for auth
    const cookieStore = cookies();
    const hasAuth = cookieStore.has('discogs_oauth_token') && cookieStore.has('discogs_oauth_token_secret');
    
    if (!hasAuth) {
      return NextResponse.json({ error: 'Authentication required. Please login with Discogs first.' }, { status: 401 });
    }
    
    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }
    
    console.time('collection-fetch'); // Add timing for debugging
    
    // Get the collection (basic info only, fast)
    try {
      const collection = await getUserCollection(username);
      
      console.timeEnd('collection-fetch'); // Log how long it took
      
      // Return the response (just the basic collection data, no stats yet)
      return NextResponse.json({ 
        releases: collection,
        // Empty placeholder stats that will be calculated client-side
        stats: {
          totalReleases: collection.length,
          averageRarityScore: 0,
          rarestItems: [],
          mostCommonItems: [],
          fewestHaves: [],
          mostWanted: [],
          mostCollectible: []
        },
        limitedResults: collection.length >= MAX_ITEMS
      });
      
    } catch (error: any) {
      console.error('Collection API error:', error);
      console.timeEnd('collection-fetch'); // Log time even on error
      
      // Handle timeout errors
      if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
        return NextResponse.json({ 
          error: 'Request timed out. The Discogs API may be experiencing high traffic or the collection may be too large to process.', 
          details: error.message
        }, { status: 504 });
      }
      
      // Handle network errors
      if (error.name === 'FetchError' || error.message.includes('network')) {
        return NextResponse.json({ 
          error: 'Network error while connecting to Discogs. Please check your connection and try again.', 
          details: error.message
        }, { status: 503 });
      }
      
      // Handle rate limit errors
      if (error.response?.status === 429 || error.message?.includes('rate limit')) {
        return NextResponse.json({ 
          error: 'Rate limit exceeded. Please try again in a few minutes.', 
          retryAfter: error.response?.headers?.['retry-after'] || '60',
          details: error.message
        }, { status: 429 });
      }
      
      // Handle API errors with specific status code
      if (error.response?.status) {
        return NextResponse.json({ 
          error: error.message || 'Error from Discogs API', 
          details: error.response?.data
        }, { status: error.response.status });
      }
      
      // Handle all other errors
      return NextResponse.json({ 
        error: error.message || 'An unexpected error occurred', 
        details: error.toString()
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Unexpected error in collection API route:', error);
    
    return NextResponse.json({ 
      error: 'An unexpected error occurred processing your request', 
      details: error.message || error.toString()
    }, { status: 500 });
  }
} 