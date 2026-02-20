# Raerz — Vinyl Collection Analyzer

A tool for Discogs collectors to analyze the rarity of their record collections, discover their rarest items, and compete on a public leaderboard.

**Live site:** [raerz.fyi](https://raerz.fyi)

---

## Features

- **Collection Analysis** — Enter any Discogs username to see your full collection ranked by rarity, want count, and collectibility
- **Rarity Scoring** — Each record is scored as `wantCount / haveCount`. Higher ratio = more people want it than own it
- **Leaderboard** — Submit your results and compete across three categories: average rarity, rarest single item, and collection size
- **7-Day Collection Cache** — Collections are cached in Supabase so returning users load instantly without re-hitting Discogs
- **Search** — Search the Discogs database by genre, style, format, artist, and more with rarity data appended

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
| Tests | Vitest (124 tests) |

---

## Architecture

```
┌─ Pages (Next.js App Router) ────────────────────────────────────────┐
│  /collection    Client component — collection analyzer UI           │
│  /leaderboard   Server component (ISR 60s) — top 50 collectors      │
│  /about         Static — explains rarity scoring                    │
│  /auth/*        Password reset flow                                 │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─ API Routes ────────────────────────────────────────────────────────┐
│  /api/auth           Initiate Discogs OAuth                         │
│  /api/auth/callback  Exchange OAuth verifier for access token       │
│  /api/auth/status    Return current Discogs + Supabase auth state   │
│  /api/auth/logout    Clear Discogs cookies                          │
│  /api/collection     Fetch collection (Supabase cache → Discogs)    │
│  /api/release/[id]   Get have/want counts for a single release      │
│  /api/search         Search Discogs database with filters           │
│  /api/leaderboard    GET top 50 / POST submit stats                 │
│  /api/genres etc.    Hardcoded metadata, built as static assets     │
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

1. User enters a Discogs username on `/collection`
2. `GET /api/collection` checks `user_collection_cache` in Supabase (7-day TTL)
   - **Cache hit:** returns enriched items in <200ms — `fromCache: true`
   - **Cache miss:** paginates Discogs API (100 items/page, up to 20 pages / 2,000 items), then writes results to cache asynchronously
3. Client receives basic items (title, artist, year, format, cover image)
4. `useReleaseDetails` hook fetches have/want counts in batches of 10 via `GET /api/release/[id]`
   - Items already enriched from cache (haveCount > 0) are skipped entirely
   - Each `/api/release/[id]` call checks `release_community_cache` first
5. `calculateCollectionStats()` runs client-side once all data is loaded
6. User can optionally submit stats to the leaderboard

**Rarity score:** `want / have` (0 if have = 0). A score > 1 means more people want it than own it.

**Stats surfaces:**
- Rarest Items — top 10 by rarity score
- Fewest Haves — top 10 by lowest owner count
- Most Wanted — top 10 by want count
- Most Collectible — top 10 by `(have × want) / 1000`
- Most Common — bottom 10 by rarity score

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

Requires both a Supabase account and a connected Discogs account.

```
POST /api/leaderboard
  Validate Supabase session
  Resolve Discogs username (from user_profiles or OAuth cookie)
  Upsert leaderboard_entries row
  → Scores always reflect the most recent analysis
```

The leaderboard page is a server component with ISR (60s revalidation). Rankings use a service-role Supabase client that bypasses RLS.

### Collection Cache

Two Supabase tables, both written exclusively via the service-role client (no RLS needed):

| Table | Key | Contents | TTL |
|---|---|---|---|
| `user_collection_cache` | `(discogs_username, release_id)` | title, artist, year, formats, cover image | 7 days |
| `release_community_cache` | `release_id` | have/want counts, rarity score — **shared across users** | 7 days |

If two users own the same record, the second user benefits from the first user's Discogs fetch.

A Postgres function `get_user_collection_with_community(username)` LEFT JOINs the two tables server-side, avoiding URL-length limits that arise when passing 2,000+ IDs to a PostgREST `.in()` query.

---

## Project Structure

```
app/
  api/                  API route handlers
  components/           React components
    CollectionAnalysis.tsx   Main analysis UI
    LeaderboardTable.tsx     Ranked table with medal rows
    AuthModal.tsx            Email/password sign in + sign up
  hooks/
    useReleaseDetails.ts     Batched client-side community data fetcher
  models/
    types.ts                 Shared TypeScript types
  utils/
    auth.ts                  DiscogsOAuth class (HMAC-SHA1 signing)
    collection.ts            getUserCollection, getReleaseCommunityData, calculateCollectionStats
    discogs-http-client.ts   createDiscogsClient, createDiscogsClientWithApiKey
    discogs-search.ts        searchDiscogs, searchDatabaseWithRarity
    discogs-metadata.ts      Genres/styles/formats with LRU cache
    supabase.ts              getSupabaseClient (service-role, server-only)
    supabase-server.ts       createSupabaseServerClient (anon key, cookie-based)
    supabase-browser.ts      createSupabaseBrowserClient (singleton)
    rate-limiter.ts          Discogs rate limit handling
  leaderboard/
    LeaderboardTabs.tsx      Client tab switcher
middleware.ts               Supabase session refresh + Discogs auth guard
supabase/migrations/        SQL migration files
__tests__/                  Vitest test suite
```

---

## Environment Variables

| Variable | Where used |
|---|---|
| `DISCOGS_CONSUMER_KEY` | Server — OAuth signing |
| `DISCOGS_CONSUMER_SECRET` | Server — OAuth signing |
| `NEXT_PUBLIC_APP_URL` | Server — OAuth callback URL (e.g. `https://raerz.fyi`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server — Supabase Auth |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only — leaderboard + collection cache |

---

## Database Migrations

Migrations live in `supabase/migrations/` and are applied via the Supabase CLI:

```bash
supabase login
supabase db push --linked
```

| File | Creates |
|---|---|
| `001_leaderboard.sql` | `user_profiles`, `leaderboard_entries` with RLS policies |
| `002_collection_cache.sql` | `user_collection_cache`, `release_community_cache`, `get_user_collection_with_community()` RPC |

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
