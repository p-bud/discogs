-- Migration 003: Account management & GDPR compliance
-- Adds display_name, leaderboard_opt_in, show_discogs_link to user_profiles
-- and denormalises leaderboard_opt_in / show_discogs_link into leaderboard_entries.

-- ── user_profiles additions ──────────────────────────────────────────────────

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS leaderboard_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS show_discogs_link BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE user_profiles
  ADD CONSTRAINT display_name_length
    CHECK (display_name IS NULL OR char_length(display_name) BETWEEN 3 AND 30),
  ADD CONSTRAINT display_name_chars
    CHECK (display_name IS NULL OR display_name ~ '^[a-zA-Z0-9_-]+$');

-- Unique display names (NULLs are not unique-constrained — partial index).
CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_display_name_unique
  ON user_profiles (display_name) WHERE display_name IS NOT NULL;

-- ── leaderboard_entries additions ────────────────────────────────────────────
-- DEFAULT FALSE means all existing rows are immediately hidden (GDPR-correct:
-- users never gave explicit consent for public display before this migration).

ALTER TABLE leaderboard_entries
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS leaderboard_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS show_discogs_link BOOLEAN NOT NULL DEFAULT TRUE;
