-- ─── Migration 005: app language preference ────────────────────────────────

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'en'
    CHECK (preferred_language IN ('en', 'de'));
