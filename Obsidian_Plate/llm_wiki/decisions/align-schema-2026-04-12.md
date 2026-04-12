---
title: Schema-Alignment — DB, Backend & Frontend vereinheitlicht
category: decision
last_updated: 2026-04-12
related: [[architecture/data-layer]], [[entities/household]], [[architecture/backend]]
---

# Schema-Alignment (2026-04-12)

## Problem

Nach der Household-Migration (`20260410000000`) gab es mehrere kritische Inkonsistenzen zwischen DB-Schema, Backend und Frontend:

### Kritische Bugs

**1. `planned_meals` hatte keine RLS-Policies**
`002_rls_policies.sql` hatte Policies die auf `meal_plans.user_id` referenzierten. Die Household-Migration droppte `meal_plans.user_id` mit `CASCADE` → alle `planned_meals`-Policies wurden stillschweigend gelöscht. RLS war enabled, aber null Policies → Frontend konnte keine Meal-Plans lesen.

**2. `profiles`-RLS blockierte Haushaltsmitglieder-Joins**
`household_members` joined mit `profiles(display_name)`, aber die alte SELECT-Policy erlaubte nur `auth.uid() = id` → andere Mitglieder gaben `null` zurück.

### Strukturelle Bugs

**3. Household-Settings in falscher Tabelle**
`managed_meal_slots`, `shopping_days`, `batch_cook_days` lagen in `user_preferences` (001_initial_schema) UND in `households` (20260410000000) — doppelt. Backend las aus `user_preferences` (falsch), Frontend schrieb post-Onboarding in keinen Save-Pfad.

**4. Fehlende Spalten in Online-DB**
`cook_from_scratch_preference` und `preferred_language` existierten in lokalen Migrations (005_*) aber wurden nie auf die Online-DB angewendet. Frontend nutzte `(row as any).cook_from_scratch_preference` als Workaround.

**5. `preferred_language` fehlte in Plan-Generierung**
`merge_preferences()` inkludierte sie nicht → AI-Output immer auf Englisch, egal welche Sprache der User eingestellt hatte.

## Lösung

### DB (via Supabase MCP direkt applied)

```sql
-- planned_meals RLS wiederhergestellt
CREATE POLICY "planned_meals: household member select" ...
CREATE POLICY "planned_meals: household member update" ...

-- profiles RLS erweitert
DROP POLICY "profiles: owner select";
CREATE POLICY "profiles: household member select" -- eigenes + co-member Profile

-- Household-Columns aus user_preferences entfernt
ALTER TABLE user_preferences DROP COLUMN managed_meal_slots, shopping_days, batch_cook_days, prefers_seasonal;

-- Fehlende Columns hinzugefügt
ALTER TABLE user_preferences ADD COLUMN cook_from_scratch_preference INTEGER DEFAULT 3;
ALTER TABLE user_preferences ADD COLUMN preferred_language TEXT DEFAULT 'en';
```

### Backend

- `preferences.py`: `managedMealSlots` aus `merge_preferences()` entfernt
- `plan.py`: lädt `managed_meal_slots` + `batch_cook_days` aus `households`; lädt `preferred_language` aus `user_preferences` des anfragenden Users (nicht gemerged — Sprache ist pro User)
- `shopping.py`: lädt `shopping_days` aus `households` statt `user_preferences`

### Frontend

- `lib/supabase.ts`: `cook_from_scratch_preference` typed; Household-Felder aus `user_preferences.Row` entfernt
- `types/index.ts`: `managedMealSlots`, `batchCookDays`, `shoppingDays` aus `UserPreferences` entfernt (leben auf `Household`)
- `step-complete.tsx`: Household-Felder aus upsert entfernt
- `hooks/useProfile.ts`: Household-Felder aus `useUpdatePreferences` entfernt
- `(tabs)/profile.tsx`: liest Planning/Shopping-Settings von `activeHousehold` statt `prefs`
- `settings/household.tsx`: **Neuer Screen** für post-Onboarding-Edits von Meal Slots, Batch Cook Days und Shopping Days — schreibt via `useUpdateHousehold` direkt in `households`

## Nachtrag: Weitere RLS-Bugs gefunden und gefixt

Bei vollständiger Inspektion aller Policies wurden noch 5 weitere Selbstreferenz-Bugs gefunden:

| Policy | Bug | Auswirkung |
|---|---|---|
| `households_select` | `hm.id` statt `households.id` | Niemand konnte Household lesen → App zeigte nichts |
| `households_update` | gleicher Bug | Owner konnte Settings nicht updaten |
| `household_members_select` | `hm2.household_id = hm2.household_id` | Alle Members für alle sichtbar |
| `meal_plans_member_access` | `hm.household_id = hm.household_id` | Alle Meal Plans für alle sichtbar |
| `shopping_lists_member_access` | gleicher Bug | Alle Shopping Lists für alle sichtbar |
| `household_invites_delete_owner` | `hm.household_id = hm.household_id` | Owner konnte fremde Invites löschen |

**Root Cause:** PostgreSQL's RLS-Policy-Editor löst Tabellennamen in Subqueries nicht automatisch auf den äußeren Table auf — wenn eine Spalte im Alias (`hm.id`) und im äußeren Table (`households.id`) gleich heißt, nimmt PostgreSQL stillschweigend den Alias. Immer äußeren Tabellennamen explizit qualifizieren: `meal_plans.household_id`, `households.id` etc.

## Folgeentscheidung: Migrations-Ordner entfernt

Da DB-Änderungen ausschließlich über den Supabase MCP gemacht werden, wurde `supabase/migrations/` gelöscht. Kein lokaler Schema-Stand mehr — MCP ist Single Source of Truth.

## Lessons Learned

- `DROP COLUMN CASCADE` ist gefährlich: löscht RLS-Policies ohne Warning → nach jeder CASCADE-Operation `SELECT * FROM pg_policies WHERE tablename = '...'` ausführen
- Service Role braucht keine INSERT-Policies (bypassed RLS) → niemals `WITH CHECK (true)` für service-only Inserts anlegen, das öffnet Security-Holes
- Lokale Migrationsdateien ≠ Online-DB-Stand: immer über Supabase MCP prüfen was wirklich applied ist
- `preferred_language` ist User-Level, nicht Household-Level → nicht in `merge_preferences()` aufnehmen, sondern separat für den anfragenden User laden
- **RLS Subquery-Falle:** Spaltenreferenzen in Subqueries immer mit dem äußeren Tabellennamen qualifizieren (`meal_plans.household_id`, nicht nur `household_id`). PostgreSQL löst sonst auf den Subquery-Alias auf und ergibt Tautologien oder falsche Vergleiche — ohne Fehler, nur falsches Ergebnis
