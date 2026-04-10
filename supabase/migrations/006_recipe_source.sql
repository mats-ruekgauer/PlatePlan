ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'ai_generated';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'recipes_source_check'
  ) THEN
    ALTER TABLE recipes
      ADD CONSTRAINT recipes_source_check
      CHECK (source IN ('ai_generated', 'manual'));
  END IF;
END $$;
