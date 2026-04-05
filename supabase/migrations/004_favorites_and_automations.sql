-- ─── Migration 004: favourite dishes + automations + skipped meal status ──────

-- planned_meals: add 'skipped' to status enum
ALTER TABLE planned_meals DROP CONSTRAINT IF EXISTS planned_meals_status_check;
ALTER TABLE planned_meals ADD CONSTRAINT planned_meals_status_check
  CHECK (status IN ('recommended','planned','prepared','cooked','rated','skipped'));

-- user_favorites: stores favourite dishes (from generated recipes or custom entries)
CREATE TABLE IF NOT EXISTS user_favorites (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id    UUID        REFERENCES recipes(id) ON DELETE SET NULL,
  custom_name  TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_favorites_user_id_idx ON user_favorites(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS user_favorites_user_recipe_idx
  ON user_favorites(user_id, recipe_id) WHERE recipe_id IS NOT NULL;

ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_favorites_select" ON user_favorites
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_favorites_insert" ON user_favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_favorites_update" ON user_favorites
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "user_favorites_delete" ON user_favorites
  FOR DELETE USING (auth.uid() = user_id);

-- automations: user-configured automatic actions triggered on plan generation
CREATE TABLE IF NOT EXISTS automations (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL CHECK (type IN ('reminders_export','sms_share')),
  enabled    BOOLEAN     NOT NULL DEFAULT true,
  config     JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS automations_user_id_idx ON automations(user_id);

ALTER TABLE automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "automations_select" ON automations
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "automations_insert" ON automations
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "automations_update" ON automations
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "automations_delete" ON automations
  FOR DELETE USING (auth.uid() = user_id);
