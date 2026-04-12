# llm_wiki — Index

Katalog aller Wiki-Seiten. Agents lesen diesen Index zuerst, bevor sie einzelne Seiten aufrufen.

---

## Architecture

| Seite | Summary |
|-------|---------|
| [[architecture/backend]] | FastAPI-Endpunkte, Auth-Flow, Service-Role vs JWT |
| [[architecture/frontend]] | Expo Router, Route Groups, Navigation-Guard |
| [[architecture/data-layer]] | Supabase Client vs FastAPI Client, RLS, mappers |
| [[architecture/state-management]] | React Query (Server State) vs Zustand (Client State) |

## Entities

| Seite | Summary |
|-------|---------|
| [[entities/meal-plan]] | PlannedMeal (DB-Row) vs HydratedMeal (aufgelöstes Recipe) |
| [[entities/household]] | Household-Modell, Invite-Token-Flow |
| [[entities/recipe]] | Recipe-Struktur und Felder |

## Conventions

| Seite | Summary |
|-------|---------|
| [[conventions/mappers]] | snake_case → camelCase Mapper-Funktionen, Pflichtnutzung |
| [[conventions/react-query]] | Cache-Keys nach weekStart, Invalidierung nach Mutation |
| [[conventions/auth]] | JWT-Flow Frontend → FastAPI, Service-Role für Writes |
| [[conventions/ai-calls]] | AI-Calls nur via FastAPI Backend, nie client-seitig |

## Decisions

| Seite | Summary |
|-------|---------|
| [[decisions/fastapi-over-edge-functions]] | Warum AI-Calls vom Edge-Function ins FastAPI-Backend wanderten |
| [[decisions/align-schema-2026-04-12]] | DB/Backend/Frontend-Alignment: RLS-Bugs, Household-Settings, fehlende Columns |
