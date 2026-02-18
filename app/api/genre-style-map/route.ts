import { NextResponse } from 'next/server';
import { GENRE_STYLE_MAP } from '../../utils/hardcoded-data';

export async function GET() {
  try {
    return NextResponse.json(GENRE_STYLE_MAP, {
      headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400' },
    });
  } catch (error: any) {
    console.error('Error fetching genre-style map:', error);
    return NextResponse.json({ error: 'Failed to get genre-style map' }, { status: 500 });
  }
}
