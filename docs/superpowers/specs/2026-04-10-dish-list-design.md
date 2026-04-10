# Dish List — Design Spec

**Issue:** #7  
**Date:** 2026-04-10  
**Status:** Approved

## Summary

A new "Recipes" tab (currently hidden) with two internal tabs:

1. **Verlauf** — history of every dish the user actually cooked, with the week it was cooked
2. **Meine Rezepte** — manually entered personal recipes that are also fed into plan generation

---

## Database

### Migration: add `source` column to `recipes`

```sql
ALTER TABLE recipes ADD COLUMN source text NOT NULL DEFAULT 'ai_generated';
-- Allowed values: 'ai_generated' | 'manual'
```

All existing rows default to `'ai_generated'`. Manually entered recipes are inserted with `source = 'manual'`.

---

## Type changes

`types/index.ts` — add field to `Recipe`:

```ts
source: 'ai_generated' | 'manual';
```

`lib/supabase.ts` — `mapRecipe` maps `row.source` to `recipe.source`.

---

## Verlauf Tab (History)

### Data

New hook `hooks/useCookedMeals.ts`:

- Query: `planned_meals` where `status IN ('cooked', 'prepared')`, joined to `meal_plans` (for `week_start`) and `recipes`
- The resolved recipe is `chosenRecipeId ?? recipeId` (the actually-cooked recipe, not the default)
- Returns: `{ recipe: Recipe; weekStart: string; plannedMealId: string }[]`
- Sorted by `meal_plans.week_start` descending (most recent first)
- No deduplication — every cooked instance appears as its own entry

### UI

Each card shows:
- Recipe title
- Cuisine (if present)
- "KW {week} · {year}" derived from `weekStart`
- kcal + protein + cook time (same chips as existing `RecipeCard`)

Tap → existing `app/recipe/[id].tsx` detail screen (no changes needed there).

Empty state: "Noch keine Gerichte gekocht. Generiere deinen ersten Plan!"

---

## Meine Rezepte Tab (My Recipes)

### Data

Queries `recipes` where `user_id = current_user AND source = 'manual'`, ordered by `created_at` descending.

### UI

- List of cards (same `RecipeCard` component)
- FAB (+ button, bottom-right) navigates to `app/recipe/new.tsx`
- Empty state: "Noch keine eigenen Rezepte. Tippe auf + um ein Rezept hinzuzufügen."

### New screen: `app/recipe/new.tsx`

Full recipe entry form with:

| Field | Type | Required |
|---|---|---|
| Titel | text | yes |
| Beschreibung | text (multiline) | no |
| Cuisine | text | no |
| Koch-Zeit (min) | number | no |
| Portionen | number | no (default 1) |
| Zutaten | dynamic list: Name + Menge + Einheit | no |
| Schritte | dynamic list: Freitext | no |
| Tags | comma-separated text | no |
| kcal / Protein / Carbs / Fett | numbers | no |

On save: `INSERT INTO recipes` with `user_id = current_user`, `source = 'manual'`.  
On success: navigate back to Meine Rezepte tab, invalidate `['recipes']` query key.

Header: back button (‹) + "Speichern" button (top-right).

---

## Plan Generation Integration

`supabase/functions/generate-plan/index.ts`:

1. After loading user preferences, fetch all `recipes` where `user_id = current_user AND source = 'manual'`
2. If any exist, append to the Claude prompt:

> "The user has added the following personal recipes to their collection. Include them in the plan where they fit the user's preferences and goals: [list of recipe titles with brief descriptions]"

3. If no manual recipes exist, the prompt is unchanged.

---

## Navigation

`app/(tabs)/_layout.tsx`:

- Remove `href: null` from the `recipes` tab
- Set title: `"Recipes"`, icon: `📖`

---

## Files Changed / Created

| File | Change |
|---|---|
| `app/(tabs)/recipes.tsx` | Refactor: add internal tab switcher (Verlauf / Meine Rezepte) |
| `app/(tabs)/_layout.tsx` | Unhide recipes tab |
| `app/recipe/new.tsx` | New: recipe entry form |
| `hooks/useCookedMeals.ts` | New: history query hook |
| `lib/supabase.ts` | Add `source` to `mapRecipe` |
| `types/index.ts` | Add `source` to `Recipe` |
| `supabase/functions/generate-plan/index.ts` | Include manual recipes in prompt |
| DB migration | Add `source` column to `recipes` |
