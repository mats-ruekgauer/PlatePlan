## Final behavior
Nutzer kann alle Ernährungspräferenzen, Ziele und Account-Settings nachträglich anpassen.

## Frontend implementation
- `app/(tabs)/profile.tsx` — Profile Tab
- Settings Screens: alle Onboarding-Präferenzen editierbar

## Database / state changes
- `user_preferences` — alle Settings werden direkt upgedated

## Notes for future maintenance
- Sprache (EN/DE) in `user_preferences.language`
- Nach Präferenz-Update: nächster Plan-Generate berücksichtigt neue Werte automatisch
