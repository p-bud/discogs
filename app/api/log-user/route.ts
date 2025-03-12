import { NextResponse } from 'next/server';
import { supabase } from '@/app/utils/supabase';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { username, collectionSize } = await request.json();
    const headersList = headers();
    const userAgent = headersList.get('user-agent') || '';
    const ip = headersList.get('x-forwarded-for') || '';
    
    const { data, error } = await supabase
      .from('user_logs')
      .insert([
        { 
          username, 
          collection_size: collectionSize || null,
          ip,
          user_agent: userAgent 
        }
      ]);
      
    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error logging user:', error);
    return NextResponse.json({ success: false, error: 'Failed to log user' }, { status: 500 });
  }
} 