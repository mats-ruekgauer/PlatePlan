## Main user story
As a user after grocery shopping,
I want to scan my receipt to track how much my meal plan actually cost,
So that I can manage my food budget.

## Target users
- Budget-bewusste Nutzer

## Main flow
1. Nutzer öffnet Receipt-Scanner (aus Shopping Tab)
2. Fotografiert Kassenzettel
3. OCR extrahiert Artikel + Preise (process-receipt Edge Function)
4. Nutzer reviewed und korrigiert Artikel
5. Artikel werden dem aktuellen Wochenplan zugeordnet
6. Kosten-Summary erscheint

## Alternative flows
- Manuell Artikel hinzufügen wenn OCR unvollständig

## Error cases
- Foto zu dunkel / unscharf: Fehlermeldung + Retry
- OCR fehlerhaft: Manuelle Korrektur möglich

## Expected result
Kosten-Übersicht für die aktuelle Woche.
