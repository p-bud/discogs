import { NextRequest, NextResponse } from 'next/server';
import { getReleaseCommunityData } from '../../../utils/collection';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const releaseId = params.id;

    // Auth is enforced by middleware.ts — no duplicate check needed here.
    const releaseDetails = await getReleaseCommunityData(releaseId);
    
    return NextResponse.json(releaseDetails);
  } catch (error: any) {
    console.error('Error fetching release details:', error);
    
    // Handle rate limit errors
    if (error.message?.includes('rate limit') || error.response?.status === 429) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', details: error.message },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Error fetching release details' },
      { status: 500 }
    );
  }
} 