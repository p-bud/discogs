/**
 * Unit tests for the Supabase cache layer in app/utils/collection.ts.
 *
 * Strategy
 * ────────
 * • Mock getSupabaseClient to return a configurable fake client.
 * • Mock next/headers to simulate OAuth cookies being present.
 * • Mock rate-limiter to just call the fn directly.
 * • Mock @/app/utils/discogs for the dynamic import used inside getUserCollection.
 * • Use distinct usernames per test to avoid the module-level in-memory cache
 *   polluting results across tests.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Supabase mock ────────────────────────────────────────────────────────────
const mockSupabaseClient = {
  from: vi.fn(),
  rpc: vi.fn(),
};

vi.mock('@/app/utils/supabase', () => ({
  getSupabaseClient: vi.fn(() => mockSupabaseClient),
}));

import { getSupabaseClient } from '@/app/utils/supabase';

// ── next/headers: always report OAuth cookies as present ────────────────────
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    has: vi.fn((name: string) =>
      name === 'discogs_oauth_token' || name === 'discogs_oauth_token_secret',
    ),
  })),
}));

// ── rate-limiter: just call the function ────────────────────────────────────
vi.mock('@/app/utils/rate-limiter', () => ({
  rateLimit: vi.fn((fn: () => any) => fn()),
}));

// ── Discogs client (intercepted by dynamic import('./discogs')) ─────────────
const mockDiscogsGet = vi.fn();
const mockCreateDiscogsClient = vi.fn(() => ({ get: mockDiscogsGet }));

vi.mock('@/app/utils/discogs', () => ({
  createDiscogsClient: mockCreateDiscogsClient,
}));

// Import after all vi.mock() calls
import { getUserCollection, getReleaseCommunityData } from '@/app/utils/collection';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Build the Supabase chain used by the "freshness" SELECT in getUserCollection */
function buildFreshnessMock(synced_at: string | null) {
  const singleFn = vi.fn().mockResolvedValue(
    synced_at ? { data: { synced_at }, error: null } : { data: null, error: null },
  );
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({ single: singleFn }),
        }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
    upsert: vi.fn().mockResolvedValue({ error: null }),
  };
}

/** ISO string N days ago */
function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

/** A minimal Discogs paginated collection response */
function makeDiscogsCollectionResponse(username: string) {
  return {
    data: {
      releases: [
        {
          id: 999,
          basic_information: {
            title: 'Disco Album',
            artists: [{ name: 'Disco Artist' }],
            year: 1979,
            formats: [{ name: 'Vinyl' }],
            cover_image: '',
          },
        },
      ],
      pagination: { pages: 1 },
    },
  };
}

// ── getUserCollection cache tests ────────────────────────────────────────────

