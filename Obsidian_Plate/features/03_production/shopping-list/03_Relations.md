## Prerequisites
- [[meal-plan-generation]] — braucht generierten Plan
- [[auth]]

## Builds on this feature
- [[receipt-scanner]] — scannt tatsächliche Einkäufe gegen die Liste

## Related UI / pages / components
- `app/(tabs)/shopping.tsx`

## Shared data / logic
- `shopping_lists` Tabelle
- `user_preferences.pantry` (wird herausgefiltert)
- `user_preferences.shopping_days`

## Impact if changed
- Schema-Änderungen betreffen Receipt Scanner (wenn implementiert)
