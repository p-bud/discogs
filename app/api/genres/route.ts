import { NextResponse } from 'next/server';
import { getGenres } from '../../utils/discogs';
import { rateLimit } from '../../utils/rate-limiter';

/**
 * GET handler for genres endpoint
 * Returns a list of all available genres from Discogs
 */

// Genres cache with expiration (1 hour)
let genresCache: {
  data: string[],
  timestamp: number
} | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

export async function GET() {
  try {
    // Check cache first
    if (genresCache && (Date.now() - genresCache.timestamp < CACHE_TTL)) {
      console.log(`Returning ${genresCache.data.length} genres from cache`);
      return NextResponse.json(genresCache.data);
    }

    // Use the rate limiter to fetch genres to avoid hitting Discogs rate limits
    const genres = await rateLimit(async () => {
      return await getGenres();
    });

    // Update cache
    genresCache = {
      data: genres,
      timestamp: Date.now()
    };

    console.log(`Fetched ${genres.length} genres from Discogs API`);
    return NextResponse.json(genres);
  } catch (error: any) {
    console.error('Error fetching genres:', error);
    
    // Provide a useful error message
    return NextResponse.json(
      { 
        error: 'Failed to fetch genres',
        message: error.message || 'An unknown error occurred'
      },
      { status: 500 }
    );
  }
} 