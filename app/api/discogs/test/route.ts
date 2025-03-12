import { NextResponse } from 'next/server';
import axios from 'axios';
import { cookies } from 'next/headers';
import { DiscogsOAuth, apiConfig } from '@/app/utils/auth';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// A simple test endpoint to verify Discogs API credentials
export async function GET() {
  try {
    console.log('Testing Discogs API credentials...');
    
    // Mask the consumer secret for security in logs
    const consumerKey = apiConfig.DISCOGS_CONSUMER_KEY;
    const maskedSecret = apiConfig.DISCOGS_CONSUMER_SECRET.substring(0, 4) + '...' + 
      apiConfig.DISCOGS_CONSUMER_SECRET.substring(apiConfig.DISCOGS_CONSUMER_SECRET.length - 4);
    
    console.log(`Using Consumer Key: ${consumerKey}`);
    console.log(`Using Consumer Secret: ${maskedSecret} (masked)`);
    
    // Check if we have OAuth credentials in cookies
    const cookieStore = cookies();
    const oauthToken = cookieStore.get('discogs_oauth_token')?.value;
    const oauthTokenSecret = cookieStore.get('discogs_oauth_token_secret')?.value;
    
    // URL for the test - search for Miles Davis
    const testUrl = 'https://api.discogs.com/database/search?q=Miles+Davis&type=artist&per_page=3';
    let headers: Record<string, string> = { 'User-Agent': 'DiscogsBarginFinder/1.0' };
    
    // If we have OAuth credentials, use them for authentication
    if (oauthToken && oauthTokenSecret) {
      console.log('Using OAuth for authentication');
      
      const oauth = new DiscogsOAuth();
      const oauthParams = oauth.authorize(
        { url: testUrl, method: 'GET' },
        { key: oauthToken, secret: oauthTokenSecret }
      );
      
      headers = {
        ...headers,
        ...oauth.toHeader(oauthParams)
      };
    } else {
      // Otherwise fall back to API key
      console.log('Using API key for authentication');
      headers['Authorization'] = `Discogs key=${apiConfig.DISCOGS_CONSUMER_KEY}, secret=${apiConfig.DISCOGS_CONSUMER_SECRET}`;
    }
    
    console.log('Making test request to Discogs API...');
    const response = await axios.get(testUrl, { headers });
    
    console.log('Discogs API connection successful!');
    return NextResponse.json({
      success: true,
      message: 'Successfully connected to Discogs API',
      data: {
        status: response.status,
        results: response.data.results,
      }
    });
    
  } catch (error) {
    console.error('Error connecting to Discogs API:', error);
    
    let errorDetails = 'Unknown error';
    let statusCode = 500;
    
    if (axios.isAxiosError(error) && error.response) {
      const { status, data, headers } = error.response;
      console.error('Response status:', status);
      console.error('Response data:', data);
      console.error('Response headers:', headers);
      
      errorDetails = `${status} ${JSON.stringify(data)}`;
      statusCode = status;
    }
    
    return NextResponse.json({
      success: false,
      message: 'Failed to connect to Discogs API',
      error: errorDetails
    }, { status: statusCode });
  }
}

export const runtime = 'edge'; 