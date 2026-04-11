## Feature name
Meal Plan Generation (AI)

## Purpose
AI generiert automatisch einen personalisierten Wochenplan basierend auf Nutzerpräferenzen.

## Problem
Wöchentliche Mahlzeitenplanung ist zeitaufwändig. Nutzer brauchen einen vollständigen Plan auf Knopfdruck.

## Goal
Mit einem Tap wird ein vollständiger 7-Tage-Plan mit Rezepten, Nährwerten und Einkaufsliste generiert.

## Business / product value
Kern-Value-Proposition der App. Ohne diese Feature gibt es kein PlatePlan.

## Scope
- `POST /api/plan/generate` — vollständiger Wochenplan via DeepSeek
- Berücksichtigt: User-Präferenzen, Household-Mitglieder, Blacklist, Batch-Cooking-Einstellung
- Regeneriere einzelnen Meal Slot: `POST /api/plan/regenerate-meal`
- Ergebnis in Supabase gespeichert (meal_plans + planned_meals)

## Out of scope
Manuelle Plan-Erstellung, Drag & Drop Planung
