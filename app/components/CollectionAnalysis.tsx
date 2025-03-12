import React, { useState, useEffect } from 'react';
import { CollectionItem, CollectionStats } from '../models/types';
import Image from 'next/image';
import { getUserCollection } from '../utils/collection';

export interface CollectionAnalysisProps {
  username?: string;
  onUsernameChange?: (username: string) => void;
}

export default function CollectionAnalysis({ username: propUsername }: CollectionAnalysisProps) {
  const [username, setUsername] = useState(propUsername || '');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [stats, setStats] = useState<CollectionStats | null>(null);
  const [activeTab, setActiveTab] = useState<'rarest' | 'common' | 'fewestHaves' | 'mostWanted' | 'collectible' | 'all'>('rarest');
  const [loadingMessage, setLoadingMessage] = useState<string>('Loading your collection...');
  const [retryCount, setRetryCount] = useState<number>(0);
  const [retryTimeout, setRetryTimeout] = useState<NodeJS.Timeout | null>(null);
  const [retryCountdown, setRetryCountdown] = useState<number>(0);
  const [limitedResults, setLimitedResults] = useState(false);

  // Define fetchCollection outside the useEffect so it can be referenced in button click handlers
  const fetchCollection = async () => {
    if (!username) {
      setError('Please enter a Discogs username');
      return;
    }

    setLoading(true);
    setError(null);
    setCollection([]);
    setLimitedResults(false);
    setLoadingMessage('Starting to fetch your collection...');
    
    // Update loading message periodically to show progress
    const messageInterval = setInterval(() => {
      setLoadingMessage(prevMessage => {
        if (prevMessage.includes('This may take a moment')) {
          return 'Processing your collection... (Using preview mode with limited items to avoid timeouts)';
        } else if (prevMessage.includes('Starting')) {
          return 'Fetching your collection from Discogs... This may take a moment.';
        }
        return prevMessage;
      });
    }, 3000);

    try {
      const response = await fetch(`/api/collection?username=${encodeURIComponent(username)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Set a longer timeout for the fetch request
        signal: AbortSignal.timeout(120000), // 2 minute timeout
      });

      // Check for timeout (status 0)
      if (response.status === 0) {
        throw new Error('The request timed out. The collection may be too large to process.');
      }

      // Check if the response is JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          const data = await response.json();
          
          if (!response.ok) {
            // Handle various error status codes
            if (response.status === 429) {
              throw new Error(`Rate limit exceeded. ${data.error || 'Please try again later.'}`);
            } else if (response.status === 504) {
              // Increment retry count for timeouts
              setRetryCount(prev => prev + 1);
              
              if (retryCount >= 2) {
                throw new Error(`The request timed out multiple times. Your collection may be too large to process in preview mode. We're currently limiting to a subset of your collection to avoid timeouts.`);
              } else {
                throw new Error(`The request timed out. This could be due to high traffic or a large collection. Please try again.`);
              }
            } else if (response.status === 404 || (data.releases && data.releases.length === 0)) {
              throw new Error('No releases found. Please verify your Discogs username.');
            } else {
              throw new Error(data.error || 'An error occurred while fetching your collection.');
            }
          }
          
          if (data.limitedResults) {
            setLimitedResults(true);
          }
          
          setCollection(data.releases || []);
          setStats(data.stats || null);
        } catch (jsonError: unknown) {
          console.error('Error parsing JSON:', jsonError);
          const errorMessage = jsonError instanceof Error ? jsonError.message : 'Unknown error';
          throw new Error(`Failed to parse response: ${errorMessage}`);
        }
      } else {
        // Handle non-JSON response
        const text = await response.text();
        console.error('Received non-JSON response:', text.substring(0, 100));
        throw new Error(`Received unexpected response format. Please try again later.`);
      }
    } catch (error: any) {
      console.error('Error fetching collection:', error);
      
      // Network errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError(error.message || 'An error occurred. Please try again.');
      }
    } finally {
      clearInterval(messageInterval);
      setLoading(false);
      setLoadingMessage('');
    }
  };

  useEffect(() => {
    if (!username) return;
    fetchCollection();
    
    // Clean up any timeouts
    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [username]);

  // Cancel any pending retries if user navigates away
  useEffect(() => {
    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, []);

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

  if (loading) {
    return (
      <div className="text-center py-10">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600 mb-4"></div>
        <p className="mt-2 text-lg font-medium">{loadingMessage}</p>
        {retryCountdown > 0 && (
          <p className="mt-2 text-orange-600 font-bold">
            Retrying in {retryCountdown} seconds...
          </p>
        )}
        <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
          Analyzing your collection to stay within Discogs API rate limits.
        </p>
      </div>
    );
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
                  setRetryCount(0);
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
                const waitTime = Math.min(5000 * Math.pow(2, retryCount), 30000);
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
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-1">Collection Analyzer</h2>
          <p className="text-sm text-gray-500">
            Enter your Discogs username to analyze your record collection.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Discogs username"
            value={username}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setUsername(e.target.value);
              setError(null);
              setCollection([]);
              setStats(null);
              setActiveTab('rarest');
            }}
            className="flex-grow px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            disabled={loading}
          />
          <button 
            onClick={fetchCollection} 
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : 'Analyze'}
          </button>
        </div>
        
        {loadingMessage && (
          <div className="mt-4 p-2 bg-gray-100 rounded">
            <p>{loadingMessage}</p>
          </div>
        )}
        
        {error && (
          <div className="mt-4 p-2 bg-red-100 text-red-700 rounded">
            <p>{error}</p>
          </div>
        )}
      </div>

      {collection.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Your Collection</h2>
            {limitedResults && (
              <p className="text-sm text-amber-500">
                Showing a preview of your collection (limited to 30 items to avoid timeouts). 
                {stats && stats.totalReleases > 0 && 
                  " We're calculating rarity scores for these items to give you insights about your collection."}
              </p>
            )}
          </div>
          <div className="mb-4">
            <div className="flex border-b overflow-x-auto whitespace-nowrap py-1">
              <button
                className={`py-2 px-4 font-medium ${
                  activeTab === 'rarest' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'
                }`}
                onClick={() => setActiveTab('rarest')}
              >
                Highest Ratio
              </button>
              <button
                className={`py-2 px-4 font-medium ${
                  activeTab === 'fewestHaves' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'
                }`}
                onClick={() => setActiveTab('fewestHaves')}
              >
                Fewest Haves
              </button>
              <button
                className={`py-2 px-4 font-medium ${
                  activeTab === 'mostWanted' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'
                }`}
                onClick={() => setActiveTab('mostWanted')}
              >
                Most Wanted
              </button>
              <button
                className={`py-2 px-4 font-medium ${
                  activeTab === 'collectible' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'
                }`}
                onClick={() => setActiveTab('collectible')}
              >
                Most Collectible
              </button>
              <button
                className={`py-2 px-4 font-medium ${
                  activeTab === 'common' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'
                }`}
                onClick={() => setActiveTab('common')}
              >
                Most Common
              </button>
              <button
                className={`py-2 px-4 font-medium ${
                  activeTab === 'all' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'
                }`}
                onClick={() => setActiveTab('all')}
              >
                All Items
              </button>
            </div>
          </div>

          {activeTab === 'rarest' && stats && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Your Rarest Records (Want/Have Ratio)</h3>
              <p className="text-sm text-gray-600 mb-3">The records with the highest ratio of people wanting them compared to how many people have them.</p>
              {renderCollectionItems(stats.rarestItems)}
            </div>
          )}

          {activeTab === 'fewestHaves' && stats && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Your Least Common Records (Fewest Haves)</h3>
              <p className="text-sm text-gray-600 mb-3">The records that very few Discogs users have in their collections.</p>
              {stats.fewestHaves && stats.fewestHaves.length > 0 ? (
                renderCollectionItems(stats.fewestHaves)
              ) : (
                <p className="text-gray-500 italic py-4">No have/want data available for this category.</p>
              )}
            </div>
          )}

          {activeTab === 'mostWanted' && stats && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Your Most Wanted Records</h3>
              <p className="text-sm text-gray-600 mb-3">The records that the most Discogs users have added to their wantlists.</p>
              {stats.mostWanted && stats.mostWanted.length > 0 ? (
                renderCollectionItems(stats.mostWanted)
              ) : (
                <p className="text-gray-500 italic py-4">No have/want data available for this category.</p>
              )}
            </div>
          )}

          {activeTab === 'collectible' && stats && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Your Most Collectible Records</h3>
              <p className="text-sm text-gray-600 mb-3">Records that are widely collected but still in high demand.</p>
              {stats.mostCollectible && stats.mostCollectible.length > 0 ? (
                renderCollectionItems(stats.mostCollectible)
              ) : (
                <p className="text-gray-500 italic py-4">No have/want data available for this category.</p>
              )}
            </div>
          )}

          {activeTab === 'common' && stats && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Your Most Common Records</h3>
              <p className="text-sm text-gray-600 mb-3">Records with the lowest want/have ratio.</p>
              {stats.mostCommonItems && stats.mostCommonItems.length > 0 ? (
                renderCollectionItems(stats.mostCommonItems)
              ) : (
                <p className="text-gray-500 italic py-4">No have/want data available for this category.</p>
              )}
            </div>
          )}

          {activeTab === 'all' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Your Most Recent Additions</h3>
              <p className="text-sm text-gray-600 mb-3">Shows the 50 most recently added items to your collection.</p>
              {renderCollectionItems(collection)}
            </div>
          )}
        </div>
      )}

      {stats && (
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Collection Summary</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded shadow">
              <div className="text-sm text-gray-500">Releases Analyzed</div>
              <div className="text-2xl font-bold">{stats.totalReleases}</div>
              <div className="text-xs text-gray-400">Most recent additions</div>
            </div>
            <div className="bg-white p-4 rounded shadow">
              <div className="text-sm text-gray-500">Average Rarity Score</div>
              <div className="text-2xl font-bold">{stats.averageRarityScore.toFixed(2)}</div>
            </div>
            <div className="bg-white p-4 rounded shadow">
              <div className="text-sm text-gray-500">Rarest Item Score</div>
              <div className="text-2xl font-bold">
                {stats.rarestItems.length > 0 
                  ? stats.rarestItems[0].rarityScore.toFixed(2) 
                  : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 