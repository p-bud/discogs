import axios from 'axios';
import { cookies } from 'next/headers';
import { rateLimit } from './rate-limiter';
// Don't import at the top level since we're using dynamic imports

// Simple in-memory cache for collection data
const collectionsCache: Record<string, { data: CollectionItem[], timestamp: number }> = {};
const releaseCache: Record<string, { data: any, timestamp: number }> = {};

// Cache expiration time (1 hour)
const CACHE_EXPIRATION = 60 * 60 * 1000;

// Maximum releases to process in one batch
const BATCH_SIZE = 10;

// Types
export interface CollectionItem {
  id: string;
  title: string;
  artist: string;
  year: string;
  format: string[];
  coverImage: string;
  haveCount: number;
  wantCount: number;
  rarityScore: number; // want/have ratio
}

export interface CollectionStats {
  totalReleases: number;
  averageRarityScore: number;
  rarestItems: CollectionItem[];
  mostCommonItems: CollectionItem[];
  fewestHaves: CollectionItem[];
  mostWanted: CollectionItem[];
  mostCollectible: CollectionItem[];
}

/**
 * Get a user's collection from Discogs
 * @param username The Discogs username
 * @returns Collection items with rarity metrics
 */
export async function getUserCollection(username: string): Promise<CollectionItem[]> {
  try {
    // Check cache first
    const now = Date.now();
    if (collectionsCache[username] && 
        now - collectionsCache[username].timestamp < CACHE_EXPIRATION) {
      console.log(`Using cached collection for ${username}`);
      return collectionsCache[username].data;
    }
    
    // Create Discogs client using the existing auth
    const cookieStore = cookies();
    const hasAuth = cookieStore.has('discogs_oauth_token') && cookieStore.has('discogs_oauth_token_secret');
    
    if (!hasAuth) {
      throw new Error('Authentication required to access collection');
    }
    
    // Cache key for partially processed collections (in case we hit rate limits mid-processing)
    const partialCacheKey = `${username}_partial`;
    let partialCollection: CollectionItem[] = [];
    let startPage = 1;
    
    // Check if we have a partial collection from a previous attempt
    if (collectionsCache[partialCacheKey] && 
        now - collectionsCache[partialCacheKey].timestamp < 5 * 60 * 1000) { // Valid for 5 minutes
      console.log(`Found partial collection for ${username}, resuming processing`);
      partialCollection = collectionsCache[partialCacheKey].data;
      
      // If we already have some data, don't fetch it again
      if (partialCollection.length > 0) {
        // Go directly to processing the releases we already have
        const sortedReleases = partialCollection.sort((a, b) => b.rarityScore - a.rarityScore);
        
        // Cache the results
        collectionsCache[username] = {
          data: sortedReleases,
          timestamp: Date.now()
        };
        
        // Clean up partial cache
        delete collectionsCache[partialCacheKey];
        
        return sortedReleases;
      }
    }
    
    // Import the discogs module dynamically
    const discogs = await import('./discogs');
    const discogsClient = discogs.createDiscogsClient();
    
    console.log(`Fetching 50 most recent collection additions for ${username}`);
    
    // Get the user's collection with rate limiting, limiting to 50 most recent additions
    const getCollection = async () => {
      const response = await discogsClient.get(`/users/${username}/collection/folders/0/releases`, {
        params: {
          sort: 'added',
          sort_order: 'desc',
          per_page: 50
        }
      });
      return response;
    };
    
    // Use rate limiting for the API call with retry mechanism
    let retries = 0;
    const maxRetries = 3;
    let lastError: any = null;
    
    while (retries <= maxRetries) {
      try {
        // If this is a retry, add some delay with exponential backoff
        if (retries > 0) {
          const delay = Math.min(2000 * Math.pow(2, retries - 1), 10000); // Max 10 second delay
          console.log(`Retry attempt ${retries}/${maxRetries} after ${delay}ms delay`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        const response = await rateLimit(getCollection);
        
        // We're only fetching a single page of the 50 most recent items, so pagination is disabled
        let allReleases = response.data.releases || [];
        
        // Convert the releases to our application's format
        // First, get the community data for each release (have/want counts)
        
        // Process each release to get have/want counts and calculate rarity
        // Do this in batches to avoid hitting rate limits
        const processedReleases: CollectionItem[] = [];
        
        // Smaller batch size to avoid rate limits
        const effectiveBatchSize = Math.min(BATCH_SIZE, 5); 
        
        // Process releases in batches
        for (let i = 0; i < allReleases.length; i += effectiveBatchSize) {
          try {
            const batchReleases = allReleases.slice(i, i + effectiveBatchSize);
            
            console.log(`Processing batch ${i/effectiveBatchSize + 1}/${Math.ceil(allReleases.length/effectiveBatchSize)}`);
            
            // Process a batch concurrently with individual rate limiting on each request
            const batchResults = await Promise.all(
              batchReleases.map(async (release: any) => {
                try {
                  // Get detailed release info to get have/want counts
                  const releaseDetails = await getReleaseCommunityData(release.id);
                  
                  // Calculate rarity score (want/have ratio)
                  const haveCount = releaseDetails.community?.have || 0;
                  const wantCount = releaseDetails.community?.want || 0;
                  const rarityScore = haveCount > 0 ? (wantCount / haveCount) : 0;
                  
                  return {
                    id: release.id,
                    title: release.basic_information?.title || 'Unknown',
                    artist: release.basic_information?.artists?.[0]?.name || 'Unknown',
                    year: release.basic_information?.year || '',
                    format: release.basic_information?.formats?.map((f: any) => f.name) || [],
                    coverImage: release.basic_information?.cover_image || '',
                    haveCount,
                    wantCount,
                    rarityScore
                  };
                } catch (error: any) {
                  // If we hit a rate limit on an individual release, use default values
                  console.error(`Error processing release ${release.id}:`, error.message);
                  return {
                    id: release.id,
                    title: release.basic_information?.title || 'Unknown',
                    artist: release.basic_information?.artists?.[0]?.name || 'Unknown',
                    year: release.basic_information?.year || '',
                    format: release.basic_information?.formats?.map((f: any) => f.name) || [],
                    coverImage: release.basic_information?.cover_image || '',
                    haveCount: 0,
                    wantCount: 0,
                    rarityScore: 0
                  };
                }
              })
            );
            
            processedReleases.push(...batchResults);
            
            // Update the partial cache after each batch
            collectionsCache[partialCacheKey] = {
              data: processedReleases,
              timestamp: Date.now()
            };
            
            // Add longer delay between batches to avoid rate limits
            if (i + effectiveBatchSize < allReleases.length) {
              console.log(`Processed ${i + effectiveBatchSize}/${allReleases.length} releases. Waiting before next batch...`);
              await new Promise(resolve => setTimeout(resolve, 1500));
            }
          } catch (error: any) {
            console.error(`Error processing batch:`, error.message);
            // If we hit a rate limit, just use what we have so far
            if (error.response?.status === 429) {
              console.log('Rate limit hit while processing batches. Using partial results.');
              break;
            }
          }
        }
        
        // Sort by rarity score (highest first)
        const sortedReleases = processedReleases.sort((a, b) => b.rarityScore - a.rarityScore);
        
        // Cache the results
        collectionsCache[username] = {
          data: sortedReleases,
          timestamp: Date.now()
        };
        
        // Clean up partial cache
        delete collectionsCache[partialCacheKey];
        
        return sortedReleases;
      } catch (error: any) {
        console.error(`Error fetching collection for ${username}:`, error.message);
        lastError = error;
        retries++;
        
        // If the error is something other than a network or timeout error, don't retry
        if (error.response && error.response.status !== 429 && 
            error.name !== 'TimeoutError' && 
            !error.message?.includes('timeout') && 
            error.name !== 'FetchError') {
          throw error; // Don't retry for non-recoverable errors
        }
        
        // If we've reached the max retries, throw the last error
        if (retries > maxRetries) {
          console.error(`Max retries (${maxRetries}) reached for ${username}`);
          throw lastError;
        }
      }
    }
    
    // This should not be reached but added for completeness
    throw lastError || new Error('Unknown error fetching collection');
  } catch (error) {
    console.error('Error fetching user collection:', error);
    throw error;
  }
}

/**
 * Get community data (have/want counts) for a specific release
 */
export async function getReleaseCommunityData(releaseId: string) {
  try {
    // Check cache first
    const now = Date.now();
    if (releaseCache[releaseId] && 
        now - releaseCache[releaseId].timestamp < CACHE_EXPIRATION) {
      return releaseCache[releaseId].data;
    }
    
    // Import the discogs module dynamically
    const discogs = await import('./discogs');
    const discogsClient = discogs.createDiscogsClient();
    
    // Create a function that will be rate limited
    const getRelease = async () => {
      const response = await discogsClient.get(`/releases/${releaseId}`);
      return response;
    };
    
    // Use rate limiting for the API call
    const response = await rateLimit(getRelease);
    
    // Cache the result
    releaseCache[releaseId] = {
      data: response.data,
      timestamp: now
    };
    
    return response.data;
  } catch (error) {
    console.error(`Error fetching community data for release ${releaseId}:`, error);
    // Return default empty values on error
    return { community: { have: 0, want: 0 } };
  }
}

/**
 * Calculate collection statistics
 */
export function calculateCollectionStats(collection: CollectionItem[]): CollectionStats {
  // Handle empty collection
  if (!collection || collection.length === 0) {
    return {
      totalReleases: 0,
      averageRarityScore: 0,
      rarestItems: [],
      mostCommonItems: [],
      fewestHaves: [],
      mostWanted: [],
      mostCollectible: []
    };
  }
  
  // Calculate average rarity score
  const totalRarityScore = collection.reduce((sum, item) => sum + item.rarityScore, 0);
  const averageRarityScore = totalRarityScore / collection.length;
  
  // Sort by different metrics
  const sortedByRarity = [...collection].sort((a, b) => b.rarityScore - a.rarityScore);
  const sortedByFewestHaves = [...collection].sort((a, b) => a.haveCount - b.haveCount);
  const sortedByMostWanted = [...collection].sort((a, b) => b.wantCount - a.wantCount);
  const sortedByCollectibility = [...collection].sort((a, b) => {
    // Create a collectibility score that favors items with both high have and want counts
    const aScore = (a.haveCount * a.wantCount) / 1000;
    const bScore = (b.haveCount * b.wantCount) / 1000;
    return bScore - aScore;
  });
  
  return {
    totalReleases: collection.length,
    averageRarityScore,
    rarestItems: sortedByRarity.slice(0, 10), // Top 10 rarest by want/have ratio
    mostCommonItems: sortedByRarity.slice(-10).reverse(), // Bottom 10 by want/have ratio
    fewestHaves: sortedByFewestHaves.slice(0, 10), // Top 10 with fewest haves
    mostWanted: sortedByMostWanted.slice(0, 10), // Top 10 most wanted
    mostCollectible: sortedByCollectibility.slice(0, 10) // Top 10 most collectible
  };
} 