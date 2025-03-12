import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'exists' : 'missing',
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'exists' : 'missing',
    // Include first few characters of the URL for verification, but hide the key
    supabaseUrlValue: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 15) + '...',
    nodeEnv: process.env.NODE_ENV
  });
} 