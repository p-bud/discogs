import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserCollection, calculateCollectionStats } from '../../utils/collection';
import { isAuthenticated } from '../../utils/discogs';

/**
 * GET handler for collection endpoint
 * Gets a user's Discogs collection and calculates rarity metrics
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Check if user is authenticated
  if (!isAuthenticated()) {
    return NextResponse.json(
      { error: 'Authentication required to access collection data' },
      { status: 401 }
    );
  }
  
  try {
    // Get username from query parameter
    const searchParams = request.nextUrl.searchParams;
    const username = searchParams.get('username');
    
    if (!username) {
      return NextResponse.json(
        { error: 'Discogs username is required' },
        { status: 400 }
      );
    }
    
    // Get the user's collection with rarity metrics
    const collection = await getUserCollection(username);
    
    // Calculate collection statistics
    const stats = calculateCollectionStats(collection);
    
    // Return both collection items and stats
    return NextResponse.json({
      collection,
      stats
    });
  } catch (error: any) {
    console.error('Error fetching collection:', error);
    
    // Handle timeout errors
    if (error.name === 'TimeoutError' || error.message?.includes('timeout') || error.code === 'ETIMEDOUT') {
      return NextResponse.json(
        { 
          error: 'Request timed out while fetching collection data. The Discogs API might be experiencing high traffic.',
          details: 'Try again later when the API might be less busy.'
        },
        { status: 504 }
      );
    }
    
    // Handle network errors
    if (error.name === 'FetchError' || error.code === 'ECONNRESET' || error.message?.includes('network')) {
      return NextResponse.json(
        { 
          error: 'Network error while connecting to Discogs API. Please check your connection.',
          details: error.message || 'Connection issue'
        },
        { status: 503 }
      );
    }
    
    // Handle rate limit errors
    if (error.response && error.response.status === 429) {
      return NextResponse.json(
        { 
          error: 'Discogs API rate limit exceeded. Please try again in a minute.',
          retryAfter: error.response.headers['retry-after'] || 60,
          details: 'The app is now using rate limiting and caching to minimize this issue.'
        },
        { 
          status: 429,
          headers: {
            'Retry-After': error.response.headers['retry-after'] || '60'
          }
        }
      );
    }
    
    // Handle other API errors
    if (error.response && error.response.status) {
      return NextResponse.json(
        { 
          error: `Discogs API error: ${error.response.status} ${error.response.statusText || ''}`,
          details: error.response.data?.message || error.message || 'Unknown error'
        },
        { status: error.response.status }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Error fetching collection data' },
      { status: 500 }
    );
  }
} 