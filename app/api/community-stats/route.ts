import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/app/utils/supabase';

export async function GET(request: NextRequest) {
  const scoreParam = request.nextUrl.searchParams.get('score');
  const userScore = scoreParam ? parseFloat(scoreParam) : null;

  const adminClient = getSupabaseClient();
  if (!adminClient) {
    return NextResponse.json({ error: 'Unavailable' }, { status: 503 });
  }

  // Fetch all avg_rarity_score values from opted-in leaderboard entries
  const { data, error } = await adminClient
    .from('leaderboard_entries')
    .select('avg_rarity_score, collection_size')
    .eq('leaderboard_opt_in', true)
    .gt('avg_rarity_score', 0);

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }

  const entries = data ?? [];
  const total = entries.length;

  if (total === 0) {
    return NextResponse.json({ collectionsAnalyzed: 0, avgRarityScore: 0, percentileRank: null });
  }

  const avgRarityScore = entries.reduce((sum, e) => sum + Number(e.avg_rarity_score), 0) / total;
  const totalRecords = entries.reduce((sum, e) => sum + Number(e.collection_size ?? 0), 0);

  let percentileRank: number | null = null;
  if (userScore !== null && !isNaN(userScore)) {
    const below = entries.filter(e => Number(e.avg_rarity_score) < userScore).length;
    // percentileRank = percentage of collections that are LESS rare (user beats them)
    percentileRank = Math.round((below / total) * 100);
  }

  const response = NextResponse.json({
    collectionsAnalyzed: total,
    avgRarityScore,
    totalRecords,
    percentileRank,
  });
  response.headers.set('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
  return response;
}
