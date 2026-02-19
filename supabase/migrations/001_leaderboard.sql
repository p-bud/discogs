-- Migration 001: Leaderboard + User Profiles
-- Run this in the Supabase SQL editor or via Supabase CLI.

-- Extends Supabase Auth users with Discogs identity
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  discogs_username TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- One row per user; upserted each time they submit (scores always reflect latest analysis)
CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  discogs_username TEXT NOT NULL UNIQUE,
  avg_rarity_score DECIMAL(10, 4) DEFAULT 0,
  rarest_item_score DECIMAL(10, 4) DEFAULT 0,
  rarest_item_title TEXT,
  rarest_item_artist TEXT,
  collection_size INTEGER DEFAULT 0,
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_entries ENABLE ROW LEVEL SECURITY;

-- user_profiles: users can only read/write their own row
CREATE POLICY "users can manage own profile"
  ON user_profiles FOR ALL USING (auth.uid() = id);

-- leaderboard_entries: public read, authenticated write (own row only)
CREATE POLICY "leaderboard is public"
  ON leaderboard_entries FOR SELECT USING (true);

CREATE POLICY "users can insert own entry"
  ON leaderboard_entries FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "users can update own entry"
  ON leaderboard_entries FOR UPDATE USING (
    user_id IN (SELECT id FROM user_profiles WHERE id = auth.uid())
  );

-- Auto-update updated_at on user_profiles changes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
