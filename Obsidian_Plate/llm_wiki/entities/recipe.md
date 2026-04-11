---
title: Recipe
category: entity
last_updated: 2026-04-12
related: [[entities/meal-plan]], [[conventions/mappers]]
---

# Recipe

## Konzept

Recipes sind die Grundbausteine des Meal Plans. Jedes PlannedMeal referenziert ein Recipe.
Im UI wird immer das HydratedMeal verwendet — d.h. das Recipe ist bereits aufgelöst.

## Mapper

Beim Lesen aus Supabase muss `mapRecipe()` aus `lib/supabase.ts` genutzt werden.
Niemals snake_case Felder direkt verwenden. Siehe [[conventions/mappers]].

## Wo gespeichert

In der Supabase-Datenbank. Reads über Supabase Client (mit RLS).
Writes über FastAPI Backend (Service Role, umgeht RLS).
