# Cook from Scratch Preference — Design Spec

**Issue:** #5 — Preferences: processed ingredients  
**Date:** 2026-04-10  
**Status:** Approved

## Overview

Add a 5-step "Cooking from scratch" preference that tells Claude how much pre-processed / convenience food is acceptable when generating meal plans. The setting lives exclusively in the Food Preferences settings screen (`app/settings/preferences.tsx`) — not in onboarding.

## Data Model

**Field name:** `cookFromScratchPreference`  
**Type:** `1 | 2 | 3 | 4 | 5`  
**Default:** `3` (Mix)

| Value | Label |
|-------|-------|
| 1 | Convenience |
| 2 | Mostly prep |
| 3 | Mix |
| 4 | Mostly scratch |
| 5 | Always scratch |

## UI

The control sits in `app/settings/preferences.tsx`, below the "Seasonal ingredients" segmented control. It is identical in structure to the existing `seasonalityImportance` control: 5 pressable segments, filled green left-to-right up to the selected value, current label shown top-right.

- Title: **"Cooking from scratch"**
- Subtitle: *"How much do you prefer cooking from raw ingredients?"*
- Current label displayed in `#2D6A4F` bold (top-right)

On Save, the value is written to Supabase alongside the other preference fields.

## Changes Required

### 1. DB Migration — `supabase/migrations/005_cook_from_scratch.sql`
```sql
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS cook_from_scratch_preference INTEGER NOT NULL DEFAULT 3
    CHECK (cook_from_scratch_preference BETWEEN 1 AND 5);
```

### 2. TypeScript Types — `types/index.ts`
Add `cookFromScratchPreference: 1 | 2 | 3 | 4 | 5` to both `OnboardingState` and `UserPreferences`.

### 3. Zustand Store — `stores/onboardingStore.ts`
- Add `cookFromScratchPreference: 3` to `initialState` (under Step 2 — Preferences)
- Add `setCookFromScratchPreference: (value: 1 | 2 | 3 | 4 | 5) => void` action (mirrors `setSeasonalityImportance`)

### 4. Mapper — `lib/supabase.ts`
In `mapUserPreferences`, add:
```ts
cookFromScratchPreference: (row.cook_from_scratch_preference ?? 3) as 1 | 2 | 3 | 4 | 5,
```

### 5. Settings Screen — `app/settings/preferences.tsx`
- Add `COOK_FROM_SCRATCH_LABELS = ['Convenience', 'Mostly prep', 'Mix', 'Mostly scratch', 'Always scratch']`
- Load `cook_from_scratch_preference` from DB on mount and call `store.setCookFromScratchPreference`
- Add the segmented control UI block below Seasonality
- Include `cook_from_scratch_preference: store.cookFromScratchPreference` in the `handleSave` update call

### 6. Claude Prompt — `constants/prompts.ts`
Add a rule to `PLAN_GENERATION_SYSTEM_PROMPT`:
```
- Use cookFromScratchPreference (1=convenience food OK, 3=mix, 5=always cook from raw ingredients) to guide ingredient processing level in recipes
```

## Out of Scope

- Onboarding step — setting is profile-only
- Profile summary card — not shown on the main profile screen
- Any changes to the `useUpdatePreferences` hook (the settings screen uses direct Supabase calls, consistent with its existing pattern)
