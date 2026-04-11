## Main user story
As a user with completed onboarding,
I want to generate a personalized weekly meal plan with one tap,
So that I don't have to plan my meals manually every week.

## Target users
- Alle aktiven Nutzer (wöchentlich)

## Main flow
1. Nutzer öffnet Home Tab
2. Tippt "Plan generieren"
3. Loading-State (DeepSeek generiert Plan)
4. Vollständiger 7-Tage-Plan erscheint mit Rezepten pro Slot

## Alternative flows
- Einzelnes Meal neu generieren: Tap auf Meal → "Ersetzen"
- Household: Plan berücksichtigt alle Mitglieder-Präferenzen

## Error cases
- API-Fehler: Fehlermeldung + "Erneut versuchen"
- Timeout: Fehlermeldung

## Expected result
Vollständiger Wochenplan mit Rezepten, Nährwerten und Zutaten.
