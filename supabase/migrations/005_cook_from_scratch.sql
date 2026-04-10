-- supabase/migrations/005_cook_from_scratch.sql
-- Add cook_from_scratch_preference to user_preferences

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS cook_from_scratch_preference INTEGER NOT NULL DEFAULT 3
    CHECK (cook_from_scratch_preference BETWEEN 1 AND 5);
