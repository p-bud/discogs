import React, { useState, useEffect } from 'react';
import { CollectionItem, CollectionStats } from '../models/types';
import Image from 'next/image';

interface CollectionAnalysisProps {
  username: string;
}

export default function CollectionAnalysis({ username }: CollectionAnalysisProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [stats, setStats] = useState<CollectionStats | null>(null);
  const [activeTab, setActiveTab] = useState<'rarest' | 'common' | 'fewestHaves' | 'mostWanted' | 'collectible' | 'all'>('rarest');
  const [loadingMessage, setLoadingMessage] = useState<string>('Loading your collection...');
  const [retryCount, setRetryCount] = useState<number>(0);
  const [retryTimeout, setRetryTimeout] = useState<NodeJS.Timeout | null>(null);
  const [retryCountdown, setRetryCountdown] = useState<number>(0);

  // Define fetchCollection outside the useEffect so it can be referenced in button click handlers
  const fetchCollection = async () => {
    setLoading(true);
    setError(null);
    
    // Set a loading message that changes over time to show progress
    setLoadingMessage('Fetching your 50 most recent collection additions from Discogs...');
    
    // Set a timeout to update loading message after 5 seconds
    const messageTimeout = setTimeout(() => {
      setLoadingMessage('This might take a minute - analyzing your 50 most recent additions...');
    }, 5000);
    
    // Set another timeout to update the message again after 20 seconds
    const messageTimeout2 = setTimeout(() => {
      setLoadingMessage('Still working... We\'re processing your 50 most recent additions to calculate rarity scores.');
    }, 20000);

    try {
      // Wrap the entire fetch process in a try-catch
      try {
        const response = await fetch(`/api/collection?username=${encodeURIComponent(username)}`, {
          // Set a longer timeout
          signal: AbortSignal.timeout(120000) // 120 second timeout (increased from 60)
        });
        
        // Clear the message timeouts
        clearTimeout(messageTimeout);
        clearTimeout(messageTimeout2);

        // Check if the request was aborted due to timeout
        if (response.status === 0) {
          throw new Error("Request timed out. Discogs API may be experiencing issues.");
        }

        // Check the content type before parsing as JSON
        const contentType = response.headers.get('content-type');
        let data;
        
        if (contentType && contentType.includes('application/json')) {
          try {
            data = await response.json();
          } catch (parseError) {
            console.error('Error parsing JSON response:', parseError);
            throw new Error('Invalid response format from server. Please try again later.');
          }
        } else {
          // Handle non-JSON responses
          const textResponse = await response.text();
          console.error('Received non-JSON response:', textResponse);
          throw new Error(`Server returned invalid response format: ${textResponse.substring(0, 100)}...`);
        }

        if (!response.ok) {
          // Check for rate limit error
          if (response.status === 429) {
            // Get retry after value
            const retryAfter = parseInt(response.headers.get('retry-after') || data.retryAfter || '60', 10);
            const retryAfterSec = Math.min(60, Math.max(10, retryAfter)); // Between 10-60 seconds
            
            // Increment retry count
            const newRetryCount = retryCount + 1;
            setRetryCount(newRetryCount);
            
            // If we've tried less than 3 times, retry automatically
            if (newRetryCount < 3) {
              setRetryCountdown(retryAfterSec);
              setLoadingMessage(
                `Rate limit reached. Automatically retrying in ${retryAfterSec} seconds (attempt ${newRetryCount}/3)...`
              );
              
              // Set up countdown
              const countdownInterval = setInterval(() => {
                setRetryCountdown(prev => {
                  if (prev <= 1) {
                    clearInterval(countdownInterval);
                    return 0;
                  }
                  return prev - 1;
                });
              }, 1000);
              
              // Set a timeout to retry
              const timeout = setTimeout(() => {
                clearInterval(countdownInterval);
                setRetryTimeout(null);
                fetchCollection();
              }, retryAfterSec * 1000);
              
              if (retryTimeout) {
                clearTimeout(retryTimeout);
              }
              setRetryTimeout(timeout);
              return;
            } else {
              // After 3 retries, give up
              throw new Error(
                `Discogs API rate limit exceeded. Please try again later. ${data.details || ''}`
              );
            }
          }
          
          throw new Error(data.error || 'Failed to fetch collection');
        }

        // Successful response
        setCollection(data.collection || []);
        setStats(data.stats || null);
        
        // Reset retry count on success
        setRetryCount(0);
      } catch (err: any) {
        // Clear the message timeouts
        clearTimeout(messageTimeout);
        clearTimeout(messageTimeout2);
        
        // Format a user-friendly error message
        let errorMessage = err.message || 'An error occurred while fetching your collection';
        let isTimeout = false;
        
        // Add more context for specific errors
        if (errorMessage.includes('rate limit')) {
          errorMessage = `Discogs API rate limit exceeded. The API only allows a limited number of requests per minute. Please try again in a few minutes.`;
        } else if (errorMessage.includes('timed out') || errorMessage.includes('timeout')) {
          isTimeout = true;
          errorMessage = `Request timed out. The Discogs API might be experiencing high traffic or your 50 most recent additions might contain releases with a lot of data. Please try again.`;
        } else if (errorMessage.includes('No releases found')) {
          errorMessage = `No releases found in collection for ${username}. Make sure you've entered the correct Discogs username and have records in your collection.`;
        } else if (errorMessage.includes('network') || err.name === 'FetchError') {
          errorMessage = `Network error. Please check your internet connection and try again.`;
        }
        
        setError(errorMessage);
        setRetryCount(isTimeout ? retryCount + 1 : 0); // Increment retry count only for timeouts
      }
    } catch (err: any) {
      // Clear the message timeouts
      clearTimeout(messageTimeout);
      clearTimeout(messageTimeout2);
      
      // Format a user-friendly error message
      let errorMessage = err.message || 'An error occurred while fetching your collection';
      let isTimeout = false;
      
      // Add more context for specific errors
      if (errorMessage.includes('rate limit')) {
        errorMessage = `Discogs API rate limit exceeded. The API only allows a limited number of requests per minute. Please try again in a few minutes.`;
      } else if (errorMessage.includes('timed out') || errorMessage.includes('timeout')) {
        isTimeout = true;
        errorMessage = `Request timed out. The Discogs API might be experiencing high traffic or your 50 most recent additions might contain releases with a lot of data. Please try again.`;
      } else if (errorMessage.includes('No releases found')) {
        errorMessage = `No releases found in collection for ${username}. Make sure you've entered the correct Discogs username and have records in your collection.`;
      } else if (errorMessage.includes('network') || err.name === 'FetchError') {
        errorMessage = `Network error. Please check your internet connection and try again.`;
      }
      
      setError(errorMessage);
      setRetryCount(isTimeout ? retryCount + 1 : 0); // Increment retry count only for timeouts
    } finally {
      setLoading(false);
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
          Analyzing your 50 most recent collection additions to stay within Discogs API rate limits.
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
              We've limited analysis to your 50 most recent additions to minimize this, but occasional timeouts may still occur.
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
    <div className="mt-6">
      {stats && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 mb-6">
          <h2 className="text-xl font-bold text-indigo-800 mb-4">Collection Summary <span className="text-sm font-normal text-indigo-600">(Based on 50 most recent additions)</span></h2>
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
          {renderCollectionItems(stats.fewestHaves)}
        </div>
      )}

      {activeTab === 'mostWanted' && stats && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Your Most Wanted Records</h3>
          <p className="text-sm text-gray-600 mb-3">The records that the most Discogs users have added to their wantlists.</p>
          {renderCollectionItems(stats.mostWanted)}
        </div>
      )}

      {activeTab === 'collectible' && stats && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Your Most Collectible Records</h3>
          <p className="text-sm text-gray-600 mb-3">Records that are widely collected but still in high demand.</p>
          {renderCollectionItems(stats.mostCollectible)}
        </div>
      )}

      {activeTab === 'common' && stats && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Your Most Common Records</h3>
          <p className="text-sm text-gray-600 mb-3">Records with the lowest want/have ratio.</p>
          {renderCollectionItems(stats.mostCommonItems)}
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
  );
} 