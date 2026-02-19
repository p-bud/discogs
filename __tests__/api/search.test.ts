import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeRequest } from '../helpers/request';

// Mock the discogs utils barrel
const mockSearchDiscogs = vi.fn();
const mockSearchDatabaseWithRarity = vi.fn();

vi.mock('@/app/utils/discogs', () => ({
  searchDiscogs: mockSearchDiscogs,
  searchDatabaseWithRarity: mockSearchDatabaseWithRarity,
}));

// Also mock the relative import path used in the route
vi.mock('@/app/api/search/../../utils/discogs', () => ({
  searchDiscogs: mockSearchDiscogs,
  searchDatabaseWithRarity: mockSearchDatabaseWithRarity,
}));

const { POST } = await import('@/app/api/search/route');

const BASE_URL = 'http://localhost/api/search';

const SAMPLE_RESULT = {
  id: 'r1',
  title: 'Test Album',
  artist: 'Test Artist',
  genre: 'Rock',
  style: 'Post-Punk',
  format: 'Vinyl',
  country: 'UK',
  year: 1980,
  coverImage: '',
  rarityScore: 0.5,
};

const SAMPLE_WITH_RARITY = { ...SAMPLE_RESULT, rarityScore: 0.5 };

describe('POST /api/search', () => {
  beforeEach(() => {
    mockSearchDiscogs.mockReset();
    mockSearchDatabaseWithRarity.mockReset();
    // Default: return results
    mockSearchDiscogs.mockResolvedValue([SAMPLE_RESULT]);
    mockSearchDatabaseWithRarity.mockResolvedValue([SAMPLE_WITH_RARITY]);
  });

  it('valid body → calls searchDiscogs and returns results', async () => {
    const req = makeRequest('POST', BASE_URL, { genre: 'Rock' });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.results).toHaveLength(1);
    expect(mockSearchDiscogs).toHaveBeenCalledOnce();
  });

  it('sortByRarity: true → calls searchDatabaseWithRarity', async () => {
    const req = makeRequest('POST', BASE_URL, { genre: 'Rock', sortByRarity: true });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    expect(mockSearchDatabaseWithRarity).toHaveBeenCalled();
  });

  it('malformed JSON → 400', async () => {
    const req = new (await import('next/server')).NextRequest(BASE_URL, {
      method: 'POST',
      body: '{invalid}',
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('genre > 100 chars → 400', async () => {
    const req = makeRequest('POST', BASE_URL, { genre: 'g'.repeat(101) });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('yearMin: 1899 → 400', async () => {
    const req = makeRequest('POST', BASE_URL, { yearMin: 1899 });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('yearMin: 2101 → 400', async () => {
    const req = makeRequest('POST', BASE_URL, { yearMin: 2101 });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('priceMin: -1 → 400', async () => {
    const req = makeRequest('POST', BASE_URL, { priceMin: -1 });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('condition array with 11 items → 400', async () => {
    const req = makeRequest('POST', BASE_URL, { condition: Array(11).fill('VG+') });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('empty primary results → falls back to simplified search (genre only)', async () => {
    mockSearchDiscogs
      .mockResolvedValueOnce([])           // first call: full filters → empty
      .mockResolvedValueOnce([SAMPLE_RESULT]); // second call: simplified → result
    const req = makeRequest('POST', BASE_URL, { genre: 'Jazz', style: 'Modal' });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.simplified).toBe(true);
  });

  it('empty primary AND simplified → falls back to Rock genre search', async () => {
    mockSearchDiscogs
      .mockResolvedValueOnce([])           // full filters → empty
      .mockResolvedValueOnce([])           // simplified → empty
      .mockResolvedValueOnce([SAMPLE_RESULT]); // Rock → result
    const req = makeRequest('POST', BASE_URL, { genre: 'Jazz', style: 'Modal' });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.lastResort).toBe(true);
  });

  it('Discogs 401 → error response with auth hint', async () => {
    const axiosError = Object.assign(new Error('Unauthorized'), {
      isAxiosError: true,
      response: { status: 401, data: { message: 'Unauthorized' } },
    });
    mockSearchDiscogs.mockRejectedValue(axiosError);
    const req = makeRequest('POST', BASE_URL, { genre: 'Rock' });
    const res = await POST(req as any);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/401|[Aa]uth/);
  });

  it('Discogs 429 → error response with rate-limit hint', async () => {
    const axiosError = Object.assign(new Error('Too Many Requests'), {
      isAxiosError: true,
      response: { status: 429, data: { message: 'Rate limit exceeded' } },
    });
    mockSearchDiscogs.mockRejectedValue(axiosError);
    const req = makeRequest('POST', BASE_URL, { genre: 'Rock' });
    const res = await POST(req as any);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/429|[Rr]ate/);
  });
});
