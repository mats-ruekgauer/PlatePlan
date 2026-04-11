## Main user story
As a user who cooked a meal,
I want to rate it and flag ingredients I didn't like,
So that future meal plans avoid those ingredients automatically.

## Target users
- Aktive Nutzer nach dem Kochen

## Main flow
1. Nutzer öffnet Meal Detail
2. Tippt "Bewerten"
3. Bewertet: Geschmack, Portionsgröße, Zubereitungszeit
4. Optional: "Zutat nicht gemocht" markieren
5. Absenden → Auto-Blacklist updates

## Alternative flows
- Schnell-Bewertung direkt aus der Plan-View

## Error cases
- Speichern schlägt fehl: Toast + Retry

## Expected result
Bewertung gespeichert, Blacklist updated, nächster Plan berücksichtigt es.
