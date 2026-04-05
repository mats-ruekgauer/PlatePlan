-- ─── Migration 003: preferences extensions + meal status + recipe price ────────

-- user_preferences: liked ingredients + seasonality importance (1-5)
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS liked_ingredients TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS seasonality_importance INTEGER NOT NULL DEFAULT 3
    CHECK (seasonality_importance BETWEEN 1 AND 5);

-- recipes: estimated price per serving in EUR
ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS estimated_price_eur NUMERIC(5,2);

-- planned_meals: user-facing status lifecycle
ALTER TABLE planned_meals
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'recommended'
    CHECK (status IN ('recommended','planned','prepared','cooked','rated'));
