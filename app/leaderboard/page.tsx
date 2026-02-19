import React from 'react';
import LeaderboardTabs from './LeaderboardTabs';

// ISR: revalidate every 60 seconds so the leaderboard stays fresh without blocking page load.
export const revalidate = 60;

type RankKey = 'avg_rarity' | 'rarest_item' | 'collection';

async function fetchEntries(rank: RankKey) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  try {
    const res = await fetch(`${baseUrl}/api/leaderboard?rank=${rank}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.entries ?? [];
  } catch {
    return [];
  }
}

export default async function LeaderboardPage() {
  const [avgRarityEntries, rarestItemEntries, collectionEntries] = await Promise.all([
    fetchEntries('avg_rarity'),
    fetchEntries('rarest_item'),
    fetchEntries('collection'),
  ]);

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-picnic text-minimal-black mb-2">Leaderboard</h1>
        <p className="text-minimal-gray-600 text-sm">
          Analyze your collection and submit to appear here. Rankings update every minute.
        </p>
      </div>

      <LeaderboardTabs
        avgRarityEntries={avgRarityEntries}
        rarestItemEntries={rarestItemEntries}
        collectionEntries={collectionEntries}
      />
    </main>
  );
}
