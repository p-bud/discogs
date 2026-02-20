-- Migration 002: Collection Cache
-- Run this in the Supabase SQL editor or via Supabase CLI.

-- Basic collection ownership per Discogs user (which releases they own)
CREATE TABLE IF NOT EXISTS user_collection_cache (
  discogs_username  TEXT NOT NULL,
  release_id        TEXT NOT NULL,
  title             TEXT NOT NULL DEFAULT '',
  artist            TEXT NOT NULL DEFAULT '',
  year              TEXT NOT NULL DEFAULT '',
  formats           JSONB NOT NULL DEFAULT '[]',
  cover_image       TEXT NOT NULL DEFAULT '',
  synced_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (discogs_username, release_id)
);

CREATE INDEX IF NOT EXISTS idx_ucc_username_synced
  ON user_collection_cache(discogs_username, synced_at DESC);

-- Shared community data per release (have/want counts) — shared across all users
CREATE TABLE IF NOT EXISTS release_community_cache (
  release_id    TEXT PRIMARY KEY,
  have_count    INTEGER NOT NULL DEFAULT 0,
  want_count    INTEGER NOT NULL DEFAULT 0,
  rarity_score  DECIMAL(10, 4) NOT NULL DEFAULT 0,
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Helper function: fetch a user's full collection joined with community data.
-- Called via supabase.rpc('get_user_collection_with_community', { p_username }).
-- Using an RPC avoids URL-length issues that arise with large .in() queries
-- when there are 2,000+ release IDs.
CREATE OR REPLACE FUNCTION get_user_collection_with_community(p_username TEXT)
RETURNS TABLE (
  release_id    TEXT,
  title         TEXT,
  artist        TEXT,
  year          TEXT,
  formats       JSONB,
  cover_image   TEXT,
  synced_at     TIMESTAMPTZ,
  have_count    INTEGER,
  want_count    INTEGER,
  rarity_score  DECIMAL
) LANGUAGE SQL STABLE AS $$
  SELECT
    ucc.release_id,
    ucc.title,
    ucc.artist,
    ucc.year,
    ucc.formats,
    ucc.cover_image,
    ucc.synced_at,
    COALESCE(rcc.have_count, 0)   AS have_count,
    COALESCE(rcc.want_count, 0)   AS want_count,
    COALESCE(rcc.rarity_score, 0) AS rarity_score
  FROM user_collection_cache ucc
  LEFT JOIN release_community_cache rcc USING (release_id)
  WHERE ucc.discogs_username = p_username;
$$;
