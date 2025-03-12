import { NextResponse } from 'next/server';
import { getGenreStyleMap } from '../../utils/discogs';
import { rateLimit } from '../../utils/rate-limiter';

/**
 * GET handler for genre-style-map endpoint
 * Returns a mapping of genres to their related styles from Discogs
 */

// Genre-style map cache with expiration (1 hour)
let mapCache: {
  data: Record<string, string[]>,
  timestamp: number
} | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

export async function GET() {
  try {
    // Check cache first
    if (mapCache && (Date.now() - mapCache.timestamp < CACHE_TTL)) {
      console.log(`Returning genre-style map with ${Object.keys(mapCache.data).length} genres from cache`);
      return NextResponse.json(mapCache.data);
    }

    // Use the rate limiter to fetch the genre-style map to avoid hitting Discogs rate limits
    const genreStyleMap = await rateLimit(async () => {
      return await getGenreStyleMap();
    });

    // Update cache
    mapCache = {
      data: genreStyleMap,
      timestamp: Date.now()
    };

    console.log(`Fetched genre-style map with ${Object.keys(genreStyleMap).length} genres from Discogs API`);
    return NextResponse.json(genreStyleMap);
  } catch (error: any) {
    console.error('Error fetching genre-style map:', error);
    
    // Provide a useful error message
    return NextResponse.json(
      { 
        error: 'Failed to fetch genre-style map',
        message: error.message || 'An unknown error occurred'
      },
      { status: 500 }
    );
  }
} 