# Cook from Scratch Preference — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 5-step "Cooking from scratch" preference to the Food Preferences settings screen so Claude knows how much processed/convenience food is acceptable.

**Architecture:** New integer column `cook_from_scratch_preference` (1–5) in the `user_preferences` DB table, mirrored through TypeScript types → Zustand store → UI control → Claude prompt rule. Follows the exact same pattern as the existing `seasonalityImportance` field.

**Tech Stack:** React Native + Expo Router, NativeWind (Tailwind), Zustand + AsyncStorage, Supabase (Postgres), TypeScript

---

## File Map

| File | Action | What changes |
|------|--------|--------------|
| `supabase/migrations/005_cook_from_scratch.sql` | Create | New DB column |
| `types/index.ts` | Modify | Add field to `OnboardingState` + `UserPreferences` |
| `stores/onboardingStore.ts` | Modify | Add state field + setter action |
| `__tests__/integration/onboardingStore.test.ts` | Modify | Tests for new store action |
| `lib/supabase.ts` | Modify | Add field to `mapUserPreferences` mapper |
| `__tests__/unit/mapUserPreferences.test.ts` | Create | Test for mapper default + mapping |
| `app/settings/preferences.tsx` | Modify | Load, display, save the new control |
| `constants/prompts.ts` | Modify | Add rule to Claude system prompt |

---

### Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/005_cook_from_scratch.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/005_cook_from_scratch.sql
-- Add cook_from_scratch_preference to user_preferences

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS cook_from_scratch_preference INTEGER NOT NULL DEFAULT 3
    CHECK (cook_from_scratch_preference BETWEEN 1 AND 5);
```

- [ ] **Step 2: Apply locally (if Supabase CLI is running)**

```bash
supabase db push
```

If the local Supabase stack is not running, skip this step — the migration file is enough for review. The column will be applied on next deployment.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/005_cook_from_scratch.sql
git commit -m "feat: add cook_from_scratch_preference column to user_preferences"
```

---

### Task 2: TypeScript Types

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: Add field to `UserPreferences` interface**

In `types/index.ts`, find the `UserPreferences` interface. After the `seasonalityImportance` line (line 79), add:

```ts
  cookFromScratchPreference: 1 | 2 | 3 | 4 | 5;
```

The block should look like:
```ts
  seasonalityImportance: 1 | 2 | 3 | 4 | 5;
  cookFromScratchPreference: 1 | 2 | 3 | 4 | 5;
```

- [ ] **Step 2: Add field to `OnboardingState` interface**

In `types/index.ts`, find the `OnboardingState` interface. After the `seasonalityImportance` line (line 267), add:

```ts
  cookFromScratchPreference: 1 | 2 | 3 | 4 | 5;
```

The block should look like:
```ts
  seasonalityImportance: 1 | 2 | 3 | 4 | 5;
  cookFromScratchPreference: 1 | 2 | 3 | 4 | 5;
```

- [ ] **Step 3: Type-check**

```bash
npm run type-check
```

Expected: no errors (the store and mapper don't reference this field yet, so TypeScript won't complain until those files are updated).

- [ ] **Step 4: Commit**

```bash
git add types/index.ts
git commit -m "feat: add cookFromScratchPreference to OnboardingState and UserPreferences types"
```

---

### Task 3: Zustand Store + Tests

**Files:**
- Modify: `stores/onboardingStore.ts`
- Modify: `__tests__/integration/onboardingStore.test.ts`

- [ ] **Step 1: Write the failing tests first**

Open `__tests__/integration/onboardingStore.test.ts`. Find the `describe('Step 2 — Preferences', ...)` block and add these tests at the end of it (before the closing `}`):

```ts
  it('cookFromScratchPreference defaults to 3', () => {
    expect(getStore().cookFromScratchPreference).toBe(3);
  });

  it('setCookFromScratchPreference stores the value', () => {
    getStore().setCookFromScratchPreference(5);
    expect(getStore().cookFromScratchPreference).toBe(5);
  });

  it('reset restores cookFromScratchPreference to 3', () => {
    getStore().setCookFromScratchPreference(1);
    getStore().reset();
    expect(getStore().cookFromScratchPreference).toBe(3);
  });
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm test -- --testPathPattern="onboardingStore" --no-coverage
```

Expected: FAIL — `getStore().cookFromScratchPreference` is `undefined`, `setCookFromScratchPreference` is not a function.

- [ ] **Step 3: Add field to `initialState` in `stores/onboardingStore.ts`**

