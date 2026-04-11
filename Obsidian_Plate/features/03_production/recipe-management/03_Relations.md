## Prerequisites
- [[meal-plan-generation]] — AI-Rezepte werden bei Generierung erstellt
- [[auth]]

## Builds on this feature
- [[favorites-management]] — baut auf Recipe-List auf
- [[dish-list]] — Rezepte können zur Wunschliste hinzugefügt werden

## Related UI / pages / components
- `app/(tabs)/recipes.tsx`
- `app/recipe/[id].tsx`
- `app/recipe/new.tsx`

## Shared data / logic
- `recipes` Tabelle mit JSONB Zutaten + Nährwerten
- `mapRecipe()` Mapper aus `lib/supabase.ts`

## Impact if changed
- Recipe-Schema-Änderungen betreffen Meal Plan View + Favorites