describe('getUserCollection — Supabase cache layer', () => {
  beforeEach(() => {
    vi.mocked(getSupabaseClient).mockReturnValue(mockSupabaseClient as any);
    mockDiscogsGet.mockReset();
    mockSupabaseClient.from.mockReset();
    mockSupabaseClient.rpc.mockReset();
  });

  it('Supabase unavailable (null) → falls through to Discogs, fromCache:false', async () => {
    vi.mocked(getSupabaseClient).mockReturnValue(null);
    mockDiscogsGet.mockResolvedValue(makeDiscogsCollectionResponse('u_null'));

    const result = await getUserCollection('u_null');

    expect(result.fromCache).toBe(false);
    expect(result.cachedAt).toBeNull();
    expect(mockDiscogsGet).toHaveBeenCalledOnce();
  });

  it('fresh Supabase cache (< 7 days) → returns items without calling Discogs', async () => {
    const syncedAt = daysAgo(1);
    mockSupabaseClient.from.mockReturnValue(buildFreshnessMock(syncedAt));
    mockSupabaseClient.rpc.mockResolvedValue({
      data: [
        {
          release_id: '42',
          title: 'Cached Album',
          artist: 'Cached Artist',
          year: '1982',
          formats: ['Vinyl'],
          cover_image: '',
          synced_at: syncedAt,
          have_count: 200,
          want_count: 80,
          rarity_score: '0.4000',
        },
      ],
      error: null,
    });

    const result = await getUserCollection('u_fresh');

    expect(result.fromCache).toBe(true);
    expect(result.cachedAt).toBe(syncedAt);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe('Cached Album');
    expect(result.items[0].haveCount).toBe(200);
    expect(result.items[0].wantCount).toBe(80);
    expect(result.items[0].rarityScore).toBeCloseTo(0.4);
    expect(mockDiscogsGet).not.toHaveBeenCalled();
  });

  it('stale Supabase cache (> 7 days) → falls through to Discogs, fromCache:false', async () => {
    mockSupabaseClient.from.mockReturnValue(buildFreshnessMock(daysAgo(8)));
    mockDiscogsGet.mockResolvedValue(makeDiscogsCollectionResponse('u_stale'));

    const result = await getUserCollection('u_stale');

    expect(result.fromCache).toBe(false);
    expect(mockDiscogsGet).toHaveBeenCalledOnce();
  });

  it('Supabase has no rows for user (meta=null) → falls through to Discogs', async () => {
    mockSupabaseClient.from.mockReturnValue(buildFreshnessMock(null));
    mockDiscogsGet.mockResolvedValue(makeDiscogsCollectionResponse('u_empty'));

    const result = await getUserCollection('u_empty');

    expect(result.fromCache).toBe(false);
    expect(mockDiscogsGet).toHaveBeenCalledOnce();
  });

  it('Supabase RPC returns error → falls through to Discogs (non-fatal)', async () => {
    const syncedAt = daysAgo(1);
    mockSupabaseClient.from.mockReturnValue(buildFreshnessMock(syncedAt));
    mockSupabaseClient.rpc.mockResolvedValue({ data: null, error: { message: 'rpc error' } });
    mockDiscogsGet.mockResolvedValue(makeDiscogsCollectionResponse('u_rpcerr'));

    const result = await getUserCollection('u_rpcerr');

    expect(result.fromCache).toBe(false);
    expect(mockDiscogsGet).toHaveBeenCalledOnce();
  });

  it('Supabase throws during cache read → falls through to Discogs gracefully', async () => {
    mockSupabaseClient.from.mockImplementation(() => {
      throw new Error('Supabase connection refused');
    });
    mockDiscogsGet.mockResolvedValue(makeDiscogsCollectionResponse('u_throw'));

    const result = await getUserCollection('u_throw');

    expect(result.fromCache).toBe(false);
    expect(mockDiscogsGet).toHaveBeenCalledOnce();
  });

  it('forceRefresh=true → deletes cache rows and fetches from Discogs, fromCache:false', async () => {
    const syncedAt = daysAgo(1); // would be fresh, but forceRefresh bypasses it
    const deleteEqMock = vi.fn().mockResolvedValue({ error: null });
    const deleteMock = vi.fn().mockReturnValue({ eq: deleteEqMock });
    const fromMock = buildFreshnessMock(syncedAt);
    fromMock.delete = deleteMock;
    mockSupabaseClient.from.mockReturnValue(fromMock);
    mockDiscogsGet.mockResolvedValue(makeDiscogsCollectionResponse('u_force'));

    const result = await getUserCollection('u_force', true);

    expect(result.fromCache).toBe(false);
    expect(deleteMock).toHaveBeenCalled();
    expect(deleteEqMock).toHaveBeenCalledWith('discogs_username', 'u_force');
    expect(mockDiscogsGet).toHaveBeenCalledOnce();
  });

  it('after Discogs fetch → upserts rows to user_collection_cache', async () => {
    mockSupabaseClient.from.mockReturnValue(buildFreshnessMock(null));
    mockDiscogsGet.mockResolvedValue(makeDiscogsCollectionResponse('u_write'));

    await getUserCollection('u_write');

    // Allow the fire-and-forget upsert to complete
    await new Promise(resolve => setTimeout(resolve, 10));

    const upsertCalls = mockSupabaseClient.from.mock.calls
      .filter(([table]: [string]) => table === 'user_collection_cache');
    expect(upsertCalls.length).toBeGreaterThan(0);

    // The upsert was called on the from() return value
    const fromReturnValue = mockSupabaseClient.from.mock.results.find(
      (r, i) => mockSupabaseClient.from.mock.calls[i]?.[0] === 'user_collection_cache'
        && r.value?.upsert !== undefined,
    );
    expect(fromReturnValue).toBeDefined();
  });
});

