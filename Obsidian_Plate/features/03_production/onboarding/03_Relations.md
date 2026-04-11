## Prerequisites
Features this feature depends on:
- [[auth]] — Nutzer muss eingeloggt sein

## Builds on this feature
Features that should come later and build on this one:
- [[meal-plan-generation]] — nutzt die hier gesetzten Präferenzen
- [[profile-settings]] — erlaubt nachträgliches Ändern dieser Einstellungen

## Related UI / pages / components
- `app/(onboarding)/` — alle 7 Step-Screens
- `stores/onboardingStore.ts`

## Shared data / logic
- `user_preferences` Tabelle — Quelle der Wahrheit für alle Präferenzen
- Zustand + AsyncStorage für Resume-Funktionalität

## Impact if changed
- Änderungen am Präferenz-Schema brechen Plan-Generierung
