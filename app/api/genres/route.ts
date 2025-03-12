import { NextResponse } from 'next/server';
import { GENRES } from '../../utils/hardcoded-data';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * GET handler for genres endpoint
 * Returns a list of all available genres from hardcoded data
 */
export async function GET() {
  try {
    console.log(`Returning ${GENRES.length} genres from hardcoded data`);
    return NextResponse.json(GENRES);
  } catch (error: any) {
    console.error('Error fetching genres:', error);
    return NextResponse.json(
      { error: 'Failed to get genres' },
      { status: 500 }
    );
  }
} 