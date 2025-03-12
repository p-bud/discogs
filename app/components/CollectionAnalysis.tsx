"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useReleaseDetails } from '../hooks/useReleaseDetails';
import { CollectionItem, CollectionStats } from '../models/types';
import { calculateCollectionStats } from '../utils/client-collection';

export interface CollectionAnalysisProps {
  username?: string;
  onUsernameChange?: (username: string) => void;
}

export default function CollectionAnalysis({ username: propUsername }: CollectionAnalysisProps) {
  const [username, setUsername] = useState(propUsername || '');
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [stats, setStats] = useState<CollectionStats | null>(null);
  const [activeTab, setActiveTab] = useState('rarest');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [limitedResults, setLimitedResults] = useState(false);
  
  // New state for tracking client-side community data loading
  const [detailsLoading, setDetailsLoading] = useState(false);
  
  // Use our custom hook to fetch community data for each release
  const { 
    enrichedReleases, 
    loading: communityDataLoading, 
    progress, 
    completed,
    error: communityDataError 
  } = useReleaseDetails(collection, 5);
  
  // Update the stats when enriched data becomes available
  useEffect(() => {
    if (enrichedReleases.length > 0) {
      // Don't update collection state here - that would cause an infinite loop
      
      // Calculate stats with the enriched data that now has community info
      if (completed && enrichedReleases.some(r => r.haveCount > 0 || r.wantCount > 0)) {
        const calculatedStats = calculateCollectionStats(enrichedReleases);
        setStats(calculatedStats);
      }
    }
  }, [enrichedReleases, completed]);
  
  // Track any errors from community data loading
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
    
    try {
      const response = await fetch(`/api/collection?username=${encodeURIComponent(usernameToFetch)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Set the basic collection data right away
      setCollection(data.releases);
      
      // Show limited results message if applicable
      setLimitedResults(data.limitedResults || false);
      
      // Set initial stats
      setStats(data.stats);
      
      // Now client will automatically start fetching community data for each release
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

                  {activeTab === 'common' && (
                    <div className="flex justify-between text-sm font-bold">
                      <span>Rarity Score:</span>
                      <span className="text-indigo-600">{item.rarityScore.toFixed(2)}</span>
                    </div>
                  )}

                  {activeTab === 'all' && (
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

  const renderLoading = () => {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600 mb-4"></div>
        <p className="mt-2 text-lg font-medium">{loadingMessage}</p>
        {error && (
          <p className="mt-2 text-red-500 font-bold">
            {error}
          </p>
        )}
      </div>
    );
  };

  const handleCollectionError = (error: Error) => {
    setError(error.message);
    
    // If the error is specifically a timeout error, attempt to get cached results
    if (error.message.includes('timed out') || error.message.includes('timeout')) {
      // Attempt to get cached/partial results
      setTimeout(() => {
        fetchCollection();
      }, 2000);
    }
  };

  if (loading) {
    return renderLoading();
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
        <p className="font-medium">{error}</p>
        <p className="text-sm mt-2">
          Make sure you're logged in to Discogs and have entered a valid username.
          {error.includes('rate limit') && (
            <span className="block mt-2">
              The Discogs API has strict rate limits (60 requests per minute). 
              Our app uses caching to minimize this issue, but you might need to wait a few minutes 
              before trying again.
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
                
                // Attempt to get cached/partial results
                setTimeout(() => {
                  fetchCollection();
                }, 2000);
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
                setLoadingMessage(`Waiting ${Math.round(waitTime/1000)} seconds before retry to avoid timeout...`);
                
                // Add a delay before retrying to give the API time to recover
                setTimeout(() => {
                  fetchCollection();
                }, waitTime);
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

          {/* Show the explanation of how it works */}
          <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-100">
            <h3 className="text-lg font-semibold mb-2 text-blue-800">How This Works</h3>
            <p className="mb-2 text-sm text-blue-700">
              We analyze up to 50 of your recently added records. Rarity scores are calculated as the ratio of "wants" to "haves" in the Discogs community.
            </p>
            <p className="text-sm text-blue-700">
              The system is limited to 50 records due to Discogs API limitations.
            </p>
          </div>

          {limitedResults && (
            <div className="bg-yellow-50 p-4 rounded-lg mb-6 border border-yellow-100">
              <p className="text-sm text-yellow-700">
                Please wait while we analyze your collection.
              </p>
            </div>
          )}

          {communityDataLoading && (
            <div className="bg-indigo-50 p-4 rounded-lg mb-6 border border-indigo-100">
              <div className="flex items-center">
                <div className="mr-3 inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-indigo-600"></div>
                <p className="text-sm text-indigo-700">
                  Loading community data: {Math.round(progress)}% complete
                </p>
              </div>
              <div className="w-full bg-indigo-200 rounded-full h-2.5 mt-2">
                <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab('rarest')}
                className={`px-4 py-2 text-sm font-medium ${activeTab === 'rarest' ? 'text-indigo-700 border-b-2 border-indigo-500' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Rarest Items
              </button>
              <button
                onClick={() => setActiveTab('fewestHaves')}
                className={`px-4 py-2 text-sm font-medium ${activeTab === 'fewestHaves' ? 'text-indigo-700 border-b-2 border-indigo-500' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Fewest Haves
              </button>
              <button
                onClick={() => setActiveTab('mostWanted')}
                className={`px-4 py-2 text-sm font-medium ${activeTab === 'mostWanted' ? 'text-indigo-700 border-b-2 border-indigo-500' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Most Wanted
              </button>
              <button
                onClick={() => setActiveTab('collectible')}
                className={`px-4 py-2 text-sm font-medium ${activeTab === 'collectible' ? 'text-indigo-700 border-b-2 border-indigo-500' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Most Collectible
              </button>
              <button
                onClick={() => setActiveTab('common')}
                className={`px-4 py-2 text-sm font-medium ${activeTab === 'common' ? 'text-indigo-700 border-b-2 border-indigo-500' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Most Common
              </button>
            </div>
            
            <div className="p-4">
              {activeTab === 'rarest' && stats && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Your Rarest Records (Highest Want/Have Ratio)</h3>
                  <p className="text-sm text-gray-600 mb-3">Records with the highest ratio of wants to haves are typically the most sought after compared to availability.</p>
                  {communityDataLoading && !completed ? (
                    <p className="text-gray-500 italic py-4">Loading rarity data...</p>
                  ) : stats.rarestItems && stats.rarestItems.length > 0 ? (
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
                  ) : stats.fewestHaves && stats.fewestHaves.length > 0 ? (
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
                  ) : stats.mostWanted && stats.mostWanted.length > 0 ? (
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
                  ) : stats.mostCollectible && stats.mostCollectible.length > 0 ? (
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
                  ) : stats.mostCommonItems && stats.mostCommonItems.length > 0 ? (
                    renderCollectionItems(stats.mostCommonItems)
                  ) : (
                    <p className="text-gray-500 italic py-4">No have/want data available yet. Still loading...</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 