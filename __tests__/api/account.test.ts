import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeRequest } from '../helpers/request';

// ── Supabase admin client mock ───────────────────────────────────────────────

const mockSelectProfile = vi.fn();
const mockUpdateProfile = vi.fn().mockResolvedValue({ error: null });
const mockDeleteLeaderboard = vi.fn().mockResolvedValue({ error: null });
const mockDeleteCollection = vi.fn().mockResolvedValue({ error: null });
const mockDeleteUser = vi.fn().mockResolvedValue({ error: null });

// Chainable builder for SELECT queries
function makeSelectChain(mockFn: ReturnType<typeof vi.fn>) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({ single: mockFn })),
    })),
  };
}

// Chainable builder for UPDATE queries
function makeUpdateChain(mockFn: ReturnType<typeof vi.fn>) {
  return {
    update: vi.fn(() => ({
      eq: vi.fn(() => mockFn()),
    })),
  };
}

// Chainable builder for DELETE queries
function makeDeleteChain(mockFn: ReturnType<typeof vi.fn>) {
  return {
    delete: vi.fn(() => ({
      eq: vi.fn(() => mockFn()),
    })),
  };
}

const mockAdminClient = {
  from: vi.fn((table: string) => {
    if (table === 'user_profiles') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ single: mockSelectProfile })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => mockUpdateProfile()),
        })),
        delete: vi.fn(() => ({
          eq: vi.fn(() => ({ error: null })),
        })),
      };
    }
    if (table === 'leaderboard_entries') {
      return {
        update: vi.fn(() => ({
          eq: vi.fn(() => ({ error: null })),
        })),
        delete: vi.fn(() => ({
          eq: vi.fn(() => mockDeleteLeaderboard()),
        })),
      };
    }
    if (table === 'user_collection_cache') {
      return {
        delete: vi.fn(() => ({
          eq: vi.fn(() => mockDeleteCollection()),
        })),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ data: [], error: null })),
        })),
      };
    }
    return {};
  }),
  auth: {
    admin: {
      deleteUser: mockDeleteUser,
    },
  },
};

vi.mock('@/app/utils/supabase', () => ({
  getSupabaseClient: vi.fn(() => mockAdminClient),
}));

// ── Supabase server client mock ──────────────────────────────────────────────

const mockGetUser = vi.fn();

vi.mock('@/app/utils/supabase-server', () => ({
  createSupabaseServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}));

import { GET, PATCH, DELETE } from '@/app/api/account/route';

const BASE_URL = 'http://localhost/api/account';

const SAMPLE_USER = { id: 'user-uuid-123', email: 'test@example.com', created_at: '2025-01-01T00:00:00Z' };

const SAMPLE_PROFILE = {
  discogs_username: 'testuser',
  display_name: null,
  leaderboard_opt_in: false,
  show_discogs_link: true,
  created_at: '2025-01-01T00:00:00Z',
};

// ── GET /api/account ─────────────────────────────────────────────────────────

describe('GET /api/account', () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: SAMPLE_USER } });
    mockSelectProfile.mockResolvedValue({ data: SAMPLE_PROFILE, error: null });
  });

  it('authenticated user → 200 with profile data', async () => {
    const req = makeRequest('GET', BASE_URL);
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.email).toBe('test@example.com');
    expect(body.discogs_username).toBe('testuser');
    expect(body.leaderboard_opt_in).toBe(false);
  });

  it('no session → 401', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const req = makeRequest('GET', BASE_URL);
    const res = await GET(req as any);
    expect(res.status).toBe(401);
  });
});

// ── PATCH /api/account ───────────────────────────────────────────────────────

