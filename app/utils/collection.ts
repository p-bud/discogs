import axios from 'axios';
import { cookies } from 'next/headers';
import { rateLimit } from './rate-limiter';
import { CollectionItem, CollectionStats } from '../models/types';
// Don't import at the top level since we're using dynamic imports

// Simple in-memory cache for collection data
const collectionsCache: Record<string, { data: CollectionItem[], timestamp: number }> = {};
const releaseCache: Record<string, { data: any, timestamp: number }> = {};

// Cache expiration time (1 hour)
const CACHE_EXPIRATION = 60 * 60 * 1000;

// Constants for API requests
const BATCH_SIZE = 5; // Process 5 releases at a time to avoid rate limits
const MAX_ITEMS = 50; // Increased to 50 items since we're only fetching basic data
const API_DELAY_MS = 500; // Reduced to 500ms to speed up processing

// Delay between batches (ms)
const BATCH_DELAY_MS = 500; // Reduced to 500ms to speed up processing

/**
 * Get a user's collection from Discogs with only basic data
 * @param username The Discogs username
 * @returns Collection items with basic info (without community data)
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
    
    // Import the discogs module dynamically
    let discogs;
    try {
      discogs = await import('./discogs');
    } catch (importError) {
      console.error('Error importing discogs module:', importError);
      throw new Error('Failed to initialize Discogs client. Please try again later.');
    }
    
    let discogsClient;
    try {
      discogsClient = discogs.createDiscogsClient();
    } catch (clientError) {
      console.error('Error creating Discogs client:', clientError);
      throw new Error('Failed to create Discogs client. Please check authentication and try again.');
    }
    
    console.log(`Fetching ${MAX_ITEMS} most recent collection additions for ${username}`);
    
    // Get the user's collection with rate limiting, limiting to MAX_ITEMS most recent additions
    const getCollection = async () => {
      const response = await discogsClient.get(`/users/${username}/collection/folders/0/releases`, {
        params: {
          sort: 'added',
          sort_order: 'desc',
          per_page: MAX_ITEMS
        }
      });
      return response;
    };
    
    // Use rate limiting for the API call
    const response = await rateLimit(getCollection);
    
    // We're only fetching a single page of the most recent items
    let allReleases = response.data.releases || [];
    
    // Limit to MAX_ITEMS to stay within function timeout limits
    if (allReleases.length > MAX_ITEMS) {
      console.log(`Limiting releases from ${allReleases.length} to ${MAX_ITEMS} to avoid timeout`);
      allReleases = allReleases.slice(0, MAX_ITEMS);
    }
    
    // Convert to basic collection items (without have/want data)
    const basicItems = allReleases.map((release: any) => ({
      id: release.id,
      title: release.basic_information?.title || 'Unknown',
      artist: release.basic_information?.artists?.[0]?.name || 'Unknown',
      year: release.basic_information?.year || '',
      format: release.basic_information?.formats?.map((f: any) => f.name) || [],
      coverImage: release.basic_information?.cover_image || '',
      haveCount: 0,
      wantCount: 0,
      rarityScore: 0
    }));
    
    // Cache the results
    collectionsCache[username] = {
      data: basicItems,
      timestamp: Date.now()
    };
    
    console.log(`Processed ${basicItems.length} releases with basic data`);
    return basicItems;
  } catch (error) {
    console.error('Error fetching collection:', error);
    throw error;
  }
}

/**
 * Get community data for a specific release
 * @param releaseId The Discogs release ID
 * @returns The release details from Discogs API
 */
export async function getReleaseCommunityData(releaseId: string): Promise<any> {
  try {
    // Check cache first
    const now = Date.now();
    if (releaseCache[releaseId] && 
        now - releaseCache[releaseId].timestamp < CACHE_EXPIRATION) {
      return releaseCache[releaseId].data;
    }
    
    // Create Discogs client using the existing auth
    const cookieStore = cookies();
    const hasAuth = cookieStore.has('discogs_oauth_token') && cookieStore.has('discogs_oauth_token_secret');
    
    if (!hasAuth) {
      throw new Error('Authentication required to access release data');
    }
    
    // Import the discogs module dynamically
    const discogs = await import('./discogs');
    console.log(`Creating Discogs client with OAuth credentials`);
    const discogsClient = discogs.createDiscogsClient();
    
    // Get the release details with rate limiting
    const getReleaseDetails = async () => {
      console.log(`Making authenticated request to: https://api.discogs.com/releases/${releaseId}`);
      const response = await discogsClient.get(`/releases/${releaseId}`);
      return response;
    };
    
    // Use rate limiting for the API call
    const response = await rateLimit(getReleaseDetails);
    
    // Cache the result
    releaseCache[releaseId] = {
      data: response.data,
      timestamp: Date.now()
    };
    
    return response.data;
  } catch (error) {
    console.error(`Error fetching release ${releaseId}:`, error);
    throw error;
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