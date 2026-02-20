import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeRequest } from '../helpers/request';

// Mock Supabase admin client
const mockUpsertProfile = vi.fn().mockResolvedValue({ error: null });
const mockUpsertLeaderboard = vi.fn().mockResolvedValue({ error: null });
const mockSelectProfile = vi.fn();
const mockSelectLeaderboard = vi.fn();

const mockAdminFrom = vi.fn((table: string) => {
  if (table === 'user_profiles') {
    return {
      select: vi.fn(() => ({ eq: vi.fn(() => ({ single: mockSelectProfile })) })),
      upsert: mockUpsertProfile,
    };
  }
  if (table === 'leaderboard_entries') {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({ limit: mockSelectLeaderboard })),
        })),
      })),
      upsert: mockUpsertLeaderboard,
    };
  }
  return {};
});

const mockAdminClient = { from: mockAdminFrom };

vi.mock('@/app/utils/supabase', () => ({
  getSupabaseClient: vi.fn(() => mockAdminClient),
}));

// Mock Supabase server client (for session auth)
const mockGetUser = vi.fn();

vi.mock('@/app/utils/supabase-server', () => ({
  createSupabaseServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}));

// Mock axios for Discogs identity calls
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    isAxiosError: vi.fn(),
  },
}));

import axios from 'axios';
import { getSupabaseClient } from '@/app/utils/supabase';

const { GET, POST } = await import('@/app/api/leaderboard/route');

const BASE_URL = 'http://localhost/api/leaderboard';

const SAMPLE_ENTRIES = [
  {
    discogs_username: 'user_a',
    avg_rarity_score: 0.9,
    rarest_item_score: 0.95,
    rarest_item_title: 'Album A',
    rarest_item_artist: 'Artist A',
    collection_size: 500,
    analyzed_at: new Date().toISOString(),
  },
  {
    discogs_username: 'user_b',
    avg_rarity_score: 0.7,
    rarest_item_score: 0.8,
    rarest_item_title: 'Album B',
    rarest_item_artist: 'Artist B',
    collection_size: 300,
    analyzed_at: new Date().toISOString(),
  },
];

describe('GET /api/leaderboard', () => {
  beforeEach(() => {
    vi.mocked(getSupabaseClient).mockReturnValue(mockAdminClient as any);
    mockSelectLeaderboard.mockResolvedValue({ data: SAMPLE_ENTRIES, error: null });
  });

  it('?rank=avg_rarity → returns entries', async () => {
    const req = makeRequest('GET', `${BASE_URL}?rank=avg_rarity`);
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.entries).toHaveLength(2);
    expect(body.rank).toBe('avg_rarity');
  });

  it('?rank=rarest_item → returns entries with correct rank', async () => {
    const req = makeRequest('GET', `${BASE_URL}?rank=rarest_item`);
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rank).toBe('rarest_item');
  });

  it('?rank=collection → returns entries with correct rank', async () => {
    const req = makeRequest('GET', `${BASE_URL}?rank=collection`);
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rank).toBe('collection');
  });

  it('no rank param → defaults to avg_rarity', async () => {
    const req = makeRequest('GET', BASE_URL);
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rank).toBe('avg_rarity');
  });

  it('?rank=invalid → 400', async () => {
    const req = makeRequest('GET', `${BASE_URL}?rank=invalid`);
    const res = await GET(req as any);
    expect(res.status).toBe(400);
  });

  it('Supabase client unavailable → 503', async () => {
    vi.mocked(getSupabaseClient).mockReturnValue(null);
    const req = makeRequest('GET', BASE_URL);
    const res = await GET(req as any);
    expect(res.status).toBe(503);
  });
});

describe('POST /api/leaderboard', () => {
  const VALID_BODY = {
    avg_rarity_score: 0.75,
    rarest_item_score: 0.9,
    rarest_item_title: 'Some Album',
    rarest_item_artist: 'Some Artist',
    collection_size: 250,
  };

  beforeEach(() => {
    vi.mocked(getSupabaseClient).mockReturnValue(mockAdminClient as any);
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-uuid-123' } } });
    mockSelectProfile.mockResolvedValue({
      data: { discogs_username: 'testuser', display_name: null, leaderboard_opt_in: true, show_discogs_link: true },
      error: null,
    });
    mockUpsertLeaderboard.mockResolvedValue({ error: null });
  });

  it('no session → 401', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const req = makeRequest('POST', BASE_URL, VALID_BODY);
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });

  it('valid session + valid body + linked profile → 200 success', async () => {
    const req = makeRequest('POST', BASE_URL, VALID_BODY);
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('valid session + negative score → 422', async () => {
    const req = makeRequest('POST', BASE_URL, { ...VALID_BODY, avg_rarity_score: -1 });
    const res = await POST(req as any);
    expect(res.status).toBe(422);
  });

  it('valid session + rarest_item_title > 500 chars → 422', async () => {
    const req = makeRequest('POST', BASE_URL, { ...VALID_BODY, rarest_item_title: 'x'.repeat(501) });
    const res = await POST(req as any);
    expect(res.status).toBe(422);
  });

  it('valid session but no Discogs username (no profile, no cookies) → 403', async () => {
    mockSelectProfile.mockResolvedValue({ data: null, error: null });
    vi.mocked(axios.get).mockRejectedValue(new Error('no cookies'));
    const req = makeRequest('POST', BASE_URL, VALID_BODY);
    const res = await POST(req as any);
    expect(res.status).toBe(403);
  });

  it('leaderboard_opt_in: false → 403', async () => {
    mockSelectProfile.mockResolvedValue({
      data: { discogs_username: 'testuser', display_name: null, leaderboard_opt_in: false, show_discogs_link: true },
      error: null,
    });
    const req = makeRequest('POST', BASE_URL, VALID_BODY);
    const res = await POST(req as any);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/account settings/);
  });

  it('no profile (no opt-in) + Discogs cookies → 403 (must opt in first)', async () => {
    // Profile is null → opt-in check fails before reaching the auto-link logic.
    mockSelectProfile.mockResolvedValue({ data: null, error: null });
    vi.mocked(axios.get).mockResolvedValue({ data: { username: 'autolinked_user' } });
    const req = makeRequest('POST', BASE_URL, VALID_BODY, {
      discogs_oauth_token: 'tok',
      discogs_oauth_token_secret: 'sec',
    });
    const res = await POST(req as any);
    expect(res.status).toBe(403);
  });

  it('Supabase client unavailable → 503', async () => {
    vi.mocked(getSupabaseClient).mockReturnValue(null);
    const req = makeRequest('POST', BASE_URL, VALID_BODY);
    const res = await POST(req as any);
    expect(res.status).toBe(503);
  });
});
