## Final behavior
Nutzer sieht Wochenplan im Home Tab. Kann durch Wochen navigieren, Mahlzeiten als gekocht markieren, Details ansehen.

## Frontend implementation
- `app/(tabs)/index.tsx` — Home/Meal Plan Tab
- `app/meal/[id].tsx` — Meal Detail Screen
- React Query cache: keyed by `weekStart` ISO-String
- Optimistische Updates bei Status-Änderungen (gekocht/übersprungen)

## Database / state changes
- `planned_meals.status` — geplant / gekocht / übersprungen

## Notes for future maintenance
- Nach jeder Status-Mutation: `queryClient.invalidateQueries(['mealPlan', weekStart])`
- HydratedMeal (aufgelöstes Recipe) ist was die UI konsumiert, niemals PlannedMeal direkt
