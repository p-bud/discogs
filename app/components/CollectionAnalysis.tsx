"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useReleaseDetails } from '../hooks/useReleaseDetails';
import { CollectionItem, CollectionStats } from '../models/types';
import { calculateCollectionStats } from '../utils/client-collection';
import AuthModal from './AuthModal';

export interface CollectionAnalysisProps {
  username?: string;
  onUsernameChange?: (username: string) => void;
}

interface AuthInfo {
  discogsConnected: boolean;
  discogsUsername: string | null;
  supabaseUserId: string | null;
  supabaseLinkedUsername: string | null;
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
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Auth state for leaderboard submission
  const [authInfo, setAuthInfo] = useState<AuthInfo>({
    discogsConnected: false,
    discogsUsername: null,
    supabaseUserId: null,
    supabaseLinkedUsername: null,
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    enrichedReleases,
    loading: communityDataLoading,
    progress,
    completed,
    error: communityDataError
  } = useReleaseDetails(collection);

  // Fetch auth info on mount and auto-populate username.
  const refreshAuthInfo = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/status');
      if (!res.ok) return;
      const data = await res.json();
      setAuthInfo({
        discogsConnected: data.authenticated ?? false,
        discogsUsername: data.username ?? null,
        supabaseUserId: data.supabaseUserId ?? null,
        supabaseLinkedUsername: data.supabaseLinkedUsername ?? null,
      });
      // Auto-populate username if connected and field is empty.
      if (data.username && !username) {
        setUsername(data.username);
      }
    } catch {
      // Non-fatal — user can still enter username manually.
    }
  }, [username]);

  useEffect(() => {
    refreshAuthInfo();
  }, []);

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

  useEffect(() => {
    if (propUsername) {
      setUsername(propUsername);
      fetchCollection(propUsername);
    }
  }, [propUsername]);

  const fetchCollection = async (usernameToFetch = username) => {
    if (!usernameToFetch) {
      setError('Please enter a Discogs username');
      return;
    }

    setLoading(true);
    setError(null);
    setCollection([]);
    setStats(null);
    setLoadingMessage('Fetching your collection from Discogs...');
    setDetailsLoading(false);
    setSubmitState('idle');
    setSubmitError(null);

    try {
      const response = await fetch(`/api/collection?username=${encodeURIComponent(usernameToFetch)}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setCollection(data.releases);
      setLimitedResults(data.limitedResults || false);
      setStats(data.stats);
      setLoadingMessage(null);
      setDetailsLoading(true);
    } catch (err: any) {
      console.error('Error fetching collection:', err);
      setError(err.message || 'Error fetching collection');
      setLoadingMessage(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitToLeaderboard = async () => {
    if (!stats || !enrichedReleases.length) return;
    setSubmitState('submitting');
    setSubmitError(null);

    const payload = {
      avg_rarity_score: stats.averageRarityScore,
      rarest_item_score: stats.rarestItems[0]?.rarityScore ?? 0,
      rarest_item_title: stats.rarestItems[0]?.title ?? '',
      rarest_item_artist: stats.rarestItems[0]?.artist ?? '',
      collection_size: collection.length,
    };

    try {
      const res = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      return <p className="text-gray-500 italic">No items found</p>;
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <div key={item.id} className="border rounded-lg overflow-hidden shadow-md bg-white">
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
                  <div className="bg-gray-200 h-full flex items-center justify-center">
                    <span className="text-gray-500">No Image</span>
                  </div>
                )}
              </div>
              <div className="w-2/3 p-4">
                <h3 className="font-bold truncate">{item.title}</h3>
                <p className="text-sm text-gray-700 truncate">{item.artist}</p>
                <p className="text-sm text-gray-600">{item.year}</p>
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
                      <span className="text-indigo-600">{item.rarityScore.toFixed(2)}</span>
                    </div>
                  )}
                  {activeTab === 'fewestHaves' && (
                    <div className="flex justify-between text-sm font-bold">
                      <span>Scarcity:</span>
                      <span className="text-indigo-600">{item.haveCount} owners</span>
                    </div>
                  )}
                  {activeTab === 'mostWanted' && (
                    <div className="flex justify-between text-sm font-bold">
                      <span>Demand:</span>
                      <span className="text-indigo-600">{item.wantCount} wants</span>
                    </div>
                  )}
                  {activeTab === 'collectible' && (
                    <div className="flex justify-between text-sm font-bold">
                      <span>Collectible Score:</span>
                      <span className="text-indigo-600">{((item.haveCount * item.wantCount) / 1000).toFixed(1)}</span>
                    </div>
                  )}
                  {(activeTab === 'common' || activeTab === 'all') && (
                    <div className="flex justify-between text-sm font-bold">
                      <span>Rarity Score:</span>
                      <span className="text-indigo-600">{item.rarityScore.toFixed(2)}</span>
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
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600 mb-4"></div>
      <p className="mt-2 text-lg font-medium">{loadingMessage}</p>
      {error && <p className="mt-2 text-red-500 font-bold">{error}</p>}
    </div>
  );

  // --- Leaderboard submission panel ---
  const renderLeaderboardPanel = () => {
    if (!completed || !stats) return null;

    const { discogsConnected, supabaseUserId, supabaseLinkedUsername } = authInfo;
    const canSubmit = supabaseUserId && (supabaseLinkedUsername || discogsConnected);

    if (submitState === 'success') {
      return (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <span className="text-green-700 font-medium">Submitted to leaderboard!</span>
          <a href="/leaderboard" className="text-green-600 underline text-sm">View leaderboard</a>
        </div>
      );
    }

    if (!supabaseUserId) {
      return (
        <div className="mt-6 p-4 bg-minimal-gray-50 border border-minimal-gray-200 rounded-lg flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <p className="text-sm text-minimal-gray-600 flex-1">
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
        <div className="mt-6 p-4 bg-minimal-gray-50 border border-minimal-gray-200 rounded-lg">
          <p className="text-sm text-minimal-gray-600">
            Connect your Discogs account to submit to the leaderboard.
          </p>
        </div>
      );
    }

    return (
      <div className="mt-6 p-4 bg-minimal-gray-50 border border-minimal-gray-200 rounded-lg flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex-1">
          <p className="text-sm font-medium text-minimal-gray-800">Submit your results to the leaderboard?</p>
          <p className="text-xs text-minimal-gray-500 mt-0.5">
            Avg rarity: {stats.averageRarityScore.toFixed(4)} · {collection.length} records
          </p>
          {submitState === 'error' && (
            <p className="text-xs text-red-600 mt-1">{submitError}</p>
          )}
        </div>
        <button
          onClick={handleSubmitToLeaderboard}
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
      <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
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
            className="bg-red-100 hover:bg-red-200 text-red-800 font-medium py-2 px-4 rounded"
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
              className="bg-blue-100 hover:bg-blue-200 text-blue-800 font-medium py-2 px-4 rounded"
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
              className="bg-green-100 hover:bg-green-200 text-green-800 font-medium py-2 px-4 rounded"
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
        <div className="flex space-x-2">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter Discogs username"
            className="border p-2 rounded flex-grow"
          />
          <button
            onClick={() => fetchCollection()}
            disabled={loading || communityDataLoading}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:bg-indigo-300"
          >
            Analyze
          </button>
        </div>
        {authInfo.discogsConnected && authInfo.discogsUsername && (
          <p className="text-xs text-minimal-gray-500 mt-1.5">
            Signed in as <span className="font-medium">{authInfo.discogsUsername}</span>
          </p>
        )}
      </div>

      {loading && renderLoading()}

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-8" role="alert">
          <p>{error}</p>
        </div>
      )}

      {!loading && stats && (
        <div className="mb-8">
          <div className="flex flex-wrap mb-4">
            <div className="w-full md:w-1/2 lg:w-1/3 p-2">
              <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                <h3 className="text-lg font-semibold mb-2">Collection Stats</h3>
                <p><span className="font-medium">Total Records:</span> {stats.totalReleases}</p>
                <p><span className="font-medium">Average Rarity Score:</span> {stats.averageRarityScore.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-100">
            <h3 className="text-lg font-semibold mb-2 text-blue-800">How This Works</h3>
            <p className="mb-2 text-sm text-blue-700">
              We analyze your full collection. Rarity scores are calculated as the ratio of "wants" to "haves" in the Discogs community.
            </p>
            <p className="text-sm text-blue-700">
              Your collection list loads immediately; rarity data fills in progressively.
            </p>
          </div>

          {limitedResults && (
            <div className="bg-yellow-50 p-4 rounded-lg mb-6 border border-yellow-100">
              <p className="text-sm text-yellow-700">
                Your collection has over 2,000 records. Showing the most recent 2,000.
              </p>
            </div>
          )}

          {communityDataLoading && (
            <div className="bg-indigo-50 p-4 rounded-lg mb-6 border border-indigo-100">
              <div className="flex items-center">
                <div className="mr-3 inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-indigo-600"></div>
                <p className="text-sm text-indigo-700">
                  Loading rarity data for {Math.round(progress / 100 * collection.length)} of {collection.length} records…
                </p>
              </div>
              <div className="w-full bg-indigo-200 rounded-full h-2.5 mt-2">
                <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="flex border-b">
              {['rarest', 'fewestHaves', 'mostWanted', 'collectible', 'common'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium ${activeTab === tab ? 'text-indigo-700 border-b-2 border-indigo-500' : 'text-gray-500 hover:text-gray-700'}`}
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
                  <p className="text-sm text-gray-600 mb-3">Records with the highest ratio of wants to haves are typically the most sought after compared to availability.</p>
                  {communityDataLoading && !completed ? (
                    <p className="text-gray-500 italic py-4">Loading rarity data...</p>
                  ) : stats.rarestItems?.length > 0 ? (
                    renderCollectionItems(stats.rarestItems)
                  ) : (
                    <p className="text-gray-500 italic py-4">No rarity data available yet. Still loading...</p>
                  )}
                </div>
              )}

              {activeTab === 'fewestHaves' && stats && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Your Least Common Records (Fewest Haves)</h3>
                  <p className="text-sm text-gray-600 mb-3">The records that very few Discogs users have in their collections.</p>
                  {communityDataLoading && !completed ? (
                    <p className="text-gray-500 italic py-4">Loading rarity data...</p>
                  ) : stats.fewestHaves?.length > 0 ? (
                    renderCollectionItems(stats.fewestHaves)
                  ) : (
                    <p className="text-gray-500 italic py-4">No have/want data available yet. Still loading...</p>
                  )}
                </div>
              )}

              {activeTab === 'mostWanted' && stats && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Your Most Wanted Records</h3>
                  <p className="text-sm text-gray-600 mb-3">The records that the most Discogs users have added to their wantlists.</p>
                  {communityDataLoading && !completed ? (
                    <p className="text-gray-500 italic py-4">Loading rarity data...</p>
                  ) : stats.mostWanted?.length > 0 ? (
                    renderCollectionItems(stats.mostWanted)
                  ) : (
                    <p className="text-gray-500 italic py-4">No have/want data available yet. Still loading...</p>
                  )}
                </div>
              )}

              {activeTab === 'collectible' && stats && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Your Most Collectible Records</h3>
                  <p className="text-sm text-gray-600 mb-3">Records that are widely collected but still in high demand.</p>
                  {communityDataLoading && !completed ? (
                    <p className="text-gray-500 italic py-4">Loading rarity data...</p>
                  ) : stats.mostCollectible?.length > 0 ? (
                    renderCollectionItems(stats.mostCollectible)
                  ) : (
                    <p className="text-gray-500 italic py-4">No have/want data available yet. Still loading...</p>
                  )}
                </div>
              )}

              {activeTab === 'common' && stats && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Your Most Common Records</h3>
                  <p className="text-sm text-gray-600 mb-3">Records with the lowest want/have ratio.</p>
                  {communityDataLoading && !completed ? (
                    <p className="text-gray-500 italic py-4">Loading rarity data...</p>
                  ) : stats.mostCommonItems?.length > 0 ? (
                    renderCollectionItems(stats.mostCommonItems)
                  ) : (
                    <p className="text-gray-500 italic py-4">No have/want data available yet. Still loading...</p>
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
