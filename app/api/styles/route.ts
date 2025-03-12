import { NextResponse } from 'next/server';
import { getStyles } from '../../utils/discogs';
import { rateLimit } from '../../utils/rate-limiter';

/**
 * GET handler for styles endpoint
 * Returns a list of all available styles from Discogs
 */

// Styles cache with expiration (1 hour)
let stylesCache: {
  data: string[],
  timestamp: number
} | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

export async function GET() {
  try {
    // Check cache first
    if (stylesCache && (Date.now() - stylesCache.timestamp < CACHE_TTL)) {
      console.log(`Returning ${stylesCache.data.length} styles from cache`);
      return NextResponse.json(stylesCache.data);
    }

    // Use the rate limiter to fetch styles to avoid hitting Discogs rate limits
    const styles = await rateLimit(async () => {
      return await getStyles();
    });

    // Update cache
    stylesCache = {
      data: styles,
      timestamp: Date.now()
    };

    console.log(`Fetched ${styles.length} styles from Discogs API`);
    return NextResponse.json(styles);
  } catch (error: any) {
    console.error('Error fetching styles:', error);
    
    // Provide a useful error message
    return NextResponse.json(
      { 
        error: 'Failed to fetch styles',
        message: error.message || 'An unknown error occurred'
      },
      { status: 500 }
    );
  }
} 