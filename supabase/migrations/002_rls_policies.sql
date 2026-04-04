-- ─────────────────────────────────────────────────────────────────────────────
-- 002_rls_policies.sql
-- Enables Row Level Security on all tables and locks every row to its owner.
-- Must run after 001_initial_schema.sql.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Enable RLS ───────────────────────────────────────────────────────────────

ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences  ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans        ENABLE ROW LEVEL SECURITY;
ALTER TABLE planned_meals     ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_lists    ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_feedback     ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_items     ENABLE ROW LEVEL SECURITY;

-- ─── profiles ────────────────────────────────────────────────────────────────

CREATE POLICY "profiles: owner select"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles: owner insert"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles: owner update"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles: owner delete"
  ON profiles FOR DELETE
  USING (auth.uid() = id);

-- ─── user_preferences ────────────────────────────────────────────────────────

CREATE POLICY "user_preferences: owner select"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_preferences: owner insert"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_preferences: owner update"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_preferences: owner delete"
  ON user_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- ─── recipes ─────────────────────────────────────────────────────────────────
-- Users can read their own recipes and all global recipes (user_id IS NULL).
-- Only the owner can modify their recipes; global recipes are immutable via client.

CREATE POLICY "recipes: owner or global select"
  ON recipes FOR SELECT
  USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "recipes: owner insert"
  ON recipes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "recipes: owner update"
  ON recipes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "recipes: owner delete"
  ON recipes FOR DELETE
  USING (auth.uid() = user_id);

-- ─── meal_plans ──────────────────────────────────────────────────────────────

CREATE POLICY "meal_plans: owner select"
  ON meal_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "meal_plans: owner insert"
  ON meal_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "meal_plans: owner update"
  ON meal_plans FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "meal_plans: owner delete"
  ON meal_plans FOR DELETE
  USING (auth.uid() = user_id);

-- ─── planned_meals ───────────────────────────────────────────────────────────
-- Access is gated through the parent meal_plan's user_id.

CREATE POLICY "planned_meals: owner select"
  ON planned_meals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM meal_plans
      WHERE meal_plans.id = planned_meals.plan_id
        AND meal_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "planned_meals: owner insert"
  ON planned_meals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meal_plans
      WHERE meal_plans.id = planned_meals.plan_id
        AND meal_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "planned_meals: owner update"
  ON planned_meals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM meal_plans
      WHERE meal_plans.id = planned_meals.plan_id
        AND meal_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "planned_meals: owner delete"
  ON planned_meals FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM meal_plans
      WHERE meal_plans.id = planned_meals.plan_id
        AND meal_plans.user_id = auth.uid()
    )
  );

-- ─── shopping_lists ──────────────────────────────────────────────────────────

CREATE POLICY "shopping_lists: owner select"
  ON shopping_lists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "shopping_lists: owner insert"
  ON shopping_lists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "shopping_lists: owner update"
  ON shopping_lists FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "shopping_lists: owner delete"
  ON shopping_lists FOR DELETE
  USING (auth.uid() = user_id);

-- ─── meal_feedback ───────────────────────────────────────────────────────────

CREATE POLICY "meal_feedback: owner select"
  ON meal_feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "meal_feedback: owner insert"
  ON meal_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "meal_feedback: owner update"
  ON meal_feedback FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "meal_feedback: owner delete"
  ON meal_feedback FOR DELETE
  USING (auth.uid() = user_id);

-- ─── receipt_items ───────────────────────────────────────────────────────────

CREATE POLICY "receipt_items: owner select"
  ON receipt_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "receipt_items: owner insert"
  ON receipt_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "receipt_items: owner update"
  ON receipt_items FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "receipt_items: owner delete"
  ON receipt_items FOR DELETE
  USING (auth.uid() = user_id);

-- ─── Storage: receipts bucket ─────────────────────────────────────────────────
-- Each user may only read/write objects under their own user_id/ prefix.

CREATE POLICY "receipts: owner select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "receipts: owner insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "receipts: owner delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
