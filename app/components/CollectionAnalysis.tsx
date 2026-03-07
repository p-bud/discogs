"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useReleaseDetails } from '../hooks/useReleaseDetails';
import { useAuth } from '../hooks/useAuth';
import { CollectionItem, CollectionStats } from '../models/types';
import { calculateCollectionStats } from '../utils/client-collection';
import AuthModal from './AuthModal';
import { createSupabaseBrowserClient } from '../utils/supabase-browser';
import { handleDiscogsAuth } from '../utils/discogs-client';

function formatRelativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
}

export interface CollectionAnalysisProps {
  username?: string;
  onUsernameChange?: (username: string) => void;
}

interface AuthInfo {
  discogsConnected: boolean;
  discogsUsername: string | null;
  supabaseUserId: string | null;
  supabaseLinkedUsername: string | null;
  leaderboardOptIn: boolean;
}

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

export default function CollectionAnalysis({ username: propUsername }: CollectionAnalysisProps) {
  const [username, setUsername] = useState(propUsername || '');
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [stats, setStats] = useState<CollectionStats | null>(null);
  const [activeTab, setActiveTab] = useState('rarest');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [limitedResults, setLimitedResults] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [cachedAt, setCachedAt] = useState<string | null>(null);

  // Auth — shared singleton fetch; Supabase session tracked separately for
  // real-time sign-in/out (e.g. via Header AuthModal) without a duplicate fetch.
  const auth = useAuth();
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const authInfo: AuthInfo = {
    discogsConnected:       auth.authenticated,
    discogsUsername:        auth.username,
    supabaseUserId,
    supabaseLinkedUsername: auth.supabaseLinkedUsername,
    leaderboardOptIn:       auth.leaderboard_opt_in,
  };
  const [consentChecked, setConsentChecked] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [communityAvg, setCommunityAvg] = useState<number | null>(null);
  const [percentileRank, setPercentileRank] = useState<number | null>(null);

  const {
    enrichedReleases,
    loading: communityDataLoading,
    progress,
    completed,
    error: communityDataError
  } = useReleaseDetails(collection);

  // Auto-fetch collection when auth resolves and no propUsername was given
  // (standalone usage — parent page always provides propUsername when authenticated).
  useEffect(() => {
    if (!auth.loading && !propUsername && auth.authenticated && auth.username) {
      setUsername((u) => u || auth.username!);
      fetchCollection(auth.username);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.loading]);

  // Subscribe to Supabase auth state — explicit getSession() handles the cold-load
  // case where onAuthStateChange fires before cookie storage is hydrated.
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    // Eagerly read current session.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSupabaseUserId(session?.user?.id ?? null);
    });

    // Also subscribe so sign-in/out from any component (e.g. Header) is picked up.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSupabaseUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const refreshAuthInfo = useCallback(() => {
    auth.refresh();
  }, [auth.refresh]);

  // Update stats when enriched data becomes available.
  useEffect(() => {
    if (enrichedReleases.length > 0) {
      if (completed && enrichedReleases.some(r => r.haveCount > 0 || r.wantCount > 0)) {
        const calculatedStats = calculateCollectionStats(enrichedReleases);
        setStats(calculatedStats);
      }
    }
  }, [enrichedReleases, completed]);

  useEffect(() => {
    if (communityDataError && !error) {
      setError(`Error loading community data: ${communityDataError}`);
    }
  }, [communityDataError, error]);

  // Fetch community benchmark once we have the user's avg rarity score
  useEffect(() => {
    if (!stats) return;
    const score = stats.averageRarityScore;
    fetch(`/api/community-stats?score=${score}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && data.collectionsAnalyzed > 0) {
          setCommunityAvg(data.avgRarityScore);
          setPercentileRank(data.percentileRank);
        }
      })
      .catch(() => { /* non-critical */ });
  }, [stats?.averageRarityScore]);

  useEffect(() => {
    if (propUsername) {
      setUsername(propUsername);
      fetchCollection(propUsername);
    }
  }, [propUsername]);

  const fetchCollection = async (usernameToFetch = username, forceRefresh = false) => {
    if (!usernameToFetch) {
      setError('Please enter a Discogs username');
      return;
    }

    setLoading(true);
    setError(null);
    setCollection([]);
    setStats(null);
    setFromCache(false);
    setCachedAt(null);
    setLoadingMessage(forceRefresh ? 'Refreshing your collection from Discogs...' : 'Fetching your collection from Discogs...');
    setSubmitState('idle');
    setSubmitError(null);

    try {
      const url = `/api/collection?username=${encodeURIComponent(usernameToFetch)}${forceRefresh ? '&forceRefresh=true' : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setCollection(data.releases);
      setLimitedResults(data.limitedResults || false);
      setFromCache(data.fromCache ?? false);
      setCachedAt(data.cachedAt ?? null);
      setLoadingMessage(null);

      // When serving from cache the releases already carry community data
      // (haveCount/wantCount/rarityScore from the Supabase RPC join).
      // Calculate stats immediately so the UI renders without waiting for
      // useReleaseDetails to iterate through all batches with 250ms pauses.
      if (data.fromCache && data.releases?.length > 0) {
        setStats(calculateCollectionStats(data.releases));
      } else {
        setStats(data.stats);
      }
    } catch (err: any) {
      console.error('Error fetching collection:', err);
      setError(err.message || 'Error fetching collection');
      setLoadingMessage(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitToLeaderboard = async (withConsent = false) => {
    if (!stats || !enrichedReleases.length) return;
    setSubmitState('submitting');
    setSubmitError(null);

    try {
      const { data: { session } } = await createSupabaseBrowserClient().auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      // If the user just gave consent via the checkbox, set leaderboard_opt_in first.
      if (withConsent) {
        const patchRes = await fetch('/api/account', {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ leaderboard_opt_in: true }),
        });
        if (!patchRes.ok) {
          const d = await patchRes.json();
          throw new Error(d.error ?? 'Failed to save consent');
        }
        auth.refresh();
      }

      const payload = {
        avg_rarity_score: stats.averageRarityScore,
        rarest_item_score: stats.rarestItems[0]?.rarityScore ?? 0,
        rarest_item_title: stats.rarestItems[0]?.title ?? '',
        rarest_item_artist: stats.rarestItems[0]?.artist ?? '',
        collection_size: collection.length,
      };

      const res = await fetch('/api/leaderboard', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Submission failed');
      }

      setSubmitState('success');
    } catch (err: any) {
      setSubmitState('error');
      setSubmitError(err.message ?? 'Submission failed');
    }
  };

  const renderCollectionItems = (items: CollectionItem[]) => {
    if (!items || items.length === 0) {
      return <p className="text-white/40 italic">No items found</p>;
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <div key={item.id} className="bg-[#0a0a0a] border border-white/10 rounded-lg overflow-hidden">
            <div className="flex">
              <div className="w-1/3">
                {item.coverImage ? (
                  <Image
                    src={item.coverImage}
                    alt={`${item.artist} - ${item.title}`}
                    width={150}
                    height={150}
                    className="object-cover h-full"
                  />
                ) : (
                  <div className="bg-white/5 h-full flex items-center justify-center">
                    <span className="text-white/40">No Image</span>
                  </div>
                )}
              </div>
              <div className="w-2/3 p-4">
                <h3 className="font-bold truncate">{item.title}</h3>
                <p className="text-sm text-white/60 truncate">{item.artist}</p>
                <p className="text-sm text-white/40">{item.year}</p>
                <div className="mt-2">
                  <div className="flex justify-between text-sm">
                    <span>Want:</span>
                    <span className="font-medium">{item.wantCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Have:</span>
                    <span className="font-medium">{item.haveCount}</span>
                  </div>

                  {activeTab === 'rarest' && (
                    <div className="flex justify-between text-sm font-bold">
                      <span>Rarity Score:</span>
                      <span className="text-white">{item.rarityScore.toFixed(2)}</span>
                    </div>
                  )}
                  {activeTab === 'fewestHaves' && (
                    <div className="flex justify-between text-sm font-bold">
                      <span>Scarcity:</span>
                      <span className="text-white">{item.haveCount} owners</span>
                    </div>
                  )}
                  {activeTab === 'mostWanted' && (
                    <div className="flex justify-between text-sm font-bold">
                      <span>Demand:</span>
                      <span className="text-white">{item.wantCount} wants</span>
                    </div>
                  )}
                  {activeTab === 'collectible' && (
                    <div className="flex justify-between text-sm font-bold">
                      <span>Collectible Score:</span>
                      <span className="text-white">{((item.haveCount * item.wantCount) / 1000).toFixed(1)}</span>
                    </div>
                  )}
                  {(activeTab === 'common' || activeTab === 'all') && (
                    <div className="flex justify-between text-sm font-bold">
                      <span>Rarity Score:</span>
                      <span className="text-white">{item.rarityScore.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderLoading = () => (
    <div className="text-center py-12">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white mb-4"></div>
      <p className="mt-2 text-lg font-medium">{loadingMessage}</p>
      {error && <p className="mt-2 text-red-500 font-bold">{error}</p>}
    </div>
  );

  // --- Leaderboard submission panel ---
  const renderLeaderboardPanel = () => {
    if (!completed || !stats) return null;

    const { discogsConnected, supabaseUserId, leaderboardOptIn } = authInfo;
    const canSubmit = supabaseUserId && discogsConnected;

    if (submitState === 'success') {
      return (
        <div className="mt-6 p-4 bg-white/10 border border-white/30 rounded-lg flex items-center gap-3">
          <span className="text-white font-medium">Submitted to leaderboard!</span>
          <a href="/leaderboard" className="text-white underline text-sm">View leaderboard</a>
        </div>
      );
    }

    if (!supabaseUserId) {
      return (
        <div className="mt-6 p-4 bg-[#0a0a0a] border border-white/10 rounded-lg flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <p className="text-sm text-white/50 flex-1">
            Create a free account to appear on the leaderboard.
          </p>
          <button
            onClick={() => setShowAuthModal(true)}
            className="btn-primary px-4 py-2 text-sm rounded-md whitespace-nowrap"
          >
            Create account
          </button>
        </div>
      );
    }

    if (!canSubmit) {
      return (
        <div className="mt-6 p-4 bg-[#0a0a0a] border border-white/10 rounded-lg flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <p className="text-sm text-white/50 flex-1">
            Connect your Discogs account to submit to the leaderboard.
          </p>
          <button
            onClick={handleDiscogsAuth}
            className="btn-primary px-4 py-2 text-sm rounded-md whitespace-nowrap"
          >
            Connect Discogs
          </button>
        </div>
      );
    }

    // Consent gate: user hasn't opted in yet — show consent checkbox before submit.
    if (!leaderboardOptIn) {
      return (
        <div className="mt-6 p-4 bg-[#0a0a0a] border border-white/10 rounded-lg">
          <p className="text-sm font-medium text-white mb-2">Submit your results to the leaderboard?</p>
          <p className="text-xs text-white/40 mb-3">
            Avg rarity: {stats.averageRarityScore.toFixed(4)} · {collection.length} records
          </p>
          <label className="flex items-start gap-2 cursor-pointer mb-3">
            <input
              type="checkbox"
              checked={consentChecked}
              onChange={e => setConsentChecked(e.target.checked)}
              className="mt-0.5 shrink-0"
            />
            <span className="text-xs text-white/60">
              I agree that my display name (or Discogs username if none set), rarity scores, and collection size will be publicly visible on the leaderboard.
              You can opt out at any time in <a href="/account" className="underline">account settings</a>.
            </span>
          </label>
          {submitState === 'error' && (
            <p className="text-xs text-red-600 mb-2">{submitError}</p>
          )}
          <button
            onClick={() => handleSubmitToLeaderboard(true)}
            disabled={!consentChecked || submitState === 'submitting'}
            className="btn-primary px-4 py-2 text-sm rounded-md whitespace-nowrap disabled:opacity-60"
          >
            {submitState === 'submitting' ? 'Submitting…' : 'Submit to Leaderboard'}
          </button>
        </div>
      );
    }

    return (
      <div className="mt-6 p-4 bg-[#0a0a0a] border border-white/10 rounded-lg flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex-1">
          <p className="text-sm font-medium text-white">Submit your results to the leaderboard?</p>
          <p className="text-xs text-white/40 mt-0.5">
            Avg rarity: {stats.averageRarityScore.toFixed(4)} · {collection.length} records
          </p>
          {submitState === 'error' && (
            <p className="text-xs text-red-600 mt-1">{submitError}</p>
          )}
        </div>
        <button
          onClick={() => handleSubmitToLeaderboard(false)}
          disabled={submitState === 'submitting'}
          className="btn-primary px-4 py-2 text-sm rounded-md whitespace-nowrap disabled:opacity-60"
        >
          {submitState === 'submitting' ? 'Submitting…' : 'Submit to Leaderboard'}
        </button>
      </div>
    );
  };

  if (loading) return renderLoading();

  if (error) {
    return (
      <div className="bg-red-950/50 border border-red-500/30 text-red-400 px-4 py-3 rounded">
        <p className="font-medium">{error}</p>
        <p className="text-sm mt-2">
          Make sure you're logged in to Discogs and have entered a valid username.
          {error.includes('rate limit') && (
            <span className="block mt-2">
              The Discogs API has strict rate limits (60 requests per minute).
              Our app uses caching to minimize this issue, but you might need to wait a few minutes before trying again.
            </span>
          )}
          {error.includes('timed out') && (
            <span className="block mt-2">
              Timeout issues can occur when the Discogs API is busy or experiencing delays.
              We've limited analysis to your collection to minimize this, but occasional timeouts may still occur.
            </span>
          )}
        </p>
        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => window.location.reload()}
            className="bg-red-950/80 hover:bg-red-900/80 text-red-400 border border-red-500/30 font-medium py-2 px-4 rounded"
          >
            Try Again
          </button>
          {error.includes('rate limit') && (
            <button
              onClick={() => {
                setLoading(true);
                setLoadingMessage('Checking cache for partial results...');
                setTimeout(() => fetchCollection(), 2000);
              }}
              className="bg-white/5 hover:bg-white/10 text-white/60 border border-white/10 font-medium py-2 px-4 rounded"
            >
              Check for Cached Results
            </button>
          )}
          {error.includes('timed out') && (
            <button
              onClick={() => {
                setLoading(true);
                const waitTime = 5000;
                setLoadingMessage(`Waiting ${Math.round(waitTime / 1000)} seconds before retry to avoid timeout...`);
                setTimeout(() => fetchCollection(), waitTime);
              }}
              className="bg-white/5 hover:bg-white/10 text-white/60 border border-white/10 font-medium py-2 px-4 rounded"
            >
              Retry with Delay
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-4">Discogs Collection Analyzer</h1>
        {authInfo.discogsConnected && authInfo.discogsUsername ? (
          <p className="text-white/50 text-sm">
            Analyzing collection for{' '}
            <span className="font-semibold text-white">{authInfo.discogsUsername}</span>
          </p>
        ) : (
          <div className="flex space-x-2">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter Discogs username"
              className="input flex-grow"
            />
            <button
              onClick={() => fetchCollection()}
              disabled={loading || communityDataLoading}
              className="bg-white text-black px-4 py-2 rounded hover:bg-white/90 disabled:opacity-40"
            >
              Analyze
            </button>
          </div>
        )}
        {fromCache && cachedAt && (
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-white/40 bg-white/5 border border-white/10 rounded-full px-3 py-1">
              <span>Cached</span>
              <span>·</span>
              <span>synced {formatRelativeTime(cachedAt)}</span>
            </span>
            <button
              onClick={() => fetchCollection(username, true)}
              disabled={loading || communityDataLoading}
              className="inline-flex items-center gap-1 text-xs text-white hover:text-white/80 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Re-fetch collection from Discogs"
            >
              ↺ Refresh
            </button>
          </div>
        )}
      </div>

      {loading && renderLoading()}

      {error && (
        <div className="bg-red-950/50 border-l-4 border-red-500/60 text-red-400 p-4 mb-8" role="alert">
          <p>{error}</p>
        </div>
      )}

      {!loading && stats && (
        <div className="mb-8">
          <div className="flex flex-wrap mb-4">
            <div className="w-full md:w-1/2 lg:w-1/3 p-2">
              <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2">Collection Stats</h3>
                <p><span className="font-medium">Total Records:</span> {stats.totalReleases}</p>
                <p><span className="font-medium">Avg Rarity Score:</span> {stats.averageRarityScore.toFixed(4)}</p>
                {communityAvg !== null && (
                  <div className="mt-2 pt-2 border-t border-white/10">
                    {percentileRank !== null && percentileRank >= 50 && (
                      <p className="text-sm font-semibold text-white">
                        Top {100 - percentileRank}% of analyzed collections
                      </p>
                    )}
                    {percentileRank !== null && percentileRank < 50 && (
                      <p className="text-sm text-white/50">
                        Bottom {percentileRank + 1}% of analyzed collections
                      </p>
                    )}
                    <p className="text-xs text-white/40 mt-0.5">
                      Community avg: {communityAvg.toFixed(4)}
                      {communityAvg > 0 && (' · your collection is ' + (
                        stats.averageRarityScore >= communityAvg
                          ? `${(stats.averageRarityScore / communityAvg).toFixed(1)}× rarer`
                          : `${(communityAvg / stats.averageRarityScore).toFixed(1)}× more common`
                      ))}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white/5 p-4 rounded-lg mb-6 border border-white/10">
            <h3 className="text-lg font-semibold mb-2 text-white/60">How This Works</h3>
            <p className="mb-2 text-sm text-white/60">
              We analyze your full collection. Rarity scores are calculated as the ratio of "wants" to "haves" in the Discogs community.
            </p>
            <p className="text-sm text-white/60">
              Your collection list loads immediately; rarity data fills in progressively.
            </p>
          </div>

          {limitedResults && (
            <div className="bg-white/5 p-4 rounded-lg mb-6 border border-white/10">
              <p className="text-sm text-white/50">
                Your collection has over 2,000 records. Showing the most recent 2,000.
              </p>
            </div>
          )}

          {communityDataLoading && (
            <div className="bg-white/5 p-4 rounded-lg mb-6 border border-white/10">
              <div className="flex items-center">
                <div className="mr-3 inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                <p className="text-sm text-white">
                  Loading rarity data for {Math.round(progress / 100 * collection.length)} of {collection.length} records…
                </p>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2.5 mt-2">
                <div className="bg-white h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          )}

          <div className="bg-black border border-white/10 rounded-lg overflow-hidden">
            <div className="flex border-b border-white/10">
              {['rarest', 'fewestHaves', 'mostWanted', 'collectible', 'common'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium ${activeTab === tab ? 'text-white border-b-2 border-white' : 'text-white/40 hover:text-white/70'}`}
                >
                  {tab === 'rarest' ? 'Rarest Items'
                    : tab === 'fewestHaves' ? 'Fewest Haves'
                    : tab === 'mostWanted' ? 'Most Wanted'
                    : tab === 'collectible' ? 'Most Collectible'
                    : 'Most Common'}
                </button>
              ))}
            </div>

            <div className="p-4">
              {activeTab === 'rarest' && stats && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Your Rarest Records (Highest Want/Have Ratio)</h3>
                  <p className="text-sm text-white/40 mb-3">Records with the highest ratio of wants to haves are typically the most sought after compared to availability.</p>
                  {communityDataLoading && !completed ? (
                    <p className="text-white/40 italic py-4">Loading rarity data...</p>
                  ) : stats.rarestItems?.length > 0 ? (
                    renderCollectionItems(stats.rarestItems)
                  ) : (
                    <p className="text-white/40 italic py-4">No rarity data available yet. Still loading...</p>
                  )}
                </div>
              )}

              {activeTab === 'fewestHaves' && stats && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Your Least Common Records (Fewest Haves)</h3>
                  <p className="text-sm text-white/40 mb-3">The records that very few Discogs users have in their collections.</p>
                  {communityDataLoading && !completed ? (
                    <p className="text-white/40 italic py-4">Loading rarity data...</p>
                  ) : stats.fewestHaves?.length > 0 ? (
                    renderCollectionItems(stats.fewestHaves)
                  ) : (
                    <p className="text-white/40 italic py-4">No have/want data available yet. Still loading...</p>
                  )}
                </div>
              )}

              {activeTab === 'mostWanted' && stats && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Your Most Wanted Records</h3>
                  <p className="text-sm text-white/40 mb-3">The records that the most Discogs users have added to their wantlists.</p>
                  {communityDataLoading && !completed ? (
                    <p className="text-white/40 italic py-4">Loading rarity data...</p>
                  ) : stats.mostWanted?.length > 0 ? (
                    renderCollectionItems(stats.mostWanted)
                  ) : (
                    <p className="text-white/40 italic py-4">No have/want data available yet. Still loading...</p>
                  )}
                </div>
              )}

              {activeTab === 'collectible' && stats && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Your Most Collectible Records</h3>
                  <p className="text-sm text-white/40 mb-3">Records that are widely collected but still in high demand.</p>
                  {communityDataLoading && !completed ? (
                    <p className="text-white/40 italic py-4">Loading rarity data...</p>
                  ) : stats.mostCollectible?.length > 0 ? (
                    renderCollectionItems(stats.mostCollectible)
                  ) : (
                    <p className="text-white/40 italic py-4">No have/want data available yet. Still loading...</p>
                  )}
                </div>
              )}

              {activeTab === 'common' && stats && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Your Most Common Records</h3>
                  <p className="text-sm text-white/40 mb-3">Records with the lowest want/have ratio.</p>
                  {communityDataLoading && !completed ? (
                    <p className="text-white/40 italic py-4">Loading rarity data...</p>
                  ) : stats.mostCommonItems?.length > 0 ? (
                    renderCollectionItems(stats.mostCommonItems)
                  ) : (
                    <p className="text-white/40 italic py-4">No have/want data available yet. Still loading...</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Leaderboard submission panel — shown after analysis completes */}
          {renderLeaderboardPanel()}
        </div>
      )}

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={() => {
          setShowAuthModal(false);
          refreshAuthInfo();
        }}
      />
    </div>
  );
}
