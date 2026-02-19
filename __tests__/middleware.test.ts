import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock @supabase/ssr before importing middleware
const mockGetUser = vi.fn().mockResolvedValue({ data: { user: null } });
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}));

// Import middleware after mock is in place
const { middleware } = await import('@/middleware');

function makeReq(url: string, cookies: Record<string, string> = {}): NextRequest {
  const req = new NextRequest(`http://localhost${url}`);
  Object.entries(cookies).forEach(([k, v]) => req.cookies.set(k, v));
  return req;
}

const BOTH_COOKIES = {
  discogs_oauth_token: 'tok',
  discogs_oauth_token_secret: 'sec',
};

describe('middleware — Discogs OAuth guard', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
  });

  it('/api/collection with both cookies → passes through (not 401)', async () => {
    const res = await middleware(makeReq('/api/collection', BOTH_COOKIES));
    expect(res.status).not.toBe(401);
  });

  it('/api/collection missing discogs_oauth_token → 401', async () => {
    const res = await middleware(makeReq('/api/collection', { discogs_oauth_token_secret: 'sec' }));
    expect(res.status).toBe(401);
  });

  it('/api/collection missing discogs_oauth_token_secret → 401', async () => {
    const res = await middleware(makeReq('/api/collection', { discogs_oauth_token: 'tok' }));
    expect(res.status).toBe(401);
  });

  it('/api/collection with no cookies → 401', async () => {
    const res = await middleware(makeReq('/api/collection'));
    expect(res.status).toBe(401);
  });

  it('/api/release/123 without cookies → 401', async () => {
    const res = await middleware(makeReq('/api/release/123'));
    expect(res.status).toBe(401);
  });

  it('/api/release/123 with both cookies → passes through', async () => {
    const res = await middleware(makeReq('/api/release/123', BOTH_COOKIES));
    expect(res.status).not.toBe(401);
  });

  it('/api/search without cookies → passes through (unprotected)', async () => {
    const res = await middleware(makeReq('/api/search'));
    expect(res.status).not.toBe(401);
  });

  it('/ without cookies → passes through', async () => {
    const res = await middleware(makeReq('/'));
    expect(res.status).not.toBe(401);
  });

  it('401 response body contains authentication error message', async () => {
    const res = await middleware(makeReq('/api/collection'));
    const body = await res.json();
    expect(body.error).toMatch(/[Aa]uthentication/);
  });
});
