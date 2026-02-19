import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseClient } from '@/app/utils/supabase';
import { createSupabaseServerClient } from '@/app/utils/supabase-server';

export const dynamic = 'force-dynamic';

const RANK_COLUMNS = {
  avg_rarity: 'avg_rarity_score',
  rarest_item: 'rarest_item_score',
  collection: 'collection_size',
} as const;

type RankKey = keyof typeof RANK_COLUMNS;

// --- GET /api/leaderboard?rank=avg_rarity|rarest_item|collection ---
export async function GET(request: NextRequest) {
  const rankParam = (request.nextUrl.searchParams.get('rank') ?? 'avg_rarity') as RankKey;

  if (!Object.keys(RANK_COLUMNS).includes(rankParam)) {
    return NextResponse.json(
      { error: 'Invalid rank parameter. Use: avg_rarity, rarest_item, or collection' },
      { status: 400 }
    );
  }

  const adminClient = getSupabaseClient();
  if (!adminClient) {
    return NextResponse.json({ error: 'Leaderboard unavailable' }, { status: 503 });
  }

  const column = RANK_COLUMNS[rankParam];

  const { data, error } = await adminClient
    .from('leaderboard_entries')
    .select(
      'discogs_username, avg_rarity_score, rarest_item_score, rarest_item_title, rarest_item_artist, collection_size, analyzed_at'
    )
    .order(column, { ascending: false })
    .limit(50);

  if (error) {
    console.error('Leaderboard fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }

  return NextResponse.json({ entries: data ?? [], rank: rankParam });
}

// --- POST /api/leaderboard (requires Supabase session) ---
const SubmitSchema = z.object({
  avg_rarity_score: z.number().min(0),
  rarest_item_score: z.number().min(0),
  rarest_item_title: z.string().max(500).default(''),
  rarest_item_artist: z.string().max(500).default(''),
  collection_size: z.number().int().min(0),
});

export async function POST(request: NextRequest) {
  // Verify Supabase session.
  const supabase = createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Sign in to submit to the leaderboard.' },
      { status: 401 }
    );
  }

  // Parse + validate body.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = SubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const adminClient = getSupabaseClient();
  if (!adminClient) {
    return NextResponse.json({ error: 'Leaderboard unavailable' }, { status: 503 });
  }

  // Look up the user's linked Discogs username.
  const { data: profile, error: profileError } = await adminClient
    .from('user_profiles')
    .select('discogs_username')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.discogs_username) {
    return NextResponse.json(
      { error: 'Connect your Discogs account before submitting to the leaderboard.' },
      { status: 403 }
    );
  }

  const { avg_rarity_score, rarest_item_score, rarest_item_title, rarest_item_artist, collection_size } = parsed.data;

  // Upsert — one row per discogs_username; updates all scores on re-submit.
  const { error: upsertError } = await adminClient
    .from('leaderboard_entries')
    .upsert(
      {
        user_id: user.id,
        discogs_username: profile.discogs_username,
        avg_rarity_score,
        rarest_item_score,
        rarest_item_title,
        rarest_item_artist,
        collection_size,
        analyzed_at: new Date().toISOString(),
      },
      { onConflict: 'discogs_username' }
    );

  if (upsertError) {
    console.error('Leaderboard upsert error:', upsertError);
    return NextResponse.json({ error: 'Failed to submit to leaderboard' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
