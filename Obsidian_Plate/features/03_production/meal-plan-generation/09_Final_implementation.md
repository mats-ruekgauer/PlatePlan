## Final behavior
Nutzer tippt "Plan generieren" → vollständiger 7-Tage-Plan mit Rezepten erscheint. Einzelne Mahlzeiten können ersetzt werden.

## Backend implementation
- `POST /api/plan/generate` — DeepSeek-Prompt mit Nutzer-Präferenzen + Household-Mitglieder-Merging
- `POST /api/plan/regenerate-meal` — Einzelnen Slot neu generieren

## Database / state changes
- `meal_plans` — Ein Eintrag pro Woche pro Household
- `planned_meals` — Pro Slot (Mahlzeit + primäres/alternatives Rezept)
- `recipes` — AI-generierte Rezepte werden gespeichert

## API behavior
- Auth: Supabase JWT erforderlich
- Backend nutzt Service Role für alle Writes
- Präferenz-Merging: alle Household-Mitglieder-Präferenzen werden vor Prompt gemerged

## Notes for future maintenance
- DeepSeek API Key in `backend/.env`
- Blacklist wird aus `meal_feedback` aggregiert und in Prompt eingebaut
