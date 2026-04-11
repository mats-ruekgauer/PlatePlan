## Feature name
Cook from Scratch Mode

## Purpose
Nutzer die ausschließlich oder hauptsächlich von Grund auf kochen wollen, bekommen Plans ohne Convenience-Produkte.

## Problem
`cook_from_scratch_preference` DB-Spalte existiert bereits, wird aber in der Plan-Generierung nicht explizit genutzt.

## Goal
Nutzer mit "Cook from Scratch"-Präferenz bekommt Rezepte die keine Fertigprodukte oder stark verarbeitete Zutaten enthalten.

## Business / product value
Spricht gesundheitsbewusste Nutzer-Segment an. Erhöht Plan-Qualität für diese Gruppe.

## Scope
- `cook_from_scratch_preference` in User Preferences UI sichtbar machen (falls nicht vorhanden)
- DeepSeek-Prompt: bei aktivierter Einstellung Constraint "keine Fertigprodukte" einbauen
- Rezept-Generierung: kürzere Zutatenlisten, unverarbeitete Zutaten bevorzugt

## Out of scope
Rezept-Klassifizierung (KI macht das im Prompt-Constraint)
