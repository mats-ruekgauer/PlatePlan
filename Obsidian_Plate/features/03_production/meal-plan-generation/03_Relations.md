## Prerequisites
Features this feature depends on:
- [[onboarding]] — Präferenzen müssen gesetzt sein
- [[auth]] — JWT für Backend-Auth

## Builds on this feature
Features that should come later and build on this one:
- [[meal-plan-view]] — zeigt den generierten Plan
- [[shopping-list]] — aggregiert Zutaten aus dem Plan
- [[meal-feedback]] — verbessert zukünftige Generierungen

## Related UI / pages / components
- `app/(tabs)/index.tsx` (Generate-Button)
- `lib/api.ts` (callAPI)

## Shared data / logic
- `meal_plans` + `planned_meals` Tabellen
- `user_preferences` (Präferenzen + Blacklist)
- DeepSeek API

## Impact if changed
- Ändert sich das Plan-Schema brechen meal-plan-view + shopping-list
