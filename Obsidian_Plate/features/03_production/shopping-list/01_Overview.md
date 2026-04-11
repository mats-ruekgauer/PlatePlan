## Feature name
Shopping List

## Purpose
Automatische Einkaufsliste aus dem Wochenplan aggregiert nach Kategorien.

## Problem
Zutaten aus 7 Tagen manuell aufzulisten ist mühsam. Mengen müssen summiert werden.

## Goal
Nutzer bekommt mit einem Tap eine vollständige, kategorisierte Einkaufsliste für die Woche.

## Business / product value
Direkter praktischer Nutzen — spart echte Zeit beim Einkaufen.

## Scope
- `POST /api/shopping/generate` — Zutaten aggregieren nach Kategorie
- Shopping Tab: Kategorisierte Liste, Checkboxen
- Berücksichtigt Einkaufstage aus Onboarding
- Bereits vorhandene Pantry-Zutaten ausfiltern

## Out of scope
Preisvergleich, Supermarkt-Routing, Online-Bestellung (→ receipt-scanner separat)
