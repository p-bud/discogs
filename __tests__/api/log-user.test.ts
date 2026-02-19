import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeRequest } from '../helpers/request';

// Mock next/headers
vi.mock('next/headers', () => ({
  headers: vi.fn(() => ({ get: vi.fn().mockReturnValue('') })),
  cookies: vi.fn(() => ({ get: vi.fn() })),
}));

// Mock supabase module
const mockInsert = vi.fn().mockResolvedValue({ error: null });
const mockFrom = vi.fn(() => ({ insert: mockInsert }));
const mockSupabaseClient = { from: mockFrom };

vi.mock('@/app/utils/supabase', () => ({
  getSupabaseClient: vi.fn(() => mockSupabaseClient),
  missingSupabaseVars: vi.fn(() => []),
}));

const { POST } = await import('@/app/api/log-user/route');
import { getSupabaseClient } from '@/app/utils/supabase';

const BASE_URL = 'http://localhost/api/log-user';

describe('POST /api/log-user', () => {
  beforeEach(() => {
    vi.mocked(getSupabaseClient).mockReturnValue(mockSupabaseClient as any);
    mockInsert.mockResolvedValue({ error: null });
  });

  it('valid body → 200 success', async () => {
    const req = makeRequest('POST', BASE_URL, { username: 'user123', collectionSize: 100 });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('username with dots/hyphens/underscores → accepted', async () => {
    const req = makeRequest('POST', BASE_URL, { username: 'user.name-with_chars', collectionSize: 50 });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
  });

  it('username with space → 400', async () => {
    const req = makeRequest('POST', BASE_URL, { username: 'user name', collectionSize: 50 });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('username with @ → 400', async () => {
    const req = makeRequest('POST', BASE_URL, { username: 'user@name', collectionSize: 50 });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('empty username → 400', async () => {
    const req = makeRequest('POST', BASE_URL, { username: '', collectionSize: 50 });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('101-char username → 400', async () => {
    const req = makeRequest('POST', BASE_URL, { username: 'a'.repeat(101), collectionSize: 50 });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('collectionSize: -1 → 400', async () => {
    const req = makeRequest('POST', BASE_URL, { username: 'user123', collectionSize: -1 });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('collectionSize: 1_000_001 → 400', async () => {
    const req = makeRequest('POST', BASE_URL, { username: 'user123', collectionSize: 1_000_001 });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('collectionSize: null → accepted (200)', async () => {
    const req = makeRequest('POST', BASE_URL, { username: 'user123', collectionSize: null });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
  });

  it('malformed JSON → 400', async () => {
    const req = new (await import('next/server')).NextRequest(BASE_URL, {
      method: 'POST',
      body: 'not-json{',
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/[Ii]nvalid JSON/);
  });

  it('Supabase client null (env vars unset) → 503', async () => {
    vi.mocked(getSupabaseClient).mockReturnValue(null);
    const req = makeRequest('POST', BASE_URL, { username: 'user123', collectionSize: 10 });
    const res = await POST(req as any);
    expect(res.status).toBe(503);
  });
});