describe('PATCH /api/account', () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: SAMPLE_USER } });
    mockUpdateProfile.mockResolvedValue({ error: null });
  });

  it('no session → 401', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const req = makeRequest('PATCH', BASE_URL, { display_name: 'newname' });
    const res = await PATCH(req as any);
    expect(res.status).toBe(401);
  });

  it('valid display_name → 200', async () => {
    const req = makeRequest('PATCH', BASE_URL, { display_name: 'vinyl_fan' });
    const res = await PATCH(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('display_name too short → 422', async () => {
    const req = makeRequest('PATCH', BASE_URL, { display_name: 'ab' });
    const res = await PATCH(req as any);
    expect(res.status).toBe(422);
  });

  it('display_name too long → 422', async () => {
    const req = makeRequest('PATCH', BASE_URL, { display_name: 'a'.repeat(31) });
    const res = await PATCH(req as any);
    expect(res.status).toBe(422);
  });

  it('display_name with invalid chars → 422', async () => {
    const req = makeRequest('PATCH', BASE_URL, { display_name: 'bad name!' });
    const res = await PATCH(req as any);
    expect(res.status).toBe(422);
  });

  it('display_name null (clear) → 200', async () => {
    const req = makeRequest('PATCH', BASE_URL, { display_name: null });
    const res = await PATCH(req as any);
    expect(res.status).toBe(200);
  });

  it('PG unique violation (23505) → 409', async () => {
    mockUpdateProfile.mockResolvedValue({ error: { code: '23505', message: 'duplicate' } });
    const req = makeRequest('PATCH', BASE_URL, { display_name: 'taken_name' });
    const res = await PATCH(req as any);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/already taken/i);
  });

  it('PG check constraint (23514) → 422', async () => {
    mockUpdateProfile.mockResolvedValue({ error: { code: '23514', message: 'check constraint' } });
    const req = makeRequest('PATCH', BASE_URL, { display_name: 'ok_name' });
    const res = await PATCH(req as any);
    expect(res.status).toBe(422);
  });

  it('toggle leaderboard_opt_in → 200', async () => {
    const req = makeRequest('PATCH', BASE_URL, { leaderboard_opt_in: true });
    const res = await PATCH(req as any);
    expect(res.status).toBe(200);
  });

  it('toggle show_discogs_link → 200', async () => {
    const req = makeRequest('PATCH', BASE_URL, { show_discogs_link: false });
    const res = await PATCH(req as any);
    expect(res.status).toBe(200);
  });

  it('empty body → 400', async () => {
    const req = makeRequest('PATCH', BASE_URL, {});
    const res = await PATCH(req as any);
    expect(res.status).toBe(400);
  });
});

// ── DELETE /api/account ──────────────────────────────────────────────────────

describe('DELETE /api/account', () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: SAMPLE_USER } });
    mockSelectProfile.mockResolvedValue({ data: SAMPLE_PROFILE, error: null });
    mockDeleteLeaderboard.mockResolvedValue({ error: null });
    mockDeleteCollection.mockResolvedValue({ error: null });
    mockDeleteUser.mockResolvedValue({ error: null });
  });

  it('no session → 401', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const req = makeRequest('DELETE', BASE_URL, { confirm: 'delete my account' });
    const res = await DELETE(req as any);
    expect(res.status).toBe(401);
  });

  it('wrong confirmation text → 400', async () => {
    const req = makeRequest('DELETE', BASE_URL, { confirm: 'yes delete it' });
    const res = await DELETE(req as any);
    expect(res.status).toBe(400);
  });

  it('correct confirmation → 200 and deletes user', async () => {
    const req = makeRequest('DELETE', BASE_URL, { confirm: 'delete my account' });
    const res = await DELETE(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mockDeleteUser).toHaveBeenCalledWith('user-uuid-123');
  });

  it('auth.admin.deleteUser error → 500', async () => {
    mockDeleteUser.mockResolvedValue({ error: { message: 'delete failed' } });
    const req = makeRequest('DELETE', BASE_URL, { confirm: 'delete my account' });
    const res = await DELETE(req as any);
    expect(res.status).toBe(500);
  });
});
