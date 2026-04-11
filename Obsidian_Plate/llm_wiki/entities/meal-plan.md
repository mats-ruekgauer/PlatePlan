---
title: Meal Plan — PlannedMeal vs HydratedMeal
category: entity
last_updated: 2026-04-12
related: [[architecture/data-layer]], [[conventions/mappers]], [[entities/recipe]]
---

# Meal Plan

## Zwei Typen — Kritischer Unterschied

### PlannedMeal
- **Was:** Roher DB-Row aus der Datenbank
- **Enthält:** Referenz auf Recipe (z.B. `recipe_id`), aber Recipe-Daten nicht aufgelöst
- **Wann nutzen:** Nur intern beim Lesen aus DB, vor dem Mapping

### HydratedMeal
- **Was:** PlannedMeal mit aufgelöstem Recipe
- **Enthält:** Alle PlannedMeal-Felder + vollständige Recipe-Daten
- **Wann nutzen:** Das ist was die UI konsumiert. Immer HydratedMeal im UI-Layer

## Faustregel

> UI konsumiert immer HydratedMeal, nie PlannedMeal direkt.

## Cache-Strategie

Wochenplan wird per `weekStart`-Datum gecacht (React Query Key).
Nach Mutation (z.B. Meal-Status ändern): relevante `weekStart` Keys invalidieren.
Details: [[conventions/react-query]]

## Optimistische Updates

Meal-Status-Änderungen updaten die UI sofort (optimistisch) und reverten bei Fehler.
