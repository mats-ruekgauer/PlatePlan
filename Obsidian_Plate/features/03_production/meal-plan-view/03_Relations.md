## Prerequisites
- [[meal-plan-generation]] — Plan muss vorhanden sein
- [[auth]] — eingeloggt sein

## Builds on this feature
- [[meal-feedback]] — Feedback auf Mahlzeiten aus dieser View
- [[shopping-list]] — wird aus demselben Plan generiert

## Related UI / pages / components
- `app/(tabs)/index.tsx`
- `app/meal/[id].tsx`

## Shared data / logic
- `planned_meals` + `meal_plans` Tabellen
- React Query Cache mit `weekStart`-Key
- HydratedMeal (PlannedMeal + aufgelöstes Recipe)

## Impact if changed
- Cache-Key-Änderung würde Shopping List und Feedback-Flows betreffen
