import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import axios from 'axios';
import { getSupabaseClient } from '@/app/utils/supabase';
import { createSupabaseServerClient } from '@/app/utils/supabase-server';
import { DiscogsOAuth } from '@/app/utils/auth';

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
      'discogs_username, display_name, show_discogs_link, avg_rarity_score, rarest_item_score, rarest_item_title, rarest_item_artist, collection_size, analyzed_at'
    )
    .eq('leaderboard_opt_in', true)
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

async function getDiscogsUsernameFromCookies(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get('discogs_oauth_token')?.value;
  const secret = request.cookies.get('discogs_oauth_token_secret')?.value;
  if (!token || !secret) return null;

  try {
    const identityUrl = 'https://api.discogs.com/oauth/identity';
    const oauth = new DiscogsOAuth();
    const oauthParams = oauth.authorize({ url: identityUrl, method: 'GET' }, { key: token, secret });
    const headers = oauth.toHeader(oauthParams);
    headers['User-Agent'] = 'DiscogsBarginFinder/1.0';
    const res = await axios.get(identityUrl, { headers, timeout: 5000 });
    return res.data?.username ?? null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const adminClient = getSupabaseClient();
  if (!adminClient) {
    return NextResponse.json({ error: 'Leaderboard unavailable' }, { status: 503 });
  }

  // Verify Supabase session — try cookie-based first, then Authorization header.
  let user = null;
  try {
    const supabase = createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    user = data.user ?? null;
  } catch { /* ignore */ }

  if (!user) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const supabase = createSupabaseServerClient();
        const { data } = await supabase.auth.getUser(authHeader.slice(7));
        user = data.user ?? null;
      } catch { /* ignore */ }
    }
  }

  if (!user) {
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

  // Look up linked Discogs username + leaderboard settings from user_profiles.
  let discogsUsername: string | null = null;
  let displayName: string | null = null;
  let showDiscogsLink: boolean = true;
  const { data: profile } = await adminClient
    .from('user_profiles')
    .select('discogs_username, display_name, leaderboard_opt_in, show_discogs_link')
    .eq('id', user.id)
    .single();

  discogsUsername = profile?.discogs_username ?? null;
  displayName = profile?.display_name ?? null;
  showDiscogsLink = profile?.show_discogs_link ?? true;

  // Require explicit opt-in before submitting to the public leaderboard.
  // No profile row = user has never opted in. leaderboard_opt_in=false = user opted out.
  if (!profile?.leaderboard_opt_in) {
    return NextResponse.json(
      { error: 'Enable leaderboard participation in account settings first.' },
      { status: 403 }
    );
  }

  // If not linked yet, try to auto-link from Discogs cookies on this request.
  if (!discogsUsername) {
    const fetchedUsername = await getDiscogsUsernameFromCookies(request);
    if (fetchedUsername) {
      await adminClient
        .from('user_profiles')
        .upsert({ id: user.id, discogs_username: fetchedUsername }, { onConflict: 'id' });
      discogsUsername = fetchedUsername;
    }
  }

  if (!discogsUsername) {
    return NextResponse.json(
      { error: 'Connect your Discogs account before submitting to the leaderboard.' },
      { status: 403 }
    );
  }

  const { avg_rarity_score, rarest_item_score, rarest_item_title, rarest_item_artist, collection_size } = parsed.data;

  const { error: upsertError } = await adminClient
    .from('leaderboard_entries')
    .upsert(
      {
        user_id: user.id,
        discogs_username: discogsUsername,
        display_name: displayName,
        leaderboard_opt_in: true,
        show_discogs_link: showDiscogsLink,
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
