import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeRequest } from '../helpers/request';

// Mock getUserCollection — isolates the route from all Discogs/Supabase internals
const mockGetUserCollection = vi.fn();

vi.mock('@/app/utils/collection', () => ({
  getUserCollection: mockGetUserCollection,
}));

const { GET } = await import('@/app/api/collection/route');

const BASE_URL = 'http://localhost/api/collection';

const FRESH_RESULT = {
  items: [
    {
      id: '123',
      title: 'Test Album',
      artist: 'Test Artist',
      year: '1990',
      format: ['Vinyl'],
      coverImage: '',
      haveCount: 50,
      wantCount: 100,
      rarityScore: 2.0,
    },
  ],
  hitPageCap: false,
  fromCache: false,
  cachedAt: null,
};

describe('GET /api/collection', () => {
  beforeEach(() => {
    mockGetUserCollection.mockReset();
    mockGetUserCollection.mockResolvedValue(FRESH_RESULT);
  });

  it('missing username → 400', async () => {
    const req = makeRequest('GET', BASE_URL);
    const res = await GET(req as any);
    expect(res.status).toBe(400);
  });

  it('empty username → 400', async () => {
    const req = makeRequest('GET', `${BASE_URL}?username=`);
    const res = await GET(req as any);
    expect(res.status).toBe(400);
  });

  it('username with invalid chars → 400', async () => {
    const req = makeRequest('GET', `${BASE_URL}?username=bad%20name!`);
    const res = await GET(req as any);
    expect(res.status).toBe(400);
  });

  it('valid username → 200 with releases, stats, limitedResults, fromCache, cachedAt', async () => {
    const req = makeRequest('GET', `${BASE_URL}?username=testuser`);
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.releases).toHaveLength(1);
    expect(body.limitedResults).toBe(false);
    expect(body.fromCache).toBe(false);
    expect(body.cachedAt).toBeNull();
    expect(body.stats).toBeDefined();
  });

  it('no forceRefresh param → getUserCollection called with forceRefresh=false', async () => {
    const req = makeRequest('GET', `${BASE_URL}?username=testuser`);
    await GET(req as any);
    expect(mockGetUserCollection).toHaveBeenCalledWith('testuser', false);
  });

  it('forceRefresh=true → getUserCollection called with forceRefresh=true', async () => {
    const req = makeRequest('GET', `${BASE_URL}?username=testuser&forceRefresh=true`);
    await GET(req as any);
    expect(mockGetUserCollection).toHaveBeenCalledWith('testuser', true);
  });

  it('forceRefresh=false → getUserCollection called with forceRefresh=false', async () => {
    const req = makeRequest('GET', `${BASE_URL}?username=testuser&forceRefresh=false`);
    await GET(req as any);
    expect(mockGetUserCollection).toHaveBeenCalledWith('testuser', false);
  });

  it('getUserCollection returns fromCache:true → response propagates fromCache and cachedAt', async () => {
    const cachedAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    mockGetUserCollection.mockResolvedValue({
      ...FRESH_RESULT,
      fromCache: true,
      cachedAt,
    });
    const req = makeRequest('GET', `${BASE_URL}?username=testuser`);
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.fromCache).toBe(true);
    expect(body.cachedAt).toBe(cachedAt);
  });

  it('hitPageCap:true → limitedResults:true in response', async () => {
    mockGetUserCollection.mockResolvedValue({ ...FRESH_RESULT, hitPageCap: true });
    const req = makeRequest('GET', `${BASE_URL}?username=testuser`);
    const res = await GET(req as any);
    const body = await res.json();
    expect(body.limitedResults).toBe(true);
  });

  it('getUserCollection throws auth error → error response', async () => {
    mockGetUserCollection.mockRejectedValue(new Error('Authentication required to access collection'));
    const req = makeRequest('GET', `${BASE_URL}?username=testuser`);
    const res = await GET(req as any);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('getUserCollection throws rate limit error → 429', async () => {
    const err = Object.assign(new Error('rate limit hit'), {
      response: { status: 429, headers: { 'retry-after': '60' } },
    });
    mockGetUserCollection.mockRejectedValue(err);
    const req = makeRequest('GET', `${BASE_URL}?username=testuser`);
    const res = await GET(req as any);
    expect(res.status).toBe(429);
  });
});
