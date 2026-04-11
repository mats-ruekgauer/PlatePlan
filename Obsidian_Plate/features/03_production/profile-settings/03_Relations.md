## Prerequisites
- [[onboarding]] — Settings spiegelt Onboarding-Daten
- [[auth]]

## Builds on this feature
- [[meal-plan-generation]] — nutzt aktualisierte Präferenzen

## Related UI / pages / components
- `app/(tabs)/profile.tsx`
- Settings Screens

## Shared data / logic
- `user_preferences` Tabelle (gleich wie Onboarding)

## Impact if changed
- Präferenz-Änderungen wirken sich direkt auf nächste Plan-Generierung aus
