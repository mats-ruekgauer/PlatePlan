## Final behavior
Nutzer können sich mit E-Mail/Passwort registrieren und einloggen. Session wird persistent gespeichert.

## Frontend implementation
- `app/(auth)/welcome.tsx` — Landing Screen
- `app/(auth)/sign-in.tsx` — Login Form
- `app/(auth)/sign-up.tsx` — Registration Form
- `app/_layout.tsx` — Auth-Guard: prüft Session + Onboarding-Status

## Backend / Database
- Supabase Auth (built-in)
- `profiles` Tabelle — Auto-erstellt bei Signup via Supabase Trigger

## Notes for future maintenance
- Auth-Guard in `_layout.tsx` ist die einzige Auth-Check-Stelle
- Session-Persistenz via Supabase SDK (AsyncStorage)