Find the `initialState` object. After `seasonalityImportance: 3,` (Step 2 — Preferences section), add:

```ts
  cookFromScratchPreference: 3 as const,
```

The block should look like:
```ts
  // Step 2 — Preferences
  dietaryRestrictions: [],
  likedIngredients: [],
  dislikedIngredients: [],
  likedCuisines: [],
  seasonalityImportance: 3,
  cookFromScratchPreference: 3 as const,
```

- [ ] **Step 4: Add action type to `OnboardingActions` interface**

Find the `interface OnboardingActions` block. After `setSeasonalityImportance: (value: 1 | 2 | 3 | 4 | 5) => void;` (Step 2 section), add:

```ts
  setCookFromScratchPreference: (value: 1 | 2 | 3 | 4 | 5) => void;
```

- [ ] **Step 5: Add action implementation to the store**

Find the `setSeasonalityImportance` implementation inside the `create(...)` call. After it, add:

```ts
      setCookFromScratchPreference: (cookFromScratchPreference) =>
        set({ cookFromScratchPreference }),
```

- [ ] **Step 6: Run tests — expect PASS**

```bash
npm test -- --testPathPattern="onboardingStore" --no-coverage
```

Expected: all tests PASS including the 3 new ones.

- [ ] **Step 7: Commit**

```bash
git add stores/onboardingStore.ts __tests__/integration/onboardingStore.test.ts
git commit -m "feat: add cookFromScratchPreference field and setter to onboarding store"
```

---

### Task 4: Mapper + Mapper Test

**Files:**
- Modify: `lib/supabase.ts`
- Create: `__tests__/unit/mapUserPreferences.test.ts`

- [ ] **Step 1: Write the failing mapper test**

Create `__tests__/unit/mapUserPreferences.test.ts`:

```ts
/**
 * Unit tests for mapUserPreferences — verifies snake_case → camelCase mapping
 * and default values for nullable/optional columns.
 */

import { mapUserPreferences } from '../../lib/supabase';

// Minimal DB row shape — only fields needed for these assertions
function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pref-1',
    user_id: 'user-1',
    calorie_target: null,
    protein_target_g: null,
    weight_kg: null,
    height_cm: null,
    age: null,
    sex: null,
    activity_level: null,
    dietary_restrictions: [],
    liked_ingredients: [],
    disliked_ingredients: [],
    liked_cuisines: [],
    seasonality_importance: 3,
    cook_from_scratch_preference: 3,
    managed_meal_slots: [],
    unmanaged_slot_calories: {},
    batch_cook_days: 1,
    max_cook_time_minutes: 45,
    shopping_days: [],
    pantry_staples: [],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  } as Parameters<typeof mapUserPreferences>[0];
}

describe('mapUserPreferences', () => {
  it('maps cook_from_scratch_preference from DB row', () => {
    const result = mapUserPreferences(makeRow({ cook_from_scratch_preference: 5 }));
    expect(result.cookFromScratchPreference).toBe(5);
  });

  it('defaults cookFromScratchPreference to 3 when column is null', () => {
    const result = mapUserPreferences(makeRow({ cook_from_scratch_preference: null }));
    expect(result.cookFromScratchPreference).toBe(3);
  });

  it('maps seasonalityImportance correctly (regression)', () => {
    const result = mapUserPreferences(makeRow({ seasonality_importance: 4 }));
    expect(result.seasonalityImportance).toBe(4);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- --testPathPattern="mapUserPreferences" --no-coverage
```

Expected: FAIL — `result.cookFromScratchPreference` is `undefined`.

- [ ] **Step 3: Update `mapUserPreferences` in `lib/supabase.ts`**

Find the `mapUserPreferences` function (around line 257). After the `seasonalityImportance` line:
```ts
    seasonalityImportance: (row.seasonality_importance ?? 3) as 1 | 2 | 3 | 4 | 5,
```

Add:
```ts
    cookFromScratchPreference: (row.cook_from_scratch_preference ?? 3) as 1 | 2 | 3 | 4 | 5,
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test -- --testPathPattern="mapUserPreferences" --no-coverage
```

Expected: all 3 tests PASS.

- [ ] **Step 5: Type-check**

```bash
npm run type-check
```

Expected: no errors. (The DB row type may not know about the new column yet — TypeScript will allow `row.cook_from_scratch_preference` to be `any` via the existing `// eslint-disable-next-line` pattern if needed.)

- [ ] **Step 6: Commit**

```bash
git add lib/supabase.ts __tests__/unit/mapUserPreferences.test.ts
git commit -m "feat: map cook_from_scratch_preference in mapUserPreferences"
```

