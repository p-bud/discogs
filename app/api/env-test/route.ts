import { NextResponse } from 'next/server';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'exists' : 'missing',
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'exists' : 'missing',
    supabaseUrlValue: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 15) + '...',
    nodeEnv: process.env.NODE_ENV,
  });
} 