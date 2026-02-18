import { NextResponse } from 'next/server';
import { getSupabaseClient, missingSupabaseVars } from '@/app/utils/supabase';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    const missing = missingSupabaseVars();
    return NextResponse.json(
      {
        error: 'Supabase is not configured — user logging is disabled.',
        missing,
      },
      { status: 503 }
    );
  }

  try {
    const { username, collectionSize } = await request.json();
    const headersList = headers();
    const userAgent = headersList.get('user-agent') || '';
    const ip = headersList.get('x-forwarded-for') || '';

    const { error } = await supabase
      .from('user_logs')
      .insert([
        {
          username,
          collection_size: collectionSize || null,
          ip,
          user_agent: userAgent,
        },
      ]);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error logging user:', error);
    return NextResponse.json({ success: false, error: 'Failed to log user' }, { status: 500 });
  }
}
