# llm_wiki — Log

Append-only Chronologie aller Operationen. Format:
`## [YYYY-MM-DD] <operation> | <Titel>`

---

## [2026-04-12] ingest | Initial wiki setup
- Was: Wiki initial befüllt aus CLAUDE.md und bestehendem Projekt-Wissen
- Betroffene Seiten: architecture/backend, architecture/frontend, architecture/data-layer, architecture/state-management, entities/meal-plan, entities/household, entities/recipe, conventions/mappers, conventions/react-query, conventions/auth, conventions/ai-calls, decisions/fastapi-over-edge-functions

## [2026-04-12] ingest | RLS Vollprüfung — 6 weitere Policy-Bugs gefixt
- Was: Vollständige Inspektion aller pg_policies. Selbstreferenz-Bug in 6 Policies (households_select/update, household_members_select, meal_plans_member_access, shopping_lists_member_access, household_invites_delete_owner). Ursache: PostgreSQL löst Spaltennamen in RLS-Subqueries auf den Alias auf statt auf den äußeren Table.
- Betroffene Seiten: decisions/align-schema-2026-04-12

## [2026-04-12] decision | Migrations-Ordner entfernt
- Was: `supabase/migrations/` gelöscht — DB-Schema wird ausschließlich über Supabase MCP verwaltet. Supabase Projekt-ID: ntollkfmmkxgokhheqle
- Betroffene Seiten: architecture/backend, decisions/align-schema-2026-04-12

## [2026-04-12] ingest | Schema-Alignment DB/Backend/Frontend
- Was: Kritische RLS-Bugs gefixt (planned_meals ohne Policies, profiles-Join blockiert), Household-Settings aus user_preferences entfernt, fehlende DB-Columns applied, neuer /settings/household Screen, Backend liest Household-Settings aus households-Tabelle
- Betroffene Seiten: architecture/data-layer, entities/household, decisions/align-schema-2026-04-12

## [2026-04-12] ingest | Vollständige Obsidian-Initialisierung
- Was: Kompletter Vault-Stand aus Codebase-Analyse initialisiert — alle 9 Production Features, 5 Backlog Features, Backlog priorisiert, HOME.md befüllt
- Betroffene Seiten: features/03_production/* (9 Features), features/01_not_implemented/* (5 Features), roadmap/backlog.md, HOME.md

## [2026-04-12] ingest | Household Read-Pfad auf Backend umgestellt
- Was: Household-Daten existierten in `households` und `household_members`, wurden im Frontend aber teils als leerer State gelesen. Reads (`mine`, `members`) und Mutationen (`update`, `leave`) laufen jetzt über FastAPI mit Service Role; Household-Queries invalidieren sofort und validieren `activeHouseholdId` gegen echte Daten.
- Betroffene Seiten: architecture/backend, architecture/data-layer, entities/household, conventions/react-query

## [2026-04-12] ingest | Auth vollständig implementiert + Architektur in CLAUDE.md dokumentiert
- Was: callAPI() hat jetzt 401-Handling (Refresh → Retry → signOut). CLAUDE.md vollständig mit Architektur-Regeln, Endpunkt-Liste, Read/Write-Trennung. conventions/auth.md mit vollständigem Auth-Flow inklusive JWT-Validierungs-Algorithmen und 401-Flow.
- Betroffene Seiten: conventions/auth

## [2026-04-12] ingest | Household-Reads auf Supabase-Direct-Read umgestellt
- Was: useMyHouseholds + useHouseholdMembers lesen jetzt direkt via Supabase Client statt über FastAPI. RLS-Policies für households/household_members waren bereits gefixt. FastAPI-Endpunkte /mine + /{id}/members bleiben im Backend aber werden nicht mehr aufgerufen. Architektur jetzt 100% sauber: Reads via Supabase, Writes via FastAPI.
- Betroffene Seiten: architecture/backend, architecture/data-layer

## [2026-04-12] ingest | Architektur-Alignment: alle Frontend-Writes auf FastAPI migriert
- Was: 11 direkte Supabase-Writes aus dem Frontend entfernt und durch FastAPI-Endpunkte ersetzt. Betroffen: usePlan (swap-meal, update-meal-status), useShoppingList (toggle-item, mark-exported), useProfile (update-display-name, update-preferences), useFavorites (toggle, add-custom, remove), useAutomations (upsert, delete). Außerdem: Household-Reads via FastAPI als bewusste Ausnahme dokumentiert (RLS-historisch bedingt, kein Realtime).
- Betroffene Seiten: architecture/backend, architecture/data-layer

## [2026-04-12] issue | household--invite-flow-redesign
- Was: Neues Issue angelegt — QR-Code-View direkt nach Household-Erstellung, Kurz-Code-Eingabe beim Join, vorgefertigte Share-Nachricht, 6h-Ablauf für Invite-Links
- Betroffene Seiten: features/02_current/household/01_Overview, issues/open/household--invite-flow-redesign

## [2026-04-12] fix | RLS Infinite Recursion in household_members gefixt
- Was: `household_members` SELECT-Policy fragte `household_members` selbst ab → PostgreSQL 42P17 infinite recursion. Alle Tabellen die `household_members` in EXISTS-Subqueries referenzieren (households, meal_plans, shopping_lists, planned_meals, profiles) lieferten leere Arrays statt Fehler. Fix: `SECURITY DEFINER` Funktion `auth_user_household_ids()` die ohne RLS liest, Policy auf `household_id IN (SELECT auth_user_household_ids())` umgestellt.
- Betroffene Seiten: architecture/data-layer

## [2026-04-12] ingest | Backend-Fixes für PostgREST-Nullfälle, AI-Zahlen und Household-Member-Reads
- Was: Dokumentiert, dass `maybe_single()` bei 0 Rows `None` liefert, AI-Rezeptzahlen vor dem DB-Insert auf Integer normalisiert werden und Household-Mitglieder im Backend ohne fragilen `profiles(...)`-Join geladen werden
- Betroffene Seiten: architecture/backend, architecture/data-layer, entities/household, entities/recipe, decisions/defensive-postgrest-handling-2026-04-12
