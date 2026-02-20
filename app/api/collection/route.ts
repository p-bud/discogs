import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserCollection } from '../../utils/collection';

const UsernameSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9._-]+$/, 'Invalid Discogs username');

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * API route to get a user's Discogs collection
 * Gets a user's Discogs collection with basic info (no community data)
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username');
    const forceRefresh = searchParams.get('forceRefresh') === 'true';

    // Auth is enforced by middleware.ts — no duplicate check needed here.
    const parsed = UsernameSchema.safeParse(username);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid username', issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    console.time('collection-fetch'); // Add timing for debugging

    // Get the collection (basic info only, fast)
    try {
      const { items: collection, hitPageCap, fromCache, cachedAt } = await getUserCollection(parsed.data, forceRefresh);

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
        limitedResults: hitPageCap,
        fromCache,
        cachedAt,
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