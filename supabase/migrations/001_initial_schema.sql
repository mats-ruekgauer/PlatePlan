-- ─────────────────────────────────────────────────────────────────────────────
-- 001_initial_schema.sql
-- Creates all PlatePlan tables. Run after Supabase project is initialised.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Helper: auto-update updated_at ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ─── profiles ─────────────────────────────────────────────────────────────────
-- One row per Supabase auth user. Created automatically on sign-up via trigger.

CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create a profile row when a new auth user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── user_preferences ────────────────────────────────────────────────────────

CREATE TABLE user_preferences (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- Goals
  calorie_target          INTEGER,
  protein_target_g        INTEGER,
  -- Body data
  weight_kg               NUMERIC(5,2),
  height_cm               INTEGER,
  age                     INTEGER,
  sex                     TEXT        CHECK (sex IN ('male', 'female', 'other')),
  activity_level          TEXT        CHECK (activity_level IN (
                            'sedentary', 'light', 'moderate', 'active', 'very_active'
                          )),
  -- Food preferences
  dietary_restrictions    TEXT[]      NOT NULL DEFAULT '{}',
  disliked_ingredients    TEXT[]      NOT NULL DEFAULT '{}',
  liked_cuisines          TEXT[]      NOT NULL DEFAULT '{}',
  -- Planning
  managed_meal_slots      TEXT[]      NOT NULL DEFAULT '{}',
  unmanaged_slot_calories JSONB,
  batch_cook_days         INTEGER     NOT NULL DEFAULT 1
                            CHECK (batch_cook_days BETWEEN 1 AND 3),
  prefers_seasonal        BOOLEAN     NOT NULL DEFAULT FALSE,
  max_cook_time_minutes   INTEGER     NOT NULL DEFAULT 45,
  -- Shopping
  shopping_days           INTEGER[]   NOT NULL DEFAULT '{}',
  pantry_staples          TEXT[]      NOT NULL DEFAULT '{}',
  -- Timestamps
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One preferences row per user
  UNIQUE (user_id)
);

CREATE TRIGGER user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── recipes ─────────────────────────────────────────────────────────────────

CREATE TABLE recipes (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        REFERENCES profiles(id) ON DELETE CASCADE,
  title                 TEXT        NOT NULL,
  description           TEXT,
  ingredients           JSONB       NOT NULL DEFAULT '[]',
  steps                 TEXT[]      NOT NULL DEFAULT '{}',
  calories_per_serving  INTEGER,
  protein_per_serving_g INTEGER,
  carbs_per_serving_g   INTEGER,
  fat_per_serving_g     INTEGER,
  servings              INTEGER     NOT NULL DEFAULT 1,
  cook_time_minutes     INTEGER,
  cuisine               TEXT,
  tags                  TEXT[]      NOT NULL DEFAULT '{}',
  is_seasonal           BOOLEAN     NOT NULL DEFAULT FALSE,
  season                TEXT        NOT NULL DEFAULT 'all'
                          CHECK (season IN ('spring', 'summer', 'autumn', 'winter', 'all')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX recipes_user_id_idx ON recipes (user_id);
CREATE INDEX recipes_cuisine_idx  ON recipes (cuisine);
CREATE INDEX recipes_tags_idx     ON recipes USING gin (tags);

-- ─── meal_plans ──────────────────────────────────────────────────────────────

CREATE TABLE meal_plans (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_start   DATE        NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active', 'archived')),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, week_start)
);

CREATE INDEX meal_plans_user_id_idx    ON meal_plans (user_id);
CREATE INDEX meal_plans_week_start_idx ON meal_plans (week_start);

-- ─── planned_meals ───────────────────────────────────────────────────────────

CREATE TABLE planned_meals (
  id                    UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id               UUID    NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  day_of_week           INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  meal_slot             TEXT    NOT NULL
                          CHECK (meal_slot IN ('breakfast', 'lunch', 'dinner', 'snack')),
  recipe_id             UUID    NOT NULL REFERENCES recipes(id),
  alternative_recipe_id UUID    REFERENCES recipes(id),
  chosen_recipe_id      UUID    REFERENCES recipes(id),
  batch_group           INTEGER,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- A slot can only appear once per day per plan
  UNIQUE (plan_id, day_of_week, meal_slot)
);

CREATE INDEX planned_meals_plan_id_idx ON planned_meals (plan_id);

-- ─── shopping_lists ───────────────────────────────────────────────────────────

CREATE TABLE shopping_lists (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id       UUID        REFERENCES meal_plans(id) ON DELETE SET NULL,
  shopping_date DATE,
  items         JSONB       NOT NULL DEFAULT '[]',
  exported_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX shopping_lists_user_id_idx ON shopping_lists (user_id);
CREATE INDEX shopping_lists_plan_id_idx ON shopping_lists (plan_id);

-- ─── meal_feedback ───────────────────────────────────────────────────────────

CREATE TABLE meal_feedback (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  planned_meal_id UUID    REFERENCES planned_meals(id) ON DELETE SET NULL,
  recipe_id       UUID    NOT NULL REFERENCES recipes(id),
  taste_rating    INTEGER CHECK (taste_rating BETWEEN 1 AND 5),
  portion_rating  INTEGER CHECK (portion_rating BETWEEN 1 AND 5),
  would_repeat    BOOLEAN,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX meal_feedback_user_id_idx   ON meal_feedback (user_id);
CREATE INDEX meal_feedback_recipe_id_idx ON meal_feedback (recipe_id);

-- ─── receipt_items ────────────────────────────────────────────────────────────

CREATE TABLE receipt_items (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receipt_image_url TEXT,
  item_name         TEXT        NOT NULL,
  price_eur         NUMERIC(6,2),
  supermarket       TEXT,
  purchased_at      DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX receipt_items_user_id_idx ON receipt_items (user_id);

-- ─── Storage bucket ───────────────────────────────────────────────────────────
-- The `receipts` bucket must also be created in the Supabase dashboard
-- (Storage → New bucket → name: "receipts", private).
-- RLS policies for storage are defined in 002_rls_policies.sql.
