'use client';

import React from 'react';

export interface LeaderboardEntry {
  discogs_username: string;
  display_name: string | null;
  show_discogs_link: boolean;
  avg_rarity_score: number;
  rarest_item_score: number;
  rarest_item_title: string | null;
  rarest_item_artist: string | null;
  collection_size: number;
  analyzed_at: string;
}

type RankKey = 'avg_rarity' | 'rarest_item' | 'collection';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  rank: RankKey;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function scoreCell(entry: LeaderboardEntry, rank: RankKey) {
  switch (rank) {
    case 'avg_rarity':
      return Number(entry.avg_rarity_score).toFixed(4);
    case 'rarest_item':
      return (
        <span>
          <span className="font-medium">{Number(entry.rarest_item_score).toFixed(4)}</span>
          {entry.rarest_item_title && (
            <span className="block text-xs text-minimal-gray-500 truncate max-w-[200px]">
              {entry.rarest_item_artist} — {entry.rarest_item_title}
            </span>
          )}
        </span>
      );
    case 'collection':
      return entry.collection_size.toLocaleString();
  }
}

function scoreHeader(rank: RankKey) {
  switch (rank) {
    case 'avg_rarity': return 'Avg Rarity Score';
    case 'rarest_item': return 'Rarest Item Score';
    case 'collection': return 'Collection Size';
  }
}

export default function LeaderboardTable({ entries, rank }: LeaderboardTableProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-16 text-minimal-gray-500">
        No entries yet. Be the first to submit!
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-minimal-gray-200">
      <table className="min-w-full divide-y divide-minimal-gray-200 text-sm">
        <thead className="bg-minimal-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-minimal-gray-600 w-12">#</th>
            <th className="px-4 py-3 text-left font-semibold text-minimal-gray-600">Username</th>
            <th className="px-4 py-3 text-left font-semibold text-minimal-gray-600">{scoreHeader(rank)}</th>
            {rank !== 'collection' && (
              <th className="px-4 py-3 text-left font-semibold text-minimal-gray-600 hidden md:table-cell">Collection</th>
            )}
            <th className="px-4 py-3 text-left font-semibold text-minimal-gray-600 hidden sm:table-cell">Updated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-minimal-gray-100 bg-white">
          {entries.map((entry, i) => (
            <tr key={entry.discogs_username} className={i < 3 ? 'bg-amber-50/40' : ''}>
              <td className="px-4 py-3 font-bold text-minimal-gray-400">
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
              </td>
              <td className="px-4 py-3">
                {entry.display_name ? (
                  entry.show_discogs_link ? (
                    <a
                      href={`https://www.discogs.com/user/${encodeURIComponent(entry.discogs_username)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-minimal-accent hover:underline font-medium"
                    >
                      {entry.display_name}
                    </a>
                  ) : (
                    <span className="font-medium text-minimal-gray-800">{entry.display_name}</span>
                  )
                ) : (
                  <a
                    href={`https://www.discogs.com/user/${encodeURIComponent(entry.discogs_username)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-minimal-accent hover:underline font-medium"
                  >
                    {entry.discogs_username}
                  </a>
                )}
              </td>
              <td className="px-4 py-3 text-minimal-gray-800">
                {scoreCell(entry, rank)}
              </td>
              {rank !== 'collection' && (
                <td className="px-4 py-3 text-minimal-gray-600 hidden md:table-cell">
                  {entry.collection_size.toLocaleString()}
                </td>
              )}
              <td className="px-4 py-3 text-minimal-gray-400 hidden sm:table-cell">
                {relativeTime(entry.analyzed_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
