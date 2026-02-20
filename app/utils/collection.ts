import { cookies } from 'next/headers';
import { rateLimit } from './rate-limiter';
import { CollectionItem, CollectionStats } from '../models/types';
import { getSupabaseClient } from './supabase';
// Don't import at the top level since we're using dynamic imports

// Simple in-memory cache for collection data (short-lived, single-process)
const collectionsCache: Record<string, { data: CollectionItem[], hitPageCap: boolean, timestamp: number }> = {};
const releaseCache: Record<string, { data: any, timestamp: number }> = {};

// In-memory cache expiration (1 hour)
const CACHE_EXPIRATION = 60 * 60 * 1000;

// Supabase cache TTL (7 days in ms, used for staleness check)
const SUPABASE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Constants for paginated collection fetching
const PER_PAGE = 100;       // Discogs max per_page
const MAX_PAGES = 20;       // Safety cap = 2,000 items
const TIME_BUDGET_MS = 8_000; // Leave headroom before Vercel 10s timeout

/**
 * Get a user's collection. Checks Supabase cache first (7-day TTL), then
 * falls back to the Discogs API and writes the results back to the cache.
 *
 * @param username     The Discogs username
 * @param forceRefresh When true, skips the cache and re-fetches from Discogs
 */
export async function getUserCollection(
  username: string,
  forceRefresh = false,
): Promise<{ items: CollectionItem[]; hitPageCap: boolean; fromCache: boolean; cachedAt: string | null; _cacheDebug?: Record<string, unknown> }> {
  try {
    const supabase = getSupabaseClient();

    // ── 1. Supabase cache read ──────────────────────────────────────────────
    if (supabase && !forceRefresh) {
      try {
        // Check freshness by looking at the most-recent synced_at for this user
        const { data: meta } = await supabase
          .from('user_collection_cache')
          .select('synced_at')
          .eq('discogs_username', username)
          .order('synced_at', { ascending: false })
          .limit(1)
          .single();

        if (meta) {
          const syncedAt = new Date(meta.synced_at);
          if (Date.now() - syncedAt.getTime() < SUPABASE_TTL_MS) {
            // Cache is fresh — fetch all items joined with community data via RPC
            const { data: rows, error: rpcErr } = await supabase.rpc(
              'get_user_collection_with_community',
              { p_username: username },
            );

            if (!rpcErr && rows && rows.length > 0) {
              const items: CollectionItem[] = rows.map((row: any) => ({
                id: row.release_id,
                title: row.title,
                artist: row.artist,
                year: row.year,
                format: Array.isArray(row.formats) ? row.formats : [],
                coverImage: row.cover_image,
                haveCount: row.have_count ?? 0,
                wantCount: row.want_count ?? 0,
                rarityScore: Number(row.rarity_score ?? 0),
              }));

              console.log(`Serving ${items.length} items from Supabase cache for ${username}`);
              return {
                items,
                hitPageCap: false,
                fromCache: true,
                cachedAt: meta.synced_at,
              };
            }
          }
        }
      } catch (cacheErr) {
        console.warn('Supabase cache read failed, falling back to Discogs:', cacheErr);
      }
    }

    // ── 2. Clear stale cache rows when forceRefresh ─────────────────────────
    if (forceRefresh && supabase) {
      try {
        await supabase
          .from('user_collection_cache')
          .delete()
          .eq('discogs_username', username);
        console.log(`Cleared Supabase collection cache for ${username}`);
      } catch (deleteErr) {
        console.warn('Failed to clear Supabase cache:', deleteErr);
      }
    }

    // ── 3. In-memory cache (short-circuit within the same server process) ───
    const now = Date.now();
    if (!forceRefresh && collectionsCache[username] &&
        now - collectionsCache[username].timestamp < CACHE_EXPIRATION) {
      console.log(`Using in-memory cached collection for ${username}`);
      const cached = collectionsCache[username];
      return { items: cached.data, hitPageCap: cached.hitPageCap, fromCache: false, cachedAt: null };
    }

    // ── 4. Fetch from Discogs ───────────────────────────────────────────────
    const cookieStore = cookies();
    const hasAuth = cookieStore.has('discogs_oauth_token') && cookieStore.has('discogs_oauth_token_secret');

    if (!hasAuth) {
      throw new Error('Authentication required to access collection');
    }

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

    console.log(`Fetching full collection for ${username} (up to ${MAX_PAGES * PER_PAGE} items)`);

    let page = 1;
    let totalPages = 1;
    const allReleases: any[] = [];
    const startTime = Date.now();

    do {
      const response = await rateLimit(() =>
        discogsClient.get(`/users/${username}/collection/folders/0/releases`, {
          params: { sort: 'added', sort_order: 'desc', per_page: PER_PAGE, page },
        })
      );
      const data = response.data;
      allReleases.push(...(data.releases ?? []));
      totalPages = data.pagination?.pages ?? 1;
      page++;
    } while (
      page <= totalPages &&
      page <= MAX_PAGES &&
      Date.now() - startTime < TIME_BUDGET_MS
    );

    const hitPageCap = page <= totalPages;

    const basicItems: CollectionItem[] = allReleases.map((release: any) => ({
      id: String(release.id),
      title: release.basic_information?.title || 'Unknown',
      artist: release.basic_information?.artists?.[0]?.name || 'Unknown',
      year: String(release.basic_information?.year || ''),
      format: release.basic_information?.formats?.map((f: any) => f.name) || [],
      coverImage: release.basic_information?.cover_image || '',
      haveCount: 0,
      wantCount: 0,
      rarityScore: 0,
    }));

    // Update in-memory cache
    collectionsCache[username] = {
      data: basicItems,
      hitPageCap,
      timestamp: Date.now(),
    };

    // ── 5. Persist to Supabase (awaited — fire-and-forget is cut short by Vercel serverless) ──
    let _cacheDebug: Record<string, unknown> = {
      supabaseAvailable: !!supabase,
      itemCount: basicItems.length,
    };

    if (supabase && basicItems.length > 0) {
      const BATCH_SIZE = 500;
      const syncedAt = new Date().toISOString();
      let batchesWritten = 0;
      let writeError: unknown = null;

      // Deduplicate by release_id: a user can own multiple copies of the same
      // release (same release.id, different instance_id). PostgreSQL raises
      // error 21000 if the same conflict target appears twice in one upsert.
      const seenIds = new Set<string>();
      const uniqueItems = basicItems.filter(item => {
        if (seenIds.has(item.id)) return false;
        seenIds.add(item.id);
        return true;
      });

      try {
        for (let i = 0; i < uniqueItems.length; i += BATCH_SIZE) {
          const batch = uniqueItems.slice(i, i + BATCH_SIZE).map(item => ({
            discogs_username: username,
            release_id: item.id,
            title: item.title,
            artist: item.artist,
            year: item.year,
            formats: item.format,
            cover_image: item.coverImage,
            synced_at: syncedAt,
          }));

          const { error } = await supabase
            .from('user_collection_cache')
            .upsert(batch, { onConflict: 'discogs_username,release_id' });

          if (error) {
            writeError = error;
            console.error('[cache-write] upsert error:', JSON.stringify(error));
            break;
          }
          batchesWritten++;
        }
      } catch (err) {
        writeError = String(err);
        console.error('[cache-write] exception during upsert:', err);
      }
      _cacheDebug = { ..._cacheDebug, itemCount: uniqueItems.length, batchesWritten, writeError };
      console.log('[cache-write] result:', JSON.stringify(_cacheDebug));
    }

    console.log(`Processed ${basicItems.length} releases with basic data${hitPageCap ? ' (page cap reached)' : ''}`);
    return { items: basicItems, hitPageCap, fromCache: false, cachedAt: null, _cacheDebug };
  } catch (error) {
    console.error('Error fetching collection:', error);
    throw error;
  }
}

