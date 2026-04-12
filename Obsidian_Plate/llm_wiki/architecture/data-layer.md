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
- Genutzt für: Auth + direkte DB-Reads (mit RLS), solange der Read-Pfad stabil ist

### FastAPI Client (`lib/api.ts`)
- `callAPI()` schickt Requests ans FastAPI Backend
- Hängt automatisch den Supabase JWT als `Authorization: Bearer` Header an
- Genutzt für: **alle Writes** + AI-Operationen + Household-Reads (historisch)

## Zugriffsmuster

```
Frontend → Supabase Client → Supabase DB (RLS, Anon Key)     ← nur Reads
Frontend → FastAPI Client  → FastAPI Backend → Supabase DB (Service Role, keine RLS)  ← alle Writes
```

### Write-Regel (seit 2026-04-12, vollständig durchgesetzt)

**Kein direkter Supabase-Write aus dem Frontend.** Alle Mutationen laufen über FastAPI:

| Hook | Endpoint |
|------|----------|
| `useSwapMeal` | `POST /api/plan/swap-meal` |
| `useUpdateMealStatus` | `POST /api/plan/update-meal-status` |
| `useToggleShoppingItem` | `POST /api/shopping/toggle-item` |
| `useMarkListExported` | `POST /api/shopping/mark-exported` |
| `useUpdateDisplayName` | `POST /api/profile/update-display-name` |
| `useUpdatePreferences` | `POST /api/profile/update-preferences` |
| `useToggleFavorite` | `POST /api/favorites/toggle` |
| `useAddCustomFavorite` | `POST /api/favorites/add-custom` |
| `useRemoveFavorite` | `POST /api/favorites/remove` |
| `useUpsertAutomation` | `POST /api/automations/upsert` |
| `useDeleteAutomation` | `POST /api/automations/delete` |

### Household-Reads (seit 2026-04-12 via Supabase direkt)

`useMyHouseholds` und `useHouseholdMembers` lesen jetzt direkt via Supabase Client (anon key + RLS). FastAPI-Endpunkte `/api/households/mine` und `/{id}/members` existieren noch im Backend, werden aber nicht mehr vom Frontend aufgerufen.

Damit gilt: **alle Tabellen** werden direkt via Supabase Client gelesen. Supabase Realtime kann für alle Tabellen subscribed werden.

## PostgREST-Fallen im Backend

- `maybe_single().execute()` darf nicht wie ein normales Response-Objekt behandelt werden; bei 0 Rows kommt `None`
- PostgREST-Relationen im `select()` sind nur stabil, wenn der FK in der Live-DB wirklich existiert und im Schema-Cache liegt
- Wenn eine Relation optional oder instabil ist, im Backend lieber zwei explizite Reads machen und serverseitig mergen
- AI-Antworten dürfen nicht blind in numerische DB-Spalten geschrieben werden; Schema-Normalisierung gehört vor den Insert

## RLS (Row Level Security)

- Client (Anon Key) unterliegt RLS → User sieht nur eigene Daten
- Backend (Service Role Key) umgeht RLS → kann für alle User schreiben (Inserts/Deletes)
- **Service Role braucht keine INSERT-Policies** — sie bypassed RLS komplett
- **ACHTUNG:** `DROP COLUMN CASCADE` löscht stillschweigend RLS-Policies die auf diese Spalte referenzieren → nach jeder CASCADE-Operation `pg_policies` prüfen

### Recursion-Falle bei self-referentiellen Policies

**Problem:** `household_members` hatte eine SELECT-Policy, die `household_members` selbst abfragte:
```sql
-- BROKEN: queries household_members from inside a policy ON household_members
EXISTS (SELECT 1 FROM household_members hm2
  WHERE hm2.household_id = household_members.household_id
  AND hm2.user_id = auth.uid())
```
→ PostgreSQL Error `42P17: infinite recursion detected in policy for relation "household_members"`.

Weil viele andere Policies (`households_select`, `meal_plans_member_access`, `shopping_lists_member_access`, `planned_meals` etc.) `household_members` in EXISTS-Subqueries abfragen, lösten sie dieselbe Rekursion aus. Ergebnis: leere Arrays statt Fehlermeldung — extrem schwer zu debuggen.

**Fix (2026-04-12):** `SECURITY DEFINER` Funktion `auth_user_household_ids()` die `household_members` **ohne RLS** liest:
```sql
CREATE OR REPLACE FUNCTION public.auth_user_household_ids()
RETURNS SETOF uuid LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT household_id FROM household_members WHERE user_id = auth.uid();
$$;
```
Policy ersetzt durch:
```sql
CREATE POLICY "household_members_select" ON household_members
FOR SELECT USING (household_id IN (SELECT auth_user_household_ids()));
```
Alle anderen Policies, die `household_members` in Subqueries abfragen, lösen nun keine Rekursion mehr aus, weil die neue `household_members_select`-Policy selbst keine weitere `household_members`-Query auslöst.

**Regel:** Policies auf Tabelle X dürfen Tabelle X **nie direkt** abfragen. Immer `SECURITY DEFINER` Hilfsfunktion verwenden.

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
- **Bearbeiten** via `/settings/household` (`settings/household.tsx`) → `useUpdateHousehold` → FastAPI `/api/households/{id}/update` → `households` Tabelle
- **Nicht mehr:** onboarding screens für post-onboarding Edits nutzen (die schreiben in den Store, nicht direkt in die DB)

## Household Cache-Verhalten

- `useMyHouseholds()` und `useHouseholdMembers()` nutzen `staleTime: 0`
- Nach `create`, `join`, `update`, `leave` wird `['households', 'mine']` invalidiert
- Persistierter Zustand (`activeHouseholdId`) wird gegen die frisch geladenen Haushalte validiert und bei Bedarf automatisch auf den ersten gültigen Haushalt gesetzt

## Mapper-Regel

**Immer** die Mapper-Funktionen aus `lib/supabase.ts` nutzen wenn DB-Rows gelesen werden.
Niemals snake_case Felder direkt in der UI verwenden. Siehe [[conventions/mappers]].
