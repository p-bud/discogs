import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/app/utils/supabase';
import { createSupabaseServerClient } from '@/app/utils/supabase-server';

export const dynamic = 'force-dynamic';

// --- GET /api/account/export ---
// GDPR Article 15 — right of access. Returns all user data as a JSON download.
export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminClient = getSupabaseClient();
  if (!adminClient) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }

  // Fetch profile first so we have discogs_username for the collection query.
  const { data: profile } = await adminClient
    .from('user_profiles')
    .select('discogs_username, display_name, leaderboard_opt_in, show_discogs_link, created_at')
    .eq('id', user.id)
    .single();

  const discogsUsername = profile?.discogs_username ?? null;

  const [leaderboardResult, collectionResult] = await Promise.all([
    adminClient
      .from('leaderboard_entries')
      .select('avg_rarity_score, rarest_item_score, rarest_item_title, rarest_item_artist, collection_size, analyzed_at')
      .eq('user_id', user.id)
      .maybeSingle(),
    discogsUsername
      ? adminClient
          .from('user_collection_cache')
          .select('release_id, title, artist, year, formats, cover_image, cached_at')
          .eq('discogs_username', discogsUsername)
      : Promise.resolve({ data: [] }),
  ]);

  const payload = {
    exported_at: new Date().toISOString(),
    account: {
      email: user.email,
      created_at: user.created_at,
    },
    profile: profile ?? null,
    leaderboard_entry: leaderboardResult.data ?? null,
    collection_cache: collectionResult.data ?? [],
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="raerz-data-export.json"',
    },
  });
}
