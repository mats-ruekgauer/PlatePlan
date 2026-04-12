---
title: Household
category: entity
last_updated: 2026-04-12 (Invite-Flow Redesign)
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

### Redesignter Flow (ab 2026-04-12)

**Invite-Erstellung:**
1. Owner erstellt Household → ein erster Invite-Code wird automatisch generiert
2. Invite-Screen (`/household/invite`) wird direkt nach Erstellung gezeigt
3. Screen zeigt QR-Code (`plateplan://invite/PP-XXXXXX`) + Kurz-Code (z.B. `PP-K7M2A9`)
4. Echte Restzeit aus `expires_at` berechnet (Ablauf nach 6h)

**Invite-Abruf (kein Rotate):**
- `POST /api/households/{id}/current-invite` → gibt bestehenden gültigen Code zurück
- Nur wenn kein gültiger Code existiert → wird ein neuer erstellt
- Öffnen des Invite-Screens rotiert den Code **nicht** mehr

**Rotate (explizit):**
- "Neuen Code generieren"-Button → `POST /api/households/{id}/invite` → alten Code löschen, neuen erstellen

**Join-Flow:**
- QR-Code scannen: Deep-Link `plateplan://invite/PP-XXXXXX` → `invite/[token].tsx` erkennt PP-Format → ShortCode-Join
- Manuell: User tippt `PP-XXXXXX` in masked Input (PP- vorangestellt) → ShortCode-Join

**Mehrfachnutzung:** `usage_limit = null` = unbegrenzt. Beliebig viele User können denselben Code nutzen.

### DB `household_invites`

| Spalte | Typ | Beschreibung |
|---|---|---|
| `token_hash` | text | SHA-256 des Raw-Tokens (Raw-Token wird nie gespeichert) |
| `short_code` | text UNIQUE | `PP-XXXXXX` Klartext (6 alphanummerische Zeichen, keine O/0/I/1) |
| `expires_at` | timestamptz | Ablaufzeit (6h ab Erstellung) |
| `usage_limit` | int nullable | null = unbegrenzt |
| `uses_count` | int | Wird bei jedem Join inkrementiert |

**Wichtig:** Raw-Token wird nie in der DB gespeichert — nur der SHA-256-Hash. Der QR-Code codiert deshalb die Short-Code-URL, nicht die Token-URL.

## RLS

- `households`: SELECT/UPDATE für Mitglieder (nur Owner kann updaten); INSERT via Service Role
- `household_members`: SELECT für alle Mitglieder desselben Haushalts; INSERT/DELETE via Service Role
- `household_invites`: SELECT für alle authentifizierten User (Join-Validierung); DELETE für Owner

## Profiles-Sonderfall

`household_members` wird oft mit `profiles(display_name)` kombiniert. Dafür muss die `profiles`-Tabelle für Haushaltsmitglieder lesbar sein — nicht nur für den eigenen User.

Wichtig:
- clientseitige Reads hängen dabei an funktionierenden RLS-Policies
- backendseitige Household-Reads laufen inzwischen bewusst über FastAPI/Service-Role, damit die UI nicht an leeren Client-Reads hängen bleibt
- der Member-Screen nutzt `POST /api/households/{id}/members` als kanonischen Read-Pfad

## API-Endpunkte

| Endpunkt | Zweck |
|----------|-------|
| `POST /api/households` | Household erstellen + ersten Invite-Code generieren |
| `POST /api/households/mine` | Alle Haushalte des aktuellen Users laden |
| `POST /api/households/join` | Via `{ token }` oder `{ shortCode }` beitreten |
| `POST /api/households/{id}/members` | Mitglieder eines Haushalts laden |
| `POST /api/households/invite-info` | Haushaltsnamen für Einladung abrufen (ohne beizutreten) |
| `POST /api/households/{id}/current-invite` | Aktuellen gültigen Invite-Code abrufen (kein Rotate) |
| `POST /api/households/{id}/invite` | Invite-Code rotieren (explizit, alten löschen) |
| `POST /api/households/{id}/update` | Household-Name und Planungseinstellungen updaten |
| `POST /api/households/{id}/leave` | Aktuellen User aus Household entfernen |

## Read-/Write-Flow

- Household **Create/Join/Invite/Update/Leave** laufen über FastAPI mit Service Role
- Household **Reads** (`mine`, `members`) laufen ebenfalls über FastAPI, nicht mehr direkt über den Supabase Client
- Grund: Die Daten existierten in `households` + `household_members`, aber clientseitige Reads konnten wegen RLS-/Read-Pfad-Problemen trotz vorhandener Daten `[]` liefern
- `useMyHouseholds()` setzt `activeHouseholdId` auf den ersten gültigen Haushalt zurück, wenn der persistierte Zustand veraltet ist

## Frontend-Hooks

| Hook | Zweck |
|---|---|
| `useMyHouseholds()` | Alle Haushalte des Users laden |
| `useHouseholdMembers(id)` | Mitglieder eines Haushalts |
| `useCreateHousehold()` | Neuen Haushalt erstellen |
| `useJoinHousehold()` | Via `{ token? }` oder `{ shortCode? }` beitreten |
| `useCurrentInvite(id)` | Aktuellen gültigen Code abrufen (kein Rotate, 30s stale-time) |
| `useShareInvite()` | Code rotieren (explizit) — invalidiert `current-invite` Cache |
| `useUpdateHousehold()` | Name/Slots/ShoppingDays/BatchCook updaten |
| `useLeaveHousehold()` | Aktuellen User aus Household entfernen |
