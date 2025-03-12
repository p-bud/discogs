import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserCollection } from '../../utils/collection';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Maximum items to process to prevent timeouts
const MAX_ITEMS = 30;

/**
 * API route to get a user's Discogs collection
 * Gets a user's Discogs collection and calculates rarity metrics
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
    
    // Get the collection
    try {
      const collection = await getUserCollection(username);
      
      // Check if the collection was limited due to size constraints
      const isLimited = collection.length > 0 && collection.length <= MAX_ITEMS;

      // Calculate comprehensive stats from the collection for all tabs
      const stats = {
        totalReleases: collection.length,
        averageRarityScore: collection.reduce((sum, item) => sum + (item.rarityScore || 0), 0) / collection.length || 0,
        
        // For "Highest Ratio" tab
        rarestItems: [...collection]
          .sort((a, b) => (b.rarityScore || 0) - (a.rarityScore || 0))
          .slice(0, 10),
        
        // For "Most Common" tab
        mostCommonItems: [...collection]
          .sort((a, b) => (a.rarityScore || 0) - (b.rarityScore || 0))
          .slice(0, 10),
        
        // For "Fewest Haves" tab
        fewestHaves: [...collection]
          .sort((a, b) => (a.haveCount || 0) - (b.haveCount || 0))
          .slice(0, 10),
        
        // For "Most Wanted" tab
        mostWanted: [...collection]
          .sort((a, b) => (b.wantCount || 0) - (a.wantCount || 0))
          .slice(0, 10),
        
        // For "Most Collectible" tab
        mostCollectible: [...collection]
          .sort((a, b) => {
            // Create a collectibility score that favors items with both high have and want counts
            const aScore = ((a.haveCount || 0) * (a.wantCount || 0)) / 1000;
            const bScore = ((b.haveCount || 0) * (b.wantCount || 0)) / 1000;
            return bScore - aScore;
          })
          .slice(0, 10)
      };
      
      // Return the response
      return NextResponse.json({ 
        releases: collection,
        stats,
        limitedResults: isLimited
      });
      
    } catch (error: any) {
      console.error('Collection API error:', error);
      
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
      if (error.message.includes('rate limit') || error.status === 429) {
        const retryAfter = error.headers?.get('retry-after') || '60';
        return NextResponse.json({ 
          error: 'Discogs API rate limit exceeded. Please try again later.', 
          retryAfter, 
          details: error.message
        }, { status: 429 });
      }
      
      // Handle other API errors with the specific status
      if (error.status && error.status >= 400) {
        return NextResponse.json({ 
          error: error.message || 'Error from Discogs API', 
          details: error.toString() 
        }, { status: error.status });
      }
      
      // Default error response
      return NextResponse.json({ 
        error: 'Failed to fetch collection', 
        details: error.message 
      }, { status: 500 });
    }
  } catch (error: any) {
    // Last resort error handling for uncaught exceptions
    console.error('Uncaught exception in collection API route:', error);
    return NextResponse.json({ 
      error: 'An unexpected error occurred', 
      details: error.message 
    }, { status: 500 });
  }
} 