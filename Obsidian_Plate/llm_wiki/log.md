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
