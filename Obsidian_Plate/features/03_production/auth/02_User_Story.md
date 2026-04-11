## Main user story
As a new user,
I want to register with my email and password,
So that I can access my personalized meal plan.

## Target users
- Neue Nutzer die PlatePlan zum ersten Mal öffnen
- Bestehende Nutzer die sich neu einloggen

## Main flow
1. Nutzer öffnet App → Welcome Screen
2. Tippt "Registrieren" → Sign-Up Screen (E-Mail + Passwort)
3. Konto erstellt → automatisch weitergeleitet zu Onboarding
4. Bei erneutem Öffnen: direkt eingeloggt (Session persistent)

## Alternative flows
- Bestehender Account: "Einloggen" → Sign-In Screen
- Session abgelaufen: automatisch zur Welcome Screen

## Error cases
- E-Mail bereits vergeben: Fehlermeldung unter dem Feld
- Falsches Passwort: Fehlermeldung

## Expected result
Nutzer ist eingeloggt und hat eine persistente Session.
