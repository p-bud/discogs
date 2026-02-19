'use client';

import React, { useState } from 'react';
import LeaderboardTable, { LeaderboardEntry } from '../components/LeaderboardTable';

type RankKey = 'avg_rarity' | 'rarest_item' | 'collection';

interface LeaderboardTabsProps {
  avgRarityEntries: LeaderboardEntry[];
  rarestItemEntries: LeaderboardEntry[];
  collectionEntries: LeaderboardEntry[];
}

const TABS: { key: RankKey; label: string; description: string }[] = [
  {
    key: 'avg_rarity',
    label: 'Avg Rarity',
    description: 'Ranked by average rarity score across the full collection.',
  },
  {
    key: 'rarest_item',
    label: 'Rarest Item',
    description: 'Ranked by the single rarest record in the collection.',
  },
  {
    key: 'collection',
    label: 'Biggest Collection',
    description: 'Ranked by total number of records in the collection.',
  },
];

export default function LeaderboardTabs({
  avgRarityEntries,
  rarestItemEntries,
  collectionEntries,
}: LeaderboardTabsProps) {
  const [activeTab, setActiveTab] = useState<RankKey>('avg_rarity');

  const entriesMap: Record<RankKey, LeaderboardEntry[]> = {
    avg_rarity: avgRarityEntries,
    rarest_item: rarestItemEntries,
    collection: collectionEntries,
  };

  const activeTab_ = TABS.find(t => t.key === activeTab)!;

  return (
    <div>
      {/* Tab bar */}
      <div className="flex border-b border-minimal-gray-200 mb-6 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`whitespace-nowrap px-5 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'text-minimal-accent border-b-2 border-minimal-accent -mb-px'
                : 'text-minimal-gray-500 hover:text-minimal-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-minimal-gray-500 mb-4">{activeTab_.description}</p>

      <LeaderboardTable entries={entriesMap[activeTab]} rank={activeTab} />
    </div>
  );
}