/**
 * Get community data (have/want) for a specific release.
 * Checks release_community_cache first; falls back to Discogs and writes back.
 *
 * @param releaseId The Discogs release ID
 */
export async function getReleaseCommunityData(releaseId: string): Promise<any> {
  try {
    const supabase = getSupabaseClient();

    // ── 1. Check Supabase release cache ────────────────────────────────────
    if (supabase) {
      try {
        const { data: cached } = await supabase
          .from('release_community_cache')
          .select('have_count, want_count, rarity_score, fetched_at')
          .eq('release_id', releaseId)
          .single();

        if (cached) {
          const fetchedAt = new Date(cached.fetched_at);
          if (Date.now() - fetchedAt.getTime() < SUPABASE_TTL_MS) {
            // Return a shape compatible with what Discogs returns
            return {
              community: {
                have: cached.have_count,
                want: cached.want_count,
              },
              // Expose rarity_score so callers can skip recalculation
              _cachedRarityScore: Number(cached.rarity_score),
            };
          }
        }
      } catch (cacheErr) {
        console.warn(`Supabase release cache read failed for ${releaseId}:`, cacheErr);
      }
    }

    // ── 2. In-memory cache ──────────────────────────────────────────────────
    const now = Date.now();
    if (releaseCache[releaseId] &&
        now - releaseCache[releaseId].timestamp < CACHE_EXPIRATION) {
      return releaseCache[releaseId].data;
    }

    // ── 3. Fetch from Discogs ───────────────────────────────────────────────
    const cookieStore = cookies();
    const hasAuth = cookieStore.has('discogs_oauth_token') && cookieStore.has('discogs_oauth_token_secret');

    if (!hasAuth) {
      throw new Error('Authentication required to access release data');
    }

    const discogs = await import('./discogs');
    console.log(`Creating Discogs client with OAuth credentials`);
    const discogsClient = discogs.createDiscogsClient();

    const getReleaseDetails = async () => {
      console.log(`Making authenticated request to: https://api.discogs.com/releases/${releaseId}`);
      const response = await discogsClient.get(`/releases/${releaseId}`);
      return response;
    };

    const response = await rateLimit(getReleaseDetails);

    // Update in-memory cache
    releaseCache[releaseId] = {
      data: response.data,
      timestamp: Date.now(),
    };

    // ── 4. Persist to Supabase release cache (awaited — fire-and-forget is cut short by Vercel serverless) ──
    if (supabase) {
      const community = response.data?.community;
      if (community) {
        const haveCount = community.have ?? 0;
        const wantCount = community.want ?? 0;
        const rarityScore = haveCount > 0 ? wantCount / haveCount : 0;
        try {
          const { error } = await supabase
            .from('release_community_cache')
            .upsert(
              {
                release_id: releaseId,
                have_count: haveCount,
                want_count: wantCount,
                rarity_score: rarityScore,
                fetched_at: new Date().toISOString(),
              },
              { onConflict: 'release_id' },
            );
          if (error) console.warn(`Supabase release cache write failed for ${releaseId}:`, error);
        } catch (err) {
          console.warn(`Supabase release cache write failed for ${releaseId}:`, err);
        }
      }
    }

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
  if (!collection || collection.length === 0) {
    return {
      totalReleases: 0,
      averageRarityScore: 0,
      rarestItems: [],
      mostCommonItems: [],
      fewestHaves: [],
      mostWanted: [],
      mostCollectible: [],
    };
  }

  const totalRarityScore = collection.reduce((sum, item) => sum + item.rarityScore, 0);
  const averageRarityScore = totalRarityScore / collection.length;

  const sortedByRarity = [...collection].sort((a, b) => b.rarityScore - a.rarityScore);
  const sortedByFewestHaves = [...collection].sort((a, b) => a.haveCount - b.haveCount);
  const sortedByMostWanted = [...collection].sort((a, b) => b.wantCount - a.wantCount);
  const sortedByCollectibility = [...collection].sort((a, b) => {
    const aScore = (a.haveCount * a.wantCount) / 1000;
    const bScore = (b.haveCount * b.wantCount) / 1000;
    return bScore - aScore;
  });

  return {
    totalReleases: collection.length,
    averageRarityScore,
    rarestItems: sortedByRarity.slice(0, 10),
    mostCommonItems: sortedByRarity.slice(-10).reverse(),
    fewestHaves: sortedByFewestHaves.slice(0, 10),
    mostWanted: sortedByMostWanted.slice(0, 10),
    mostCollectible: sortedByCollectibility.slice(0, 10),
  };
}
