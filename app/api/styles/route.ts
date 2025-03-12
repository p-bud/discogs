import { NextResponse } from 'next/server';
import { STYLES } from '../../utils/hardcoded-data';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * GET handler for styles endpoint
 * Returns a list of all available styles from hardcoded data
 */
export async function GET() {
  try {
    console.log(`Returning ${STYLES.length} styles from hardcoded data`);
    return NextResponse.json(STYLES);
  } catch (error: any) {
    console.error('Error fetching styles:', error);
    return NextResponse.json(
      { error: 'Failed to get styles' },
      { status: 500 }
    );
  }
} 