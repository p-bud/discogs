-- Migration 004: Wrapped Fields
-- Adds date_added, genres, and styles to user_collection_cache so the
-- Discogs Wrapped feature can filter and group by year of addition.
-- Run via: supabase db push

ALTER TABLE user_collection_cache
  ADD COLUMN IF NOT EXISTS date_added TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS genres     JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS styles     JSONB NOT NULL DEFAULT '[]';

-- Index for fast per-user date_added filtering (Wrapped page query)
CREATE INDEX IF NOT EXISTS idx_ucc_username_date_added
  ON user_collection_cache (discogs_username, date_added);

-- Drop and recreate the RPC — CREATE OR REPLACE can't change return type.
-- Existing callers are unaffected; they ignore unknown columns.
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
) LANGUAGE SQL STABLE AS $$
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
    COALESCE(rcc.have_count,    0) AS have_count,
    COALESCE(rcc.want_count,    0) AS want_count,
    COALESCE(rcc.rarity_score,  0) AS rarity_score
  FROM user_collection_cache ucc
  LEFT JOIN release_community_cache rcc USING (release_id)
  WHERE ucc.discogs_username = p_username;
$$;