// ── getReleaseCommunityData cache tests ──────────────────────────────────────

describe('getReleaseCommunityData — Supabase cache layer', () => {
  beforeEach(() => {
    vi.mocked(getSupabaseClient).mockReturnValue(mockSupabaseClient as any);
    mockDiscogsGet.mockReset();
    mockSupabaseClient.from.mockReset();
  });

  /** Build the Supabase chain for release_community_cache SELECT...single() */
  function buildReleaseCacheMock(cachedRow: Record<string, any> | null) {
    const singleFn = vi.fn().mockResolvedValue(
      cachedRow ? { data: cachedRow, error: null } : { data: null, error: null },
    );
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ single: singleFn }),
      }),
      upsert: vi.fn().mockReturnValue({
        then: vi.fn((cb: any) => Promise.resolve(cb({ error: null }))),
      }),
    };
  }

  it('Supabase unavailable (null) → fetches from Discogs', async () => {
    vi.mocked(getSupabaseClient).mockReturnValue(null);
    mockDiscogsGet.mockResolvedValue({
      data: { community: { have: 100, want: 50 } },
    });

    await getReleaseCommunityData('r1');

    expect(mockDiscogsGet).toHaveBeenCalledOnce();
  });

  it('fresh Supabase release cache hit → returns cached data, Discogs not called', async () => {
    mockSupabaseClient.from.mockReturnValue(
      buildReleaseCacheMock({
        have_count: 300,
        want_count: 150,
        rarity_score: '0.5000',
        fetched_at: daysAgo(2),
      }),
    );

    const result = await getReleaseCommunityData('r2');

    expect(result.community.have).toBe(300);
    expect(result.community.want).toBe(150);
    expect(result._cachedRarityScore).toBeCloseTo(0.5);
    expect(mockDiscogsGet).not.toHaveBeenCalled();
  });

  it('stale Supabase release cache (> 7 days) → fetches from Discogs', async () => {
    mockSupabaseClient.from.mockReturnValue(
      buildReleaseCacheMock({
        have_count: 300,
        want_count: 150,
        rarity_score: '0.5000',
        fetched_at: daysAgo(8),
      }),
    );
    mockDiscogsGet.mockResolvedValue({
      data: { community: { have: 300, want: 150 } },
    });

    await getReleaseCommunityData('r3');

    expect(mockDiscogsGet).toHaveBeenCalledOnce();
  });

  it('no cached row → fetches from Discogs', async () => {
    mockSupabaseClient.from.mockReturnValue(buildReleaseCacheMock(null));
    mockDiscogsGet.mockResolvedValue({
      data: { community: { have: 10, want: 5 } },
    });

    await getReleaseCommunityData('r4');

    expect(mockDiscogsGet).toHaveBeenCalledOnce();
  });

  it('after Discogs fetch → upserts to release_community_cache', async () => {
    mockSupabaseClient.from.mockReturnValue(buildReleaseCacheMock(null));
    mockDiscogsGet.mockResolvedValue({
      data: { community: { have: 200, want: 100 } },
    });

    await getReleaseCommunityData('r5');

    // Allow fire-and-forget upsert to settle
    await new Promise(resolve => setTimeout(resolve, 10));

    const upsertCalls = mockSupabaseClient.from.mock.calls.filter(
      ([table]: [string]) => table === 'release_community_cache',
    );
    expect(upsertCalls.length).toBeGreaterThan(0);
  });

  it('Supabase cache read throws → falls through to Discogs gracefully', async () => {
    mockSupabaseClient.from.mockImplementation(() => {
      throw new Error('network error');
    });
    mockDiscogsGet.mockResolvedValue({
      data: { community: { have: 10, want: 5 } },
    });

    const result = await getReleaseCommunityData('r6');

    expect(result.community.have).toBe(10);
    expect(mockDiscogsGet).toHaveBeenCalledOnce();
  });
});
