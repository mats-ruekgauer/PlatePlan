## Main user story
As an existing user,
I want to update my dietary preferences and goals after onboarding,
So that my meal plans stay relevant as my needs change.

## Target users
- Alle aktiven Nutzer

## Main flow
1. Nutzer öffnet Profile Tab
2. Navigiert zu Settings
3. Ändert Präferenzen (Ziele, Diät, Sprache, etc.)
4. Speichert → nächster Plan berücksichtigt neue Einstellungen

## Alternative flows
- Sprache ändern: sofort wirksam (EN/DE)
- Logout: Session beenden

## Error cases
- Speichern schlägt fehl: Toast + Retry

## Expected result
Aktualisierte Präferenzen in `user_preferences`.
