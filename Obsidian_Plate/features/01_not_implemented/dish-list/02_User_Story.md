## Main user story
As a meal planner,
I want to add specific dishes I'm craving to a wish list,
So that the AI includes them in my next generated plan.

## Target users
- Alle aktiven Nutzer

## Main flow
1. Nutzer öffnet Dish List (z.B. im Meal Plan Screen)
2. Tippt "+ Gericht hinzufügen" → Freitext oder aus Rezepten wählen
3. Generiert neuen Plan → gewünschte Gerichte sind eingeplant
4. Gerichte werden nach Einplanung als "done" markiert

## Alternative flows
- Gericht manuell als Text eingeben (AI interpretiert es)
- Mehrere Gerichte gleichzeitig hinzufügen

## Error cases
- Gericht nicht eindeutig interpretierbar: AI ignoriert es und plant normal

## Expected result
Plan enthält die gewünschten Gerichte an passenden Tagen.
