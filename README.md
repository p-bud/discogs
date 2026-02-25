# Raerz — Vinyl Collection Analyzer

A tool for Discogs collectors to analyze the rarity of their record collections, discover their rarest items, compete on a public leaderboard, and share their Wrapped stats.

**Live site:** [raerz.fyi](https://raerz.fyi)

---

## Features

- **Landing Page** — Hero + feature card overview for first-time visitors
- **Collection Analysis** — Analyze any Discogs collection ranked by rarity, want count, and collectibility
- **Rarity Scoring** — Each record is scored as `wantCount / haveCount`. Higher ratio = more people want it than own it
- **Wrapped** — Year-in-review stats (year picker, genre/format/decade breakdown, rarest addition). Shareable via public URL
- **Leaderboard** — Opt-in and compete across three categories: average rarity, rarest single item, and collection size
- **7-Day Collection Cache** — Collections cached in Supabase; returning users load instantly without re-hitting Discogs
- **Account Management** — Display name, leaderboard opt-in, data export (GDPR Art. 15), account deletion

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Auth (Discogs) | OAuth 1.0a — HMAC-SHA1 via Node.js `crypto` |
| Auth (users) | Supabase email/password |
| Database | Supabase (Postgres) |
| Deployment | Vercel |
| Tests | Vitest (167 tests) |

---

## Architecture

```
┌─ Pages (Next.js App Router) ────────────────────────────────────────┐
│  /                      Landing page — hero + feature cards         │
│  /collection            Client component — collection analyzer UI   │
│  /wrapped               Client component — authenticated Wrapped    │
│  /wrapped/[username]    Server component (ISR 1h) — public Wrapped  │
│  /leaderboard           Server component (ISR 60s) — top 50         │
│  /account               Client component — account settings         │
│  /about                 Static — explains rarity scoring            │
│  /auth/*                Password reset flow                         │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─ API Routes ────────────────────────────────────────────────────────┐
│  /api/auth               Initiate Discogs OAuth                     │
│  /api/auth/callback      Exchange OAuth verifier for access token   │
│  /api/auth/status        Return current Discogs + Supabase state    │
│  /api/auth/logout        Clear Discogs cookies                      │
│  /api/collection         Fetch collection (Supabase cache → Discogs)│
│  /api/release/[id]       Get have/want counts for a single release  │
│  /api/search             Search Discogs database with filters       │
│  /api/leaderboard        GET top 50 / POST submit stats             │
│  /api/account            GET/PATCH/DELETE account management        │
│  /api/account/export     GDPR Art. 15 data export (JSON)           │
│  /api/genres etc.        Hardcoded metadata, built as static assets │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─ Data Layer ────────────────────────────────────────────────────────┐
│  Supabase                                                           │
│  ├─ user_profiles              Discogs ↔ Supabase user link        │
│  ├─ leaderboard_entries        One row per user, upserted on submit │
│  ├─ user_collection_cache      Per-user releases (7-day TTL)        │
│  └─ release_community_cache    Shared have/want data (7-day TTL)    │
│                                                                     │
│  Discogs API (OAuth 1.0a)                                           │
│  ├─ /users/{u}/collection      Paginated collection fetch           │
│  ├─ /releases/{id}             Community data (have/want counts)    │
│  └─ /database/search           Release search                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Key Flows

### Collection Analysis

1. `/collection` page shows a skeleton loader during auth resolution, then resolves the Discogs username from `/api/auth/status` and passes it directly to the analysis component
2. `GET /api/collection` checks `user_collection_cache` in Supabase (7-day TTL)
   - **Cache hit:** returns enriched items in <200ms — `fromCache: true`
   - **Cache miss:** paginates Discogs API (100 items/page, up to 20 pages / 2,000 items), deduplicates by `release_id`, then writes results to cache (awaited — Vercel cuts off async work after response)
3. Client receives basic items (title, artist, year, format, cover image)
4. When `fromCache: true` items already carry `haveCount`/`wantCount`/`rarityScore` from the Supabase RPC join — stats are calculated immediately without waiting for `useReleaseDetails`
5. `useReleaseDetails` hook fetches have/want counts in batches of 10 via `GET /api/release/[id]` for any items missing community data; skips the 250ms inter-batch delay when no API call was needed
6. User can optionally submit stats to the leaderboard (requires leaderboard opt-in consent)

**Rarity score:** `want / have` (0 if have = 0). A score > 1 means more people want it than own it.

### Wrapped

Authenticated flow (`/wrapped`):
1. `useAuth` resolves the Discogs username
2. `WrappedAnalysis` checks module-level cache then sessionStorage for `wrapped_v1_{username}_{year}`
3. On cache miss: fetches collection via `GET /api/collection`, runs `computeWrappedStats(releases, year)`
4. `useReleaseDetails` enriches rarity scores in the background; on completion a second `computeWrappedStats` pass updates stats and persists both cache layers
5. Year picker pill buttons let the user switch years without re-fetching the collection
6. Share button copies `{APP_URL}/wrapped/{username}` to clipboard

Public Wrapped (`/wrapped/[username]`):
- Server component with `revalidate = 3600` (ISR 1h)
- Reads Supabase cache directly via service-role client
- Calls `get_user_collection_with_community` RPC, maps to `CollectionItem[]`, runs `computeWrappedStats`
- Renders `WrappedView` — same presentational component used by the authenticated page
- If no cache exists for the username: shows a "no data yet" message
- Rarity scores reflect whatever is in `release_community_cache` — note shown if cold

### Discogs OAuth Flow

```
User clicks "Login with Discogs"
  → GET /api/auth
      Generate CSRF nonce → store in httpOnly cookie
      Request temporary token from Discogs
      Redirect user to Discogs authorization page

User approves on Discogs
  → GET /api/auth/callback?oauth_token=...&oauth_verifier=...
      Validate CSRF nonce
      Exchange verifier for access token
      Store access token in httpOnly cookies (30-day TTL)
      If Supabase session active → link Discogs username to user_profiles
```

OAuth tokens are stored as httpOnly cookies (`discogs_oauth_token` + `discogs_oauth_token_secret`) and used server-side to sign every Discogs API request with HMAC-SHA1.

### Leaderboard Submission

Requires both a Supabase account and a connected Discogs account, plus explicit `leaderboard_opt_in` consent.

```
POST /api/leaderboard
  Validate Supabase session
  Check leaderboard_opt_in on user_profiles → 403 if false
  Resolve Discogs username (from user_profiles or OAuth cookie)
  Upsert leaderboard_entries row
  → Scores always reflect the most recent analysis
```

The leaderboard page is a server component with ISR (60s revalidation). Rankings use a service-role Supabase client that bypasses RLS. GET filters to `leaderboard_opt_in = true` rows only.

### Account Management & GDPR

- `GET /api/account` — returns profile (display_name, leaderboard_opt_in, show_discogs_link)
- `PATCH /api/account` — update profile; syncs matching fields to `leaderboard_entries`
- `DELETE /api/account` — requires confirmation text "delete my account"; deletes `leaderboard_entries` → `user_collection_cache` → `auth.admin.deleteUser` (cascades `user_profiles`)
- `GET /api/account/export` — returns all stored data as JSON (GDPR Art. 15)

**Display name rules:** 3–30 chars, `^[a-zA-Z0-9_-]+$`, unique (partial index on non-null values).

### Collection Cache

Two Supabase tables, both written exclusively via the service-role client (no RLS needed):

| Table | Key | Contents | TTL |
|---|---|---|---|
| `user_collection_cache` | `(discogs_username, release_id)` | title, artist, year, formats, cover image, date_added, genres, styles | 7 days |
| `release_community_cache` | `release_id` | have/want counts, rarity score — **shared across users** | 7 days |

If two users own the same record, the second user benefits from the first user's Discogs fetch.

A Postgres function `get_user_collection_with_community(username)` LEFT JOINs the two tables server-side, avoiding URL-length limits that arise when passing 2,000+ IDs to a PostgREST `.in()` query.

**Deduplication:** Discogs allows a user to own multiple copies of the same release (same `release_id`, different `instance_id`). The batch upsert deduplicates by `release_id` before writing — sending duplicate conflict targets in a single `INSERT … ON CONFLICT DO UPDATE` raises PostgreSQL error `21000` and silently fails the entire batch.

---

## Project Structure

```
app/
  page.tsx                  Landing page (server component)
  api/                      API route handlers
  components/
    ConnectButton.tsx        Client CTA — starts Discogs OAuth
    CollectionAnalysis.tsx   Main analysis UI
    SkeletonCollection.tsx   Shimmer skeleton shown during auth resolution
    WrappedAnalysis.tsx      Authenticated Wrapped — year picker, share, cache
    WrappedView.tsx          Presentational Wrapped display (shared: auth + public)
    LeaderboardTable.tsx     Ranked table with medal rows
    AuthModal.tsx            Email/password sign in + sign up
  hooks/
    useAuth.ts               Singleton auth hook (Discogs + Supabase state)
    useReleaseDetails.ts     Batched client-side community data fetcher
  models/
    types.ts                 Shared TypeScript types
  utils/
    auth.ts                  DiscogsOAuth class (HMAC-SHA1 signing)
    collection.ts            getUserCollection, getReleaseCommunityData, calculateCollectionStats
    wrapped-stats.ts         computeWrappedStats, deriveYears (pure functions)
    discogs-http-client.ts   createDiscogsClient, createDiscogsClientWithApiKey
    discogs-search.ts        searchDiscogs, searchDatabaseWithRarity
    discogs-metadata.ts      Genres/styles/formats with LRU cache
    supabase.ts              getSupabaseClient (service-role, server-only)
    supabase-server.ts       createSupabaseServerClient (anon key, cookie-based)
    supabase-browser.ts      createSupabaseBrowserClient (singleton)
    rate-limiter.ts          Discogs rate limit handling
  collection/
    page.tsx                 Collection analyzer page (shows SkeletonCollection during auth)
  wrapped/
    page.tsx                 Authenticated Wrapped page
    [username]/page.tsx      Public Wrapped (ISR 1h, reads Supabase cache)
  leaderboard/
    LeaderboardTabs.tsx      Client tab switcher
  account/
    page.tsx                 Account settings (display name, leaderboard, export, delete)
middleware.ts               Supabase session refresh + Discogs auth guard
supabase/migrations/        SQL migration files
__tests__/                  Vitest test suite (167 tests)
```

---

## Environment Variables

| Variable | Where used |
|---|---|
| `DISCOGS_CONSUMER_KEY` | Server — OAuth signing |
| `DISCOGS_CONSUMER_SECRET` | Server — OAuth signing |
| `NEXT_PUBLIC_APP_URL` | Server — OAuth callback URL + public Wrapped share link (e.g. `https://raerz.fyi`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server — Supabase Auth |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only — leaderboard + collection cache + public Wrapped |

---

## Database Migrations

Migrations live in `supabase/migrations/` and are applied via the Supabase CLI:

```bash
supabase login
supabase db push --linked
```

| File | Creates / Alters |
|---|---|
| `001_leaderboard.sql` | `user_profiles`, `leaderboard_entries` with RLS policies |
| `002_collection_cache.sql` | `user_collection_cache`, `release_community_cache`, `get_user_collection_with_community()` RPC |
| `003_account_management.sql` | `display_name`, `leaderboard_opt_in`, `show_discogs_link` on both profile + leaderboard tables |
| `004_wrapped_fields.sql` | `date_added`, `genres`, `styles` on `user_collection_cache`; updated RPC to return them |

---

## Running Locally

```bash
npm install
cp .env.example .env.local   # fill in your keys
npm run dev
```

**Tests:**
```bash
npm test
```

**Build:**
```bash
npm run build
```

> **Note:** `/api/collection` and `/api/release/*` require valid Discogs OAuth cookies and will return 401 in local development unless you complete the OAuth flow first (`/api/auth` → Discogs authorization → `/api/auth/callback`).

---

## Deploying to Vercel

1. Add all environment variables in Vercel project settings
2. In your [Discogs Developer Settings](https://www.discogs.com/settings/developers), set the OAuth callback URL to `https://your-domain/api/auth/callback`
3. Run the Supabase migrations against your production project (`supabase db push --linked`)

---

## Security Notes

- OAuth tokens stored in **httpOnly cookies** — never exposed to client JS
- OAuth callback URL derived from `NEXT_PUBLIC_APP_URL` env var — prevents host-header injection
- CSRF state nonce validates every OAuth callback
- All POST endpoints validated with **Zod**
- CORS restricted to `NEXT_PUBLIC_APP_URL`
- Security headers: CSP, HSTS, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`
- No Edge Runtime on routes that use Node.js `crypto` or `cookies()`
- Leaderboard gated behind explicit `leaderboard_opt_in` consent (GDPR-correct)
