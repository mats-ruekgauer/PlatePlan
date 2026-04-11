## Final behavior
Nutzer sieht alle Rezepte (AI + manuell) in der Recipes-Tab. Kann Details ansehen und neue manuell anlegen.

## Frontend implementation
- `app/(tabs)/recipes.tsx` — Recipes Tab (History + Manual)
- `app/recipe/[id].tsx` — Recipe Detail Screen
- `app/recipe/new.tsx` — Recipe Creation Screen

## Database / state changes
- `recipes` Tabelle: `source` Feld unterscheidet `ai_generated` vs `manual`
- JSONB-Felder für Zutaten + Nutrition Facts

## Notes for future maintenance
- Mapper: immer `mapRecipe()` aus `lib/supabase.ts` nutzen
- AI-Rezepte werden automatisch bei Plan-Generierung gespeichert
