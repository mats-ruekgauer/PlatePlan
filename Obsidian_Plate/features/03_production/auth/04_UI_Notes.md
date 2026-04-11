## Screens / pages affected
- Welcome Screen
- Sign-In Screen
- Sign-Up Screen

## New UI elements
- E-Mail + Passwort Input Fields
- "Einloggen" / "Registrieren" Buttons
- Fehler-States unter Feldern

## Placement
Auth-Screens in `(auth)/` Route Group, vor allen anderen Screens

## User interactions
- Formular ausfüllen und absenden
- Zwischen Sign-In und Sign-Up wechseln

## Loading states
- Button disabled + Spinner während Auth-Request

## Success states
- Automatische Weiterleitung zu Onboarding (neu) oder Home (bekannt)

## Error states
- Inline-Fehlermeldung unter betroffenen Feldern
- `colors.danger` (#DC2626)

## Design constraints
- Primary Color: `#2D6A4F`

## Reuse existing components
- Standard Input-Komponenten
