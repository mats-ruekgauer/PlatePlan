---
title: Household
category: entity
last_updated: 2026-04-12
related: [[architecture/backend]], [[conventions/auth]], [[architecture/data-layer]], [[decisions/align-schema-2026-04-12]]
---

# Household

## Konzept

Mehrere User können einem Household angehören und einen gemeinsamen Meal-Plan teilen. Meal-Plans gehören einem Household, nicht einem einzelnen User.

## DB-Tabelle `households`

| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | uuid | Primary key |
| `name` | text | Haushaltsname |
| `created_by` | uuid | Ersteller (FK → auth.users) |
| `managed_meal_slots` | text[] | Welche Slots geplant werden (z.B. ["dinner"]) |
| `shopping_days` | int[] | Einkaufstage (JS-Konvention: 0=So, 1=Mo … 6=Sa) |
| `batch_cook_days` | int | Wie viele Tage ein Gericht reicht (1–3) |

**Wichtig:** Diese Einstellungen leben auf dem Household, nicht auf `user_preferences`. Beim Onboarding werden sie via `POST /api/households` gespeichert. Post-Onboarding-Edits laufen über `/settings/household` → `useUpdateHousehold`.

## Invite-Flow

1. Owner ruft `POST /api/households` → erstellt Household + ersten Invite-Token (SHA-256 gehashed in DB)
2. Invite-Link (`plateplan://invite/<token>`) wird geteilt
3. Neuer User ruft `POST /api/households/join` mit Token → tritt bei, `uses_count` wird inkrementiert
4. Token kann via `POST /api/households/{id}/invite` rotiert werden (alte Tokens gelöscht)
5. Tokens haben `expires_at` und optional `usage_limit` (null = unbegrenzt)

## RLS

- `households`: SELECT/UPDATE für Mitglieder (nur Owner kann updaten); INSERT via Service Role
- `household_members`: SELECT für alle Mitglieder desselben Haushalts; INSERT/DELETE via Service Role
- `household_invites`: SELECT für alle authentifizierten User (Join-Validierung); DELETE für Owner

## Profiles-RLS-Sonderfall

`household_members` joiniert oft mit `profiles(display_name)`. Dafür muss die `profiles`-Tabelle für Haushaltsmitglieder lesbar sein — nicht nur für den eigenen User. Die Policy `profiles: household member select` erlaubt das seit dem align_schema-Migration (2026-04-12).

## API-Endpunkte

| Endpunkt | Zweck |
|----------|-------|
| `POST /api/households` | Household erstellen + Invite-Token generieren |
| `POST /api/households/join` | Household via Token beitreten |
| `POST /api/households/{id}/invite` | Invite-Link rotieren (alten löschen) |

## Frontend-Hooks

| Hook | Zweck |
|---|---|
| `useMyHouseholds()` | Alle Haushalte des Users laden |
| `useHouseholdMembers(id)` | Mitglieder eines Haushalts |
| `useCreateHousehold()` | Neuen Haushalt erstellen |
| `useJoinHousehold()` | Via Token beitreten |
| `useUpdateHousehold()` | Name/Slots/ShoppingDays/BatchCook updaten |
| `useShareInvite()` | Link generieren + iOS Share Sheet öffnen |
