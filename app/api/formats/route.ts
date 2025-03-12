import { NextResponse } from 'next/server';
import { getFormats } from '../../utils/discogs';

/**
 * GET handler for formats endpoint
 * Returns a list of all available formats from Discogs
 */
export async function GET() {
  try {
    const formats = await getFormats();
    return NextResponse.json(formats);
  } catch (error: any) {
    console.error('Error fetching formats:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch formats' },
      { status: 500 }
    );
  }
} 