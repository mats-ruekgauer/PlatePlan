---
title: Data Layer
category: architecture
last_updated: 2026-04-12
related: [[architecture/backend]], [[conventions/mappers]], [[conventions/auth]], [[entities/meal-plan]], [[entities/household]], [[decisions/align-schema-2026-04-12]]
---

# Data Layer

## Zwei Clients

### Supabase Client (`lib/supabase.ts`)
- Vollständige TypeScript-Typdefinitionen (`Database` Interface)
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
- Backend (Service Role Key) umgeht RLS → kann für alle User schreiben (Inserts/Deletes)
- **Service Role braucht keine INSERT-Policies** — sie bypassed RLS komplett
- **ACHTUNG:** `DROP COLUMN CASCADE` löscht stillschweigend RLS-Policies die auf diese Spalte referenzieren → nach jeder CASCADE-Operation `pg_policies` prüfen

## Household-Level vs User-Level Einstellungen

| Setting | Tabelle | Wer liest |
|---|---|---|
| `managed_meal_slots` | `households` | Backend `plan.py` |
| `batch_cook_days` | `households` | Backend `plan.py` |
| `shopping_days` | `households` | Backend `shopping.py` |
| `pantry_staples` | `user_preferences` | Backend `shopping.py` |
| `preferred_language` | `user_preferences` | Backend `plan.py` (nur requester, nicht gemerged!) |
| Calorie/Protein/Restrictions etc. | `user_preferences` | Backend via `merge_preferences()` |

## Frontend: Wo werden Household-Settings angezeigt/bearbeitet?

- **Anzeige** in `(tabs)/profile.tsx`: liest von `activeHousehold` (aus `useMyHouseholds()`), **nicht** aus `prefs`
- **Bearbeiten** via `/settings/household` (`settings/household.tsx`) → `useUpdateHousehold` → `households` Tabelle
- **Nicht mehr:** onboarding screens für post-onboarding Edits nutzen (die schreiben in den Store, nicht direkt in die DB)

## Mapper-Regel

**Immer** die Mapper-Funktionen aus `lib/supabase.ts` nutzen wenn DB-Rows gelesen werden.
Niemals snake_case Felder direkt in der UI verwenden. Siehe [[conventions/mappers]].
