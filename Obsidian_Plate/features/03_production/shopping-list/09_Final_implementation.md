## Final behavior
Nutzer generiert Einkaufsliste für die Woche. Liste ist kategorisiert, Zutaten sind summiert, Pantry-Items gefiltert.

## Backend implementation
- `POST /api/shopping/generate` — aggregiert alle Zutaten der Woche, gruppiert nach Kategorie

## Frontend implementation
- `app/(tabs)/shopping.tsx` — Shopping Tab mit Checkboxen

## Database / state changes
- `shopping_lists` Tabelle — gespeicherte Listen

## Notes for future maintenance
- Einkaufstage aus `user_preferences.shopping_days` fließen in Generierung ein
- Pantry-Zutaten aus `user_preferences.pantry` werden herausgefiltert
