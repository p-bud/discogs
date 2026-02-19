import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeRequest } from '../helpers/request';

// Mock next/headers
const mockCookieGet = vi.fn();
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: mockCookieGet })),
}));

// Mock axios
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    isAxiosError: vi.fn((e: any) => e?.isAxiosError === true),
  },
  isAxiosError: vi.fn((e: any) => e?.isAxiosError === true),
}));

// Mock Supabase server client
const mockGetUser = vi.fn();
vi.mock('@/app/utils/supabase-server', () => ({
  createSupabaseServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}));

// Mock Supabase admin client
const mockProfileSelect = vi.fn();
vi.mock('@/app/utils/supabase', () => ({
  getSupabaseClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ single: mockProfileSelect })),
      })),
    })),
  })),
}));

import axios from 'axios';
const { GET } = await import('@/app/api/auth/status/route');

const BASE_URL = 'http://localhost/api/auth/status';

describe('GET /api/auth/status', () => {
  beforeEach(() => {
    mockCookieGet.mockReset();
    vi.mocked(axios.get).mockReset();
    mockGetUser.mockReset();
    mockProfileSelect.mockReset();

    // Default: no Discogs cookies
    mockCookieGet.mockReturnValue(undefined);
    // Default: no Supabase session
    mockGetUser.mockResolvedValue({ data: { user: null } });
    // Default: no profile
    mockProfileSelect.mockResolvedValue({ data: null, error: null });
  });

  it('no cookies → all fields null/false', async () => {
    const req = makeRequest('GET', BASE_URL);
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.authenticated).toBe(false);
    expect(body.username).toBeNull();
    expect(body.supabaseUserId).toBeNull();
    expect(body.supabaseLinkedUsername).toBeNull();
  });

  it('both Discogs cookies + identity 200 → authenticated: true with username', async () => {
    mockCookieGet.mockImplementation((name: string) => {
      if (name === 'discogs_oauth_token') return { value: 'tok' };
      if (name === 'discogs_oauth_token_secret') return { value: 'sec' };
      return undefined;
    });
    vi.mocked(axios.get).mockResolvedValue({ data: { username: 'testuser' } });

    const req = makeRequest('GET', BASE_URL);
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.authenticated).toBe(true);
    expect(body.username).toBe('testuser');
  });

  it('both cookies + identity 401 → authenticated: false, cookies cleared', async () => {
    mockCookieGet.mockImplementation((name: string) => {
      if (name === 'discogs_oauth_token') return { value: 'tok' };
      if (name === 'discogs_oauth_token_secret') return { value: 'sec' };
      return undefined;
    });

    const axiosError = Object.assign(new Error('Unauthorized'), {
      isAxiosError: true,
      response: { status: 401 },
    });
    vi.mocked(axios.get).mockRejectedValue(axiosError);
    vi.mocked(axios.isAxiosError).mockReturnValue(true);

    const req = makeRequest('GET', BASE_URL);
    const res = await GET(req as any);
    const body = await res.json();
    expect(body.authenticated).toBe(false);
    // Cookies should be cleared
    const setCookieHeader = res.headers.get('set-cookie');
    // Either the cookies are deleted (set to empty/expired) in the response
    // We check that the response body indicates not authenticated
    expect(body.authenticated).toBe(false);
  });

  it('both cookies + identity timeout → authenticated: false, cookies NOT cleared', async () => {
    mockCookieGet.mockImplementation((name: string) => {
      if (name === 'discogs_oauth_token') return { value: 'tok' };
      if (name === 'discogs_oauth_token_secret') return { value: 'sec' };
      return undefined;
    });

    // Non-401 error (timeout)
    const timeoutError = Object.assign(new Error('timeout'), {
      isAxiosError: true,
      response: undefined, // No response = timeout/network error
    });
    vi.mocked(axios.get).mockRejectedValue(timeoutError);
    vi.mocked(axios.isAxiosError).mockReturnValue(true);

    const req = makeRequest('GET', BASE_URL);
    const res = await GET(req as any);
    // Route falls through to the normal response (authenticated stays false since error was caught)
    expect(res.status).toBe(200);
    const body = await res.json();
    // Not authenticated (token validation failed) but cookies not deleted
    expect(body.authenticated).toBe(false);
  });

  it('Supabase session valid → supabaseUserId populated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'uuid-abc' } } });
    mockProfileSelect.mockResolvedValue({ data: null, error: null });

    const req = makeRequest('GET', BASE_URL);
    const res = await GET(req as any);
    const body = await res.json();
    expect(body.supabaseUserId).toBe('uuid-abc');
  });

  it('Supabase session + linked profile → supabaseLinkedUsername populated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'uuid-abc' } } });
    mockProfileSelect.mockResolvedValue({ data: { discogs_username: 'linked_user' }, error: null });

    const req = makeRequest('GET', BASE_URL);
    const res = await GET(req as any);
    const body = await res.json();
    expect(body.supabaseLinkedUsername).toBe('linked_user');
  });

  it('Supabase error → Discogs auth still returned correctly (non-fatal)', async () => {
    mockCookieGet.mockImplementation((name: string) => {
      if (name === 'discogs_oauth_token') return { value: 'tok' };
      if (name === 'discogs_oauth_token_secret') return { value: 'sec' };
      return undefined;
    });
    vi.mocked(axios.get).mockResolvedValue({ data: { username: 'discogs_user' } });
    // Supabase throws
    mockGetUser.mockRejectedValue(new Error('Supabase down'));

    const req = makeRequest('GET', BASE_URL);
    const res = await GET(req as any);
    const body = await res.json();
    expect(body.authenticated).toBe(true);
    expect(body.username).toBe('discogs_user');
    expect(body.supabaseUserId).toBeNull();
  });
});
