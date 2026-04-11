## Feature name
Meal Feedback & Auto-Blacklist

## Purpose
Nutzer können Mahlzeiten bewerten und ungemochte Zutaten automatisch blacklisten.

## Problem
Ohne Feedback-Loop generiert die AI immer ähnliche Pläne, auch wenn Nutzer bestimmte Zutaten nicht mögen.

## Goal
Bewertete Mahlzeiten verbessern automatisch zukünftige Plan-Generierungen.

## Business / product value
Personalisierung über Zeit — App wird mit Nutzung besser.

## Scope
- `POST /api/feedback` — Feedback speichern + Auto-Blacklist trigger
- Rating: Geschmack, Portionsgröße, Zubereitungszeit
- Auto-Blacklist: Bei negativem Feedback werden Hauptzutaten zur Blacklist hinzugefügt
- Blacklist fließt in nächste Plan-Generierung ein

## Out of scope
Detaillierte Bewertungshistorie, Empfehlungs-Engine
