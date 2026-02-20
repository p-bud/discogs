'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { CollectionItem, WrappedStats } from '../models/types';
import { computeWrappedStats } from '../utils/wrapped-stats';
import { useReleaseDetails } from '../hooks/useReleaseDetails';
import { handleDiscogsAuth } from '../utils/discogs-client';

const TARGET_YEAR = new Date().getFullYear() - 1;
const ACCENT = '#4f46e5';

// ── Sub-components ──────────────────────────────────────────────────────────

function BarChart({ rows, labelKey, countKey, max }: {
  rows: Record<string, any>[];
  labelKey: string;
  countKey: string;
  max: number;
}) {
  if (rows.length === 0) return <p className="text-minimal-gray-500 text-sm">No data</p>;
  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="w-28 text-sm text-minimal-gray-700 truncate flex-shrink-0">
            {row[labelKey]}
          </span>
          <div className="flex-1 bg-minimal-gray-100 rounded h-5 overflow-hidden">
            <div
              className="h-full rounded transition-all"
              style={{
                width: max > 0 ? `${(row[countKey] / max) * 100}%` : '0%',
                backgroundColor: ACCENT,
              }}
            />
          </div>
          <span className="text-sm font-semibold text-minimal-gray-700 w-6 text-right flex-shrink-0">
            {row[countKey]}
          </span>
        </div>
      ))}
    </div>
  );
}

function RarityCard({ label, item }: { label: string; item: CollectionItem }) {
  return (
    <div className="flex-1 min-w-0 border border-minimal-gray-200 rounded-lg p-4">
      <p className="text-xs uppercase tracking-widest text-minimal-gray-500 mb-3">{label}</p>
      {item.coverImage && (
        <div className="relative w-20 h-20 mb-3">
          <Image
            src={item.coverImage}
            alt={item.title}
            fill
            className="object-cover rounded"
            sizes="80px"
          />
        </div>
      )}
      <p className="font-semibold text-minimal-black text-sm leading-snug">{item.title}</p>
      <p className="text-xs text-minimal-gray-500">{item.artist}</p>
      <p className="mt-2 text-sm font-picnic" style={{ color: ACCENT }}>
        {item.rarityScore.toFixed(2)} rarity
      </p>
    </div>
  );
}

// ── Per-session page cache ───────────────────────────────────────────────────
// Keyed by username. Persists across page navigations (module scope).
// Cleared on forceRefresh so "Refresh Collection" always re-fetches.

interface WrappedPageCache {
  releases: CollectionItem[];
  stats: WrappedStats;
  fromCache: boolean;
}
const wrappedPageCache = new Map<string, WrappedPageCache>();

// ── Main component ──────────────────────────────────────────────────────────

interface WrappedAnalysisProps {
  username: string | null;
}