---

### Task 5: Settings Screen UI

**Files:**
- Modify: `app/settings/preferences.tsx`

- [ ] **Step 1: Add the labels constant**

In `app/settings/preferences.tsx`, find the existing constants block at the top (after `SEASONALITY_LABELS`). Add:

```ts
const COOK_FROM_SCRATCH_LABELS = ['Convenience', 'Mostly prep', 'Mix', 'Mostly scratch', 'Always scratch'];
```

- [ ] **Step 2: Load the field from DB on mount**

In the `useEffect` that loads preferences from Supabase (the `(async () => { ... })()` block), find where other store setters are called and add:

```ts
store.setCookFromScratchPreference((data.cook_from_scratch_preference ?? 3) as 1 | 2 | 3 | 4 | 5);
```

It should appear right after:
```ts
store.setSeasonalityImportance((data.seasonality_importance ?? 3) as 1 | 2 | 3 | 4 | 5);
```

- [ ] **Step 3: Add the field to the save call**

In `handleSave`, find the `.update({...})` object. After `seasonality_importance: store.seasonalityImportance,` add:

```ts
          cook_from_scratch_preference: store.cookFromScratchPreference,
```

- [ ] **Step 4: Add the UI control**

In the JSX, find the "Seasonality importance" `<View>` block (ends around line 279). Directly after its closing `</View>`, add:

```tsx
      {/* Cooking from scratch */}
      <View className="gap-3">
        <View className="flex-row justify-between items-baseline">
          <Text className="text-base font-semibold text-[#1A1A2E]">Cooking from scratch</Text>
          <Text className="text-[#2D6A4F] font-bold">
            {COOK_FROM_SCRATCH_LABELS[store.cookFromScratchPreference - 1]}
          </Text>
        </View>
        <Text className="text-sm text-[#6B7280] -mt-1">
          How much do you prefer cooking from raw ingredients?
        </Text>
        <View className="flex-row gap-1">
          {([1, 2, 3, 4, 5] as const).map((val) => (
            <Pressable
              key={val}
              onPress={() => store.setCookFromScratchPreference(val)}
              className={[
                'flex-1 py-2 rounded-lg items-center',
                val <= store.cookFromScratchPreference
                  ? val === store.cookFromScratchPreference
                    ? 'bg-[#2D6A4F]'
                    : 'bg-[#52B788]'
                  : 'bg-gray-200',
              ].join(' ')}
            >
              <Text
                className={`text-sm font-bold ${
                  val <= store.cookFromScratchPreference ? 'text-white' : 'text-gray-400'
                }`}
              >
                {val}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
```

- [ ] **Step 5: Type-check**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 6: Lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add app/settings/preferences.tsx
git commit -m "feat: add cooking-from-scratch preference control to settings screen"
```

---

### Task 6: Claude Prompt Rule

**Files:**
- Modify: `constants/prompts.ts`

- [ ] **Step 1: Add rule to `PLAN_GENERATION_SYSTEM_PROMPT`**

In `constants/prompts.ts`, find the `Rules:` section inside `PLAN_GENERATION_SYSTEM_PROMPT`. After the line:
```
- If prefersSeasonalIngredients is true, favour seasonal produce for the current month
```

Add:
```
- Use cookFromScratchPreference (1=convenience food acceptable, 3=mix of fresh and pre-prepared, 5=always cook from raw ingredients) to guide ingredient processing level — at level 1 suggest pre-made sauces, pre-cut veg, ready-cooked grains; at level 5 use only whole raw ingredients
```

- [ ] **Step 2: Type-check**

```bash
npm run type-check
```

Expected: no errors (this file has no types to break).

- [ ] **Step 3: Run full test suite**

```bash
npm test --no-coverage
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add constants/prompts.ts
git commit -m "feat: use cookFromScratchPreference in Claude plan generation prompt"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** DB column ✓ | Types ✓ | Store ✓ | Mapper ✓ | UI ✓ | Prompt ✓
- [x] **No placeholders:** All steps contain exact code
- [x] **Type consistency:** `cookFromScratchPreference` spelled identically in all tasks; `cook_from_scratch_preference` (snake_case) used for all DB references
- [x] **Default value:** `3` (Mix) used consistently in migration DEFAULT, initialState, and mapper fallback
- [x] **Test coverage:** Store action tested in Task 3, mapper tested in Task 4
- [x] **Pattern match:** UI control is a direct copy of the `seasonalityImportance` control — same colors, same structure
