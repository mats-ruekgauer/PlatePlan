## Prerequisites
- [[meal-plan-view]] — Feedback erfolgt auf eine Mahlzeit
- [[auth]]

## Builds on this feature
- [[meal-plan-generation]] — nutzt Blacklist aus Feedback

## Related UI / pages / components
- `app/meal/[id].tsx` (Feedback-UI)

## Shared data / logic
- `meal_feedback` Tabelle
- `user_preferences.blacklisted_ingredients`

## Impact if changed
- Blacklist-Logik beeinflusst direkt Plan-Generierung