export default function WrappedAnalysis({ username }: WrappedAnalysisProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wrappedStats, setWrappedStats] = useState<WrappedStats | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Raw collection passed to useReleaseDetails for community-data enrichment.
  // The hook skips any item that already has haveCount/wantCount, so it's
  // instant when the Supabase community cache is warm, and fills the gaps
  // (fetching from Discogs) when it's cold.
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const {
    enrichedReleases,
    loading: enriching,
    completed: enrichmentDone,
  } = useReleaseDetails(collection);

  // Re-compute stats once enrichment finishes (picks up rarity scores)
  // and write the final result to the page cache.
  useEffect(() => {
    if (enrichmentDone && enrichedReleases.length > 0) {
      const stats = computeWrappedStats(enrichedReleases, TARGET_YEAR);
      setWrappedStats(stats);
      if (username) {
        wrappedPageCache.set(username, { releases: enrichedReleases, stats, fromCache });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrichmentDone]);

  const fetchAndCompute = async (forceRefresh = false) => {
    if (!username) return;
    setLoading(true);
    setError(null);
    setWrappedStats(null);
    setCollection([]);

    try {
      const baseUrl = `/api/collection?username=${encodeURIComponent(username)}`;
      let releases: CollectionItem[] = [];

      if (forceRefresh) {
        const refreshRes = await fetch(`${baseUrl}&forceRefresh=true`);
        if (!refreshRes.ok) {
          const d = await refreshRes.json();
          throw new Error(d.error || `Error ${refreshRes.status}`);
        }
        const refreshData = await refreshRes.json();
        releases = refreshData.releases ?? [];
      } else {
        const res = await fetch(baseUrl);
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || `Error ${res.status}`);
        }
        const data = await res.json();
        releases = data.releases ?? [];
        setFromCache(data.fromCache ?? false);
      }

      // Compute initial stats immediately (genres/formats/decades render now).
      // useReleaseDetails will enrich rarity scores and trigger a re-compute.
      setWrappedStats(computeWrappedStats(releases, TARGET_YEAR));
      setCollection(releases);
    } catch (err: any) {
      setError(err.message || 'Failed to load collection');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!username) return;
    const cached = wrappedPageCache.get(username);
    if (cached) {
      setWrappedStats(cached.stats);
      setFromCache(cached.fromCache);
      return;
    }
    fetchAndCompute();
  }, [username]);

  const handleRefresh = () => {
    if (username) wrappedPageCache.delete(username);
    setRefreshing(true);
    fetchAndCompute(true);
  };

  // ── Not connected ──────────────────────────────────────────────────────────
  if (!username) {
    return (
      <div className="text-center py-16">
        <p className="text-4xl mb-4 font-picnic text-minimal-black">Your {TARGET_YEAR} in Records</p>
        <p className="text-minimal-gray-500 mb-6">Connect your Discogs account to see your Wrapped stats.</p>
        <button
          onClick={handleDiscogsAuth}
          className="inline-block px-6 py-3 rounded text-white font-semibold"
          style={{ backgroundColor: ACCENT }}
        >
          Connect Discogs
        </button>
      </div>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="text-center py-16">
        <p className="text-minimal-gray-500 animate-pulse">Loading your {TARGET_YEAR} Wrapped…</p>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => fetchAndCompute()}
          className="px-4 py-2 border border-minimal-gray-300 rounded hover:bg-minimal-gray-50 text-sm"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!wrappedStats) return null;

  const { totalAdded, hasPartialData, genreBreakdown, styleBreakdown, formatBreakdown,
          decadeBreakdown, rarestAddition, mostCommonAddition,
          avgRarityThisYear, avgRarityAllTime } = wrappedStats;

  const maxGenre  = genreBreakdown[0]?.count  ?? 1;
  const maxStyle  = styleBreakdown[0]?.count  ?? 1;
  const maxFormat = formatBreakdown[0]?.count ?? 1;
  const maxDecade = decadeBreakdown[0]?.count ?? 1;

  // ── Partial data banners ───────────────────────────────────────────────────
  const showFullBanner  = totalAdded === 0 && hasPartialData;
  const showFooterNote  = totalAdded > 0  && hasPartialData;

  return (
    <div className="space-y-8 pb-16">

      {/* Title */}
      <div className="text-center pt-4">
        <h1 className="text-4xl sm:text-5xl font-picnic text-minimal-black uppercase tracking-tight">
          Your {TARGET_YEAR} in Records
        </h1>
      </div>

      {/* Partial-data full banner */}
      {showFullBanner && (
        <div className="border border-amber-300 bg-amber-50 rounded-lg p-5 text-center">
          <p className="font-semibold text-amber-800 mb-2">
            Your collection was cached before Wrapped launched.
          </p>
          <p className="text-amber-700 text-sm mb-4">
            Refresh to generate your {TARGET_YEAR} stats.
          </p>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-5 py-2 rounded text-white text-sm font-semibold disabled:opacity-60"
            style={{ backgroundColor: ACCENT }}
          >
            {refreshing ? 'Refreshing…' : 'Refresh Collection'}
          </button>
        </div>
      )}

      {/* Hero card */}
      <div className="rounded-2xl p-8 text-center text-white" style={{ backgroundColor: ACCENT }}>
        <p className="text-7xl sm:text-8xl font-picnic font-bold leading-none">{totalAdded}</p>
        <p className="text-xl mt-3 opacity-90">
          record{totalAdded !== 1 ? 's' : ''} added in {TARGET_YEAR}
        </p>
      </div>

      {/* Top Genres */}
      {genreBreakdown.length > 0 && (
        <section>
          <h2 className="text-xl font-picnic text-minimal-black mb-4">Top Genres</h2>
          <BarChart
            rows={genreBreakdown}
            labelKey="genre"
            countKey="count"
            max={maxGenre}
          />
        </section>
      )}

      {/* Top Formats */}
      {formatBreakdown.length > 0 && (
        <section>
          <h2 className="text-xl font-picnic text-minimal-black mb-4">Top Formats</h2>
          <BarChart
            rows={formatBreakdown}
            labelKey="format"
            countKey="count"
            max={maxFormat}
          />
        </section>
      )}

      {/* By Decade */}
      {decadeBreakdown.length > 0 && (
        <section>
          <h2 className="text-xl font-picnic text-minimal-black mb-4">By Decade</h2>
          <BarChart
            rows={decadeBreakdown}
            labelKey="decade"
            countKey="count"
            max={maxDecade}
          />
        </section>
      )}

      {/* Top Styles */}
      {styleBreakdown.length > 0 && (
        <section>
          <h2 className="text-xl font-picnic text-minimal-black mb-4">Top Styles</h2>
          <BarChart
            rows={styleBreakdown}
            labelKey="style"
            countKey="count"
            max={maxStyle}
          />
        </section>
      )}

      {/* Rarest record added this year */}
      {rarestAddition ? (
        <section>
          <h2 className="text-xl font-picnic text-minimal-black mb-4">
            Rarest Record You Added in {TARGET_YEAR}
          </h2>
          <div className="border border-minimal-gray-200 rounded-lg p-5 flex gap-5 items-center">
            {rarestAddition.coverImage && (
              <div className="relative w-24 h-24 flex-shrink-0">
                <Image
                  src={rarestAddition.coverImage}
                  alt={rarestAddition.title}
                  fill
                  className="object-cover rounded"
                  sizes="96px"
                />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-minimal-black leading-snug">{rarestAddition.title}</p>
              <p className="text-sm text-minimal-gray-500">{rarestAddition.artist}</p>
              {rarestAddition.year && (
                <p className="text-sm text-minimal-gray-500">{rarestAddition.year}</p>
              )}
              <p className="mt-2 text-2xl font-picnic font-bold" style={{ color: ACCENT }}>
                {rarestAddition.rarityScore.toFixed(2)}
              </p>
              <p className="text-xs text-minimal-gray-500">rarity score</p>
            </div>
          </div>
        </section>
      ) : enriching && totalAdded > 0 ? (
        <section>
          <h2 className="text-xl font-picnic text-minimal-black mb-4">
            Rarest Record You Added in {TARGET_YEAR}
          </h2>
          <p className="text-minimal-gray-500 text-sm animate-pulse">Loading rarity data…</p>
        </section>
      ) : null}

      {/* Avg rarity comparison */}
      {(avgRarityThisYear > 0 || avgRarityAllTime > 0) ? (
        <section>
          <h2 className="text-xl font-picnic text-minimal-black mb-4">Average Rarity</h2>
          <div className="flex gap-6 text-center">
            <div className="flex-1 border border-minimal-gray-200 rounded-lg p-5">
              <p className="text-4xl font-picnic font-bold" style={{ color: ACCENT }}>
                {avgRarityThisYear.toFixed(2)}
              </p>
              <p className="text-sm text-minimal-gray-500 mt-1">This year ({TARGET_YEAR})</p>
            </div>
            <div className="flex-1 border border-minimal-gray-200 rounded-lg p-5">
              <p className="text-4xl font-picnic font-bold text-minimal-gray-700">
                {avgRarityAllTime.toFixed(2)}
              </p>
              <p className="text-sm text-minimal-gray-500 mt-1">All time</p>
            </div>
          </div>
        </section>
      ) : enriching && totalAdded > 0 ? (
        <section>
          <h2 className="text-xl font-picnic text-minimal-black mb-4">Average Rarity</h2>
          <p className="text-minimal-gray-500 text-sm animate-pulse">Loading rarity data…</p>
        </section>
      ) : null}

      {/* Footer note for partial data */}
      {showFooterNote && (
        <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 flex items-center justify-between gap-4">
          <p className="text-amber-700 text-sm">
            Some older items are missing date data. Refresh for complete stats.
          </p>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-sm font-semibold whitespace-nowrap disabled:opacity-60"
            style={{ color: ACCENT }}
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      )}
    </div>
  );
}
