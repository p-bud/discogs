-- Migration 005: Supabase optimizations
--
-- 1. pg_cron jobs to purge stale cache rows automatically
-- 2. Partial indexes on leaderboard_entries for ORDER BY queries
-- 3. Tightened RLS policies on leaderboard_entries
-- 4. RPC marked PARALLEL SAFE

-- ── 1. Automatic cache cleanup via pg_cron ────────────────────────────────────
-- Requires pg_cron extension:
--   Supabase Dashboard → Database → Extensions → enable pg_cron
--   Then re-run this migration (or run the two cron.schedule calls manually).
--
-- Wrapped in a DO block so the rest of the migration applies even if pg_cron
-- is not yet enabled. Once enabled, run `supabase db push` again.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'purge-stale-collection-cache',
      '0 3 * * *',
      'DELETE FROM user_collection_cache WHERE synced_at < NOW() - INTERVAL ''7 days'''
    );
    PERFORM cron.schedule(
      'purge-stale-community-cache',
      '0 3 * * *',
      'DELETE FROM release_community_cache WHERE fetched_at < NOW() - INTERVAL ''7 days'''
    );
    RAISE NOTICE 'pg_cron jobs scheduled.';
  ELSE
    RAISE NOTICE 'pg_cron not enabled — skipping cache cleanup jobs. Enable the extension and re-run this migration.';
  END IF;
END $$;

-- ── 2. Leaderboard indexes ────────────────────────────────────────────────────
-- The leaderboard GET query always filters WHERE leaderboard_opt_in = true
-- and orders by one of these three columns DESC.
-- Partial indexes mirror that filter so Postgres can satisfy both the
-- predicate and the ORDER BY from the index alone (index-only scan).

CREATE INDEX IF NOT EXISTS idx_leaderboard_avg_rarity
  ON leaderboard_entries (avg_rarity_score DESC)
  WHERE leaderboard_opt_in = true;

CREATE INDEX IF NOT EXISTS idx_leaderboard_rarest_item
  ON leaderboard_entries (rarest_item_score DESC)
  WHERE leaderboard_opt_in = true;

CREATE INDEX IF NOT EXISTS idx_leaderboard_collection_size
  ON leaderboard_entries (collection_size DESC)
  WHERE leaderboard_opt_in = true;

-- ── 3. RLS policy improvements ────────────────────────────────────────────────
-- Old INSERT/UPDATE policies used an unnecessary subquery:
--   user_id IN (SELECT id FROM user_profiles WHERE id = auth.uid())
-- Replace with a direct equality check, and add WITH CHECK to UPDATE
-- so a user can't change their own row's user_id to someone else's.

DROP POLICY IF EXISTS "users can insert own entry" ON leaderboard_entries;
DROP POLICY IF EXISTS "users can update own entry" ON leaderboard_entries;

CREATE POLICY "users can insert own entry"
  ON leaderboard_entries FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users can update own entry"
  ON leaderboard_entries FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── 4. RPC: mark PARALLEL SAFE ───────────────────────────────────────────────
-- The function only reads stable data with no side effects, so marking it
-- PARALLEL SAFE lets the query planner use parallel workers for large
-- collections. Must DROP and recreate (can't ALTER FUNCTION to add this).

DROP FUNCTION IF EXISTS get_user_collection_with_community(TEXT);

CREATE FUNCTION get_user_collection_with_community(p_username TEXT)
RETURNS TABLE (
  release_id   TEXT,
  title        TEXT,
  artist       TEXT,
  year         TEXT,
  formats      JSONB,
  cover_image  TEXT,
  synced_at    TIMESTAMPTZ,
  date_added   TIMESTAMPTZ,
  genres       JSONB,
  styles       JSONB,
  have_count   INTEGER,
  want_count   INTEGER,
  rarity_score DECIMAL
) LANGUAGE SQL STABLE PARALLEL SAFE AS $$
  SELECT
    ucc.release_id,
    ucc.title,
    ucc.artist,
    ucc.year,
    ucc.formats,
    ucc.cover_image,
    ucc.synced_at,
    ucc.date_added,
    ucc.genres,
    ucc.styles,
    COALESCE(rcc.have_count,   0) AS have_count,
    COALESCE(rcc.want_count,   0) AS want_count,
    COALESCE(rcc.rarity_score, 0) AS rarity_score
  FROM user_collection_cache ucc
  LEFT JOIN release_community_cache rcc USING (release_id)
  WHERE ucc.discogs_username = p_username;
$$;
