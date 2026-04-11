---
title: Data Layer
category: architecture
last_updated: 2026-04-12
related: [[architecture/backend]], [[conventions/mappers]], [[conventions/auth]], [[entities/meal-plan]]
---

# Data Layer

## Zwei Clients

### Supabase Client (`lib/supabase.ts`)
- Vollständige TypeScript-Typdefinitionen
- CamelCase-Mapper-Funktionen: `mapMealPlan`, `mapRecipe` etc.
- Transformiert snake_case DB-Rows → camelCase für UI
- Genutzt für: Auth + direkte DB-Reads (mit RLS)

### FastAPI Client (`lib/api.ts`)
- `callAPI()` schickt Requests ans FastAPI Backend
- Hängt automatisch den Supabase JWT als `Authorization: Bearer` Header an
- Genutzt für: alle AI-Operationen, Meal-Plan-Generierung, Shopping

## Zugriffsmuster

```
Frontend → Supabase Client → Supabase DB (RLS, Anon Key)
Frontend → FastAPI Client  → FastAPI Backend → Supabase DB (Service Role, keine RLS)
```

## RLS (Row Level Security)

- Client (Anon Key) unterliegt RLS → User sieht nur eigene Daten
- Backend (Service Role Key) umgeht RLS → kann für alle User schreiben (z.B. bei Household-Operationen)
- Optimistische Updates: UI updated sofort, revert bei Fehler

## Mapper-Regel

**Immer** die Mapper-Funktionen aus `lib/supabase.ts` nutzen wenn DB-Rows gelesen werden.
Niemals snake_case Felder direkt in der UI verwenden. Siehe [[conventions/mappers]].
