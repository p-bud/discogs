'use client';

import React, { useEffect, useState } from 'react';
import { CollectionItem, WrappedStats } from '../models/types';
import { computeWrappedStats, deriveYears } from '../utils/wrapped-stats';
import { useReleaseDetails } from '../hooks/useReleaseDetails';
import { handleDiscogsAuth } from '../utils/discogs-client';
import WrappedView from './WrappedView';

const DEFAULT_YEAR = new Date().getFullYear() - 1;
const ACCENT = '#4f46e5';

// ── Per-session page cache ───────────────────────────────────────────────────
// Two-layer: module-level Map (navigation) + sessionStorage (browser refresh).

interface WrappedPageCache {
  stats: WrappedStats;
  fromCache: boolean;
}
const wrappedPageCache = new Map<string, WrappedPageCache>();

const STORAGE_KEY = (u: string, y: number) => `wrapped_v1_${u}_${y}`;

function readStorage(u: string, y: number): WrappedPageCache | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY(u, y));
    return raw ? (JSON.parse(raw) as WrappedPageCache) : null;
  } catch { return null; }
}
function writeStorage(u: string, y: number, data: WrappedPageCache): void {
  try { sessionStorage.setItem(STORAGE_KEY(u, y), JSON.stringify(data)); }
  catch { /* private mode / quota — silent */ }
}
function clearStorage(u: string, y: number): void {
  try { sessionStorage.removeItem(STORAGE_KEY(u, y)); } catch {}
}

const memKey = (u: string, y: number) => `${u}__${y}`;

// ── Main component ──────────────────────────────────────────────────────────

interface WrappedAnalysisProps {
  username: string | null;
}

export default function WrappedAnalysis({ username }: WrappedAnalysisProps) {
  const [year, setYear] = useState(DEFAULT_YEAR);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wrappedStats, setWrappedStats] = useState<WrappedStats | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Raw collection — shared across year selections (no re-fetch needed)
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const {
    enrichedReleases,
    loading: enriching,
    completed: enrichmentDone,
  } = useReleaseDetails(collection);

  // Derive available years from the fetched collection
  const availableYears = deriveYears(collection);
  const yearPills = availableYears.length > 0 ? availableYears : [DEFAULT_YEAR];

  // Re-compute stats once enrichment finishes (picks up rarity scores)
  useEffect(() => {
    if (enrichmentDone && enrichedReleases.length > 0) {
      const stats = computeWrappedStats(enrichedReleases, year);
      setWrappedStats(stats);
      if (username) {
        const entry: WrappedPageCache = { stats, fromCache };
        wrappedPageCache.set(memKey(username, year), entry);
        writeStorage(username, year, entry);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrichmentDone]);

  // When year changes and we already have the collection, re-compute immediately
  useEffect(() => {
    if (collection.length === 0) return;
    const source = enrichmentDone ? enrichedReleases : collection;
    const stats = computeWrappedStats(source, year);
    setWrappedStats(stats);
    if (username) {
      const entry: WrappedPageCache = { stats, fromCache };
      wrappedPageCache.set(memKey(username, year), entry);
      writeStorage(username, year, entry);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

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

      setWrappedStats(computeWrappedStats(releases, year));
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
    // 1. In-memory (navigation)
    const mem = wrappedPageCache.get(memKey(username, year));
    if (mem) { setWrappedStats(mem.stats); setFromCache(mem.fromCache); return; }
    // 2. sessionStorage (browser refresh)
    const stored = readStorage(username, year);
    if (stored) {
      wrappedPageCache.set(memKey(username, year), stored);
      setWrappedStats(stored.stats);
      setFromCache(stored.fromCache);
      return;
    }
    fetchAndCompute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  const handleRefresh = () => {
    if (username) {
      wrappedPageCache.delete(memKey(username, year));
      clearStorage(username, year);
    }
    setRefreshing(true);
    fetchAndCompute(true);
  };

  const handleShare = async () => {
    if (!username) return;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://raerz.fyi';
    const url = `${appUrl}/wrapped/${encodeURIComponent(username)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select/copy via prompt
      window.prompt('Copy this link:', url);
    }
  };

  // ── Not connected ─────────────────────────────────────────────────────────
  if (!username) {
    return (
      <div className="text-center py-16">
        <p className="text-4xl mb-4 font-picnic text-minimal-black">Your {DEFAULT_YEAR} in Records</p>
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

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="text-center py-16">
        <p className="text-minimal-gray-500 animate-pulse">Loading your {year} Wrapped…</p>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
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

  return (
    <div className="space-y-6">

      {/* Title + controls */}
      <div className="text-center pt-4 animate-fade-in-up">
        <h1 className="text-4xl sm:text-5xl font-picnic text-minimal-black uppercase tracking-tight">
          Your {year} in Records
        </h1>

        {/* Year pills */}
        <div className="flex flex-wrap gap-2 justify-center mt-4">
          {yearPills.map(y => (
            <button
              key={y}
              onClick={() => setYear(y)}
              className={
                'px-4 py-1.5 rounded-full text-sm font-semibold border transition-all duration-200 ' +
                (y === year
                  ? 'text-white border-transparent'
                  : 'text-minimal-gray-700 border-minimal-gray-300 hover:border-minimal-gray-500 hover:scale-105')
              }
              style={y === year ? { backgroundColor: ACCENT, borderColor: ACCENT } : {}}
            >
              {y}
            </button>
          ))}
        </div>

        {/* Share button */}
        <div className="mt-4">
          <button
            onClick={handleShare}
            className="px-3 py-1 rounded-full border border-minimal-gray-200 text-xs text-minimal-gray-500 hover:border-minimal-gray-400 hover:text-minimal-gray-700 transition-all"
          >
            {copied ? '✓ Copied!' : 'Share'}
          </button>
        </div>
      </div>

      {/* Stats display */}
      <WrappedView
        stats={wrappedStats}
        enriching={enriching}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />
    </div>
  );
}
