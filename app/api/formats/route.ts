import { NextResponse } from 'next/server';
import { getFormats } from '../../utils/discogs';

export async function GET() {
  try {
    const formats = await getFormats();
    return NextResponse.json(formats, {
      headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400' },
    });
  } catch (error: any) {
    console.error('Error fetching formats:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch formats' }, { status: 500 });
  }
}
