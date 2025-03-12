import { NextResponse } from 'next/server';
import { GENRE_STYLE_MAP } from '../../utils/hardcoded-data';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * GET handler for genre-style-map endpoint
 * Returns a mapping of genres to their related styles from hardcoded data
 */
export async function GET() {
  try {
    console.log(`Returning genre-style map with ${Object.keys(GENRE_STYLE_MAP).length} genres from hardcoded data`);
    return NextResponse.json(GENRE_STYLE_MAP);
  } catch (error: any) {
    console.error('Error fetching genre-style map:', error);
    return NextResponse.json(
      { error: 'Failed to get genre-style map' },
      { status: 500 }
    );
  }
} 