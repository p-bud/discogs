import { NextResponse } from 'next/server';
import { STYLES } from '../../utils/hardcoded-data';

export async function GET() {
  try {
    return NextResponse.json(STYLES, {
      headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400' },
    });
  } catch (error: any) {
    console.error('Error fetching styles:', error);
    return NextResponse.json({ error: 'Failed to get styles' }, { status: 500 });
  }
}
