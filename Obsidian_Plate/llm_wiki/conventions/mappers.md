---
title: Mapper-Konvention
category: convention
last_updated: 2026-04-12
related: [[architecture/data-layer]], [[entities/meal-plan]], [[entities/recipe]]
---

# Mapper-Konvention

## Regel

**Immer** die Mapper-Funktionen aus `lib/supabase.ts` nutzen wenn DB-Rows gelesen werden.
Niemals snake_case Felder direkt in der UI-Schicht verwenden.

## Warum

Supabase gibt snake_case zurück (`meal_plan`, `recipe_id`).
Die UI-Schicht nutzt camelCase (`mealPlan`, `recipeId`).
Mapper-Funktionen sind die einzige Stelle wo diese Transformation passiert.

## Verfügbare Mapper

| Funktion | Transformiert |
|----------|---------------|
| `mapMealPlan()` | PlannedMeal DB-Row → camelCase |
| `mapRecipe()` | Recipe DB-Row → camelCase |

## Anti-Pattern

```typescript
// FALSCH — snake_case direkt in UI
const title = recipe.recipe_title;

// RICHTIG — Mapper nutzen
const mapped = mapRecipe(recipe);
const title = mapped.recipeTitle;
```
