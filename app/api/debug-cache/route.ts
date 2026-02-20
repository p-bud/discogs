import { NextResponse } from 'next/server';
import { getSupabaseClient } from '../../utils/supabase';

// Temporary diagnostic route — remove after confirming cache writes work.
export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return NextResponse.json({ error: 'Supabase client is null — env vars missing', env: {
      url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    }});
  }

  // Try inserting one row and return the exact error (if any)
  const testRow = {
    discogs_username: '__debug__',
    release_id: '__debug__',
    title: 'debug',
    artist: 'debug',
    year: '2024',
    formats: ['Vinyl'],
    cover_image: '',
    synced_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('user_collection_cache')
    .upsert(testRow, { onConflict: 'discogs_username,release_id' });

  // Clean up regardless
  await supabase.from('user_collection_cache').delete().eq('discogs_username', '__debug__');

  if (error) {
    return NextResponse.json({ ok: false, error });
  }
  return NextResponse.json({ ok: true, message: 'Upsert succeeded from within Vercel' });
}
