import { NextResponse } from 'next/server';
import { GENRES } from '../../utils/hardcoded-data';

export async function GET() {
  try {
    return NextResponse.json(GENRES, {
      headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400' },
    });
  } catch (error: any) {
    console.error('Error fetching genres:', error);
    return NextResponse.json({ error: 'Failed to get genres' }, { status: 500 });
  }
}
