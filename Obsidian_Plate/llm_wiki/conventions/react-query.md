---
title: React Query Konventionen
category: convention
last_updated: 2026-04-12
related: [[architecture/state-management]], [[entities/meal-plan]]
---

# React Query Konventionen

## Cache-Key Strategie

Meal-Plan-Daten werden per `weekStart`-Datum gecacht:

```typescript
// Query Key Format
['mealPlan', weekStart]  // weekStart = ISO-Datumsstring des Wochenbeginns
```

Damit kann der User durch Wochen browsen ohne Daten neu zu laden.

## Invalidierung nach Mutation

Nach jeder Mutation die Plan-Daten ändert:

```typescript
// Nach Meal-Status Änderung
queryClient.invalidateQueries({ queryKey: ['mealPlan', weekStart] });
```

Regel: **Nach jeder Mutation die Plan-Daten betrifft, relevante Query Keys invalidieren.**

## Hooks

Alle React Query Hooks leben in `hooks/`. Keine direkten `useQuery`/`useMutation` Calls
in Components — immer über dedizierte Hooks.

## Optimistische Updates

Meal-Status-Änderungen (z.B. "gekocht", "übersprungen"):
1. UI updates sofort (optimistisch)
2. Bei Fehler: revert auf vorherigen State
3. Kein Warten auf Server-Response für UX
