## Main user story
As a new user after registration,
I want to configure my dietary goals and preferences in a guided flow,
So that the AI can generate personalized meal plans for me.

## Target users
- Alle Nutzer direkt nach der Registrierung

## Main flow
1. Nach Sign-Up → automatisch zum Onboarding weitergeleitet
2. Step 1: Kalorien- und Protein-Ziele eingeben
3. Step 2: Diätpräferenzen + Lieblingsküchen
4. Step 3: Meal Slots konfigurieren (Frühstück/Mittag/Abend/Snack)
5. Step 4: Einkaufstage festlegen
6. Step 5: Batch-Cooking Einstellung
7. Step 6: Pantry-Grundzutaten eintragen
8. Step 7: Abschluss → Weiterleitung zur App

## Alternative flows
- App crasht mid-flow: State in AsyncStorage → Resume beim nächsten Start

## Error cases
- Pflichtfelder leer: Weiter-Button disabled

## Expected result
Nutzer hat vollständig konfigurierte `user_preferences` und landet auf dem Home Screen.
