# Obsidian PM + Agent Brain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Obsidian-Vault `Obsidian_Plate/` als PM-Tool und persistentes Agent-Brain aufbauen mit Vault-Schema, vollständigem llm_wiki und initial befüllten Seiten aus bestehendem PlatePlan-Wissen.

**Architecture:** Ein `CLAUDE.md` im Vault-Root definiert das Schema für Agents (Ordner, Workflows, Konventionen). Der `llm_wiki/` Ordner enthält `index.md` als Katalog, `log.md` als Chronologie und thematische Unterordner mit Markdown-Seiten. Features-Folder bleibt unverändert.

**Tech Stack:** Markdown, Obsidian Wiki-Links `[[...]]`, YAML Frontmatter

---

## File Map

**Neu erstellen:**
- `Obsidian_Plate/CLAUDE.md` — Vault-Schema für Agents
- `Obsidian_Plate/llm_wiki/index.md` — Seitenkatalog
- `Obsidian_Plate/llm_wiki/log.md` — Operationslog
- `Obsidian_Plate/llm_wiki/architecture/backend.md`
- `Obsidian_Plate/llm_wiki/architecture/frontend.md`
- `Obsidian_Plate/llm_wiki/architecture/data-layer.md`
- `Obsidian_Plate/llm_wiki/architecture/state-management.md`
- `Obsidian_Plate/llm_wiki/entities/meal-plan.md`
- `Obsidian_Plate/llm_wiki/entities/household.md`
- `Obsidian_Plate/llm_wiki/entities/recipe.md`
- `Obsidian_Plate/llm_wiki/conventions/mappers.md`
- `Obsidian_Plate/llm_wiki/conventions/react-query.md`
- `Obsidian_Plate/llm_wiki/conventions/auth.md`
- `Obsidian_Plate/llm_wiki/conventions/ai-calls.md`
- `Obsidian_Plate/llm_wiki/decisions/fastapi-over-edge-functions.md`

---

### Task 1: Vault CLAUDE.md Schema

**Files:**
- Create: `Obsidian_Plate/CLAUDE.md`

- [ ] **Step 1: Vault-Schema anlegen**

Datei erstellen mit folgendem Inhalt:

```markdown
# Obsidian_Plate — Agent Schema

Dieser Vault dient zwei Zwecken:
1. **PM-Tool** — Feature-Lifecycle via `features/`
2. **Agent-Brain** — Persistentes Wissenswiki via `llm_wiki/`

Das `CLAUDE.md` im Projekt-Root bleibt die technische Referenz. Dieses Wiki
ergänzt es mit Tiefe, Entscheidungshistorie und Domain-Wissen.

---

## Ordner-Übersicht

### `features/`
Feature-Lifecycle-Management. Drei Zustände:
- `01_not_implemented/` — geplant, noch nicht gestartet
- `02_current/` — aktiv in Umsetzung
- `03_production/` — shipped

Vollständiger Workflow: siehe `features/INSTRUCTION.md`

### `llm_wiki/`
Persistentes, LLM-gepflegtes Wissenswiki.

Struktur:
- `index.md` — Katalog aller Seiten (immer zuerst lesen bei Fragen)
- `log.md` — Append-only Operationslog
- `architecture/` — System-Architektur Seiten
- `entities/` — Domain-Entitäten
- `conventions/` — Coding-Konventionen & Patterns
- `decisions/` — Architektur-Entscheidungen (Warum X statt Y)

### `ideas/`
Rohe Ideen, noch nicht zu Features verfeinert.

### `UI_CI/`
Design-Konventionen und Component-Guidelines (zukünftig).

---

## Agent-Workflows

### Ingest (neues Wissen hinzufügen)

Wenn du etwas Wichtiges über das System lernst, das noch nicht im Wiki steht:

1. Kategorie bestimmen: architecture / entity / convention / decision
2. Seite im passenden Unterordner anlegen oder updaten
3. `llm_wiki/index.md` aktualisieren — neue Seite eintragen
4. Eintrag in `llm_wiki/log.md` anhängen:
   ```
   ## [YYYY-MM-DD] ingest | <Seitentitel>
   - Was: <Einzeiler>
   - Betroffene Seiten: <Liste>
   ```

### Query (Fragen beantworten)

1. `llm_wiki/index.md` lesen → relevante Seiten identifizieren
2. Seiten lesen → Antwort mit Referenzen synthetisieren (z.B. `[[conventions/mappers]]`)
3. Neue Erkenntnisse aus der Antwort direkt als Seite speichern (Ingest)

### Feature bauen (PM-Workflow)

Wenn ein neues Feature geplant wird:
1. Ordner in `features/01_not_implemented/<feature-name>/` anlegen
2. Alle Dateien aus `features/01_not_implemented/example/` hineinkopieren
3. Alle Template-Dateien ausfüllen
4. Wenn Umsetzung startet: gesamten Ordner nach `features/02_current/` verschieben
5. Dateien aus `features/02_current/example/` ergänzen (Status, Progress Log, Open Issues)
6. Log-Eintrag:
   ```
   ## [YYYY-MM-DD] feature | <feature-name>
   - Was: Feature gestartet / Feature shipped
   - Betroffene Seiten: features/02_current/<feature-name>
   ```
7. Nach Fertigstellung: gesamten Ordner nach `features/03_production/` verschieben
8. `09_Final_implementation.md` aus Example ergänzen

### Lint (periodischer Health-Check)

Vor großen Features oder wenn Wiki sich veraltet anfühlt:
- Widersprüche zwischen Seiten flaggen
- Orphan-Seiten (keine `[[Links]]` die darauf zeigen) identifizieren
- Konzepte die erwähnt werden aber keine eigene Seite haben
- `log.md` mit Lint-Ergebnissen updaten

---

## Frontmatter-Konvention

Alle `llm_wiki/` Seiten beginnen mit:

```yaml
---
title: <Seitentitel>
category: architecture | entity | convention | decision
last_updated: YYYY-MM-DD
related: [[relative/pfad]], [[anderer/pfad]]
---
```

## Log-Format

`log.md` Einträge immer:

```
## [YYYY-MM-DD] <operation> | <Titel>
- Was: <Zusammenfassung>
- Betroffene Seiten: <kommagetrennte Seiten>
```

Operationen: `ingest`, `query`, `feature`, `lint`, `decision`
```

- [ ] **Step 2: Commit**

```bash
git add Obsidian_Plate/CLAUDE.md
git commit -m "docs: add Obsidian vault agent schema (CLAUDE.md)"
```

---

### Task 2: llm_wiki Index und Log

**Files:**
- Create: `Obsidian_Plate/llm_wiki/index.md`
- Create: `Obsidian_Plate/llm_wiki/log.md`

- [ ] **Step 1: index.md anlegen**

```markdown
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
```

- [ ] **Step 2: log.md anlegen**

```markdown
# llm_wiki — Log

Append-only Chronologie aller Operationen. Format:
`## [YYYY-MM-DD] <operation> | <Titel>`

---

## [2026-04-12] ingest | Initial wiki setup
- Was: Wiki initial befüllt aus CLAUDE.md und bestehendem Projekt-Wissen
- Betroffene Seiten: architecture/backend, architecture/frontend, architecture/data-layer, architecture/state-management, entities/meal-plan, entities/household, entities/recipe, conventions/mappers, conventions/react-query, conventions/auth, conventions/ai-calls, decisions/fastapi-over-edge-functions
```

- [ ] **Step 3: Commit**

```bash
git add Obsidian_Plate/llm_wiki/index.md Obsidian_Plate/llm_wiki/log.md
git commit -m "docs: add llm_wiki index and log"
```

---

### Task 3: Architecture-Seiten

**Files:**
- Create: `Obsidian_Plate/llm_wiki/architecture/backend.md`
- Create: `Obsidian_Plate/llm_wiki/architecture/frontend.md`
- Create: `Obsidian_Plate/llm_wiki/architecture/data-layer.md`
- Create: `Obsidian_Plate/llm_wiki/architecture/state-management.md`

- [ ] **Step 1: backend.md anlegen**

```markdown
---
title: Backend — FastAPI
category: architecture
last_updated: 2026-04-12
related: [[architecture/data-layer]], [[conventions/auth]], [[conventions/ai-calls]]
---

# Backend — FastAPI

## Übersicht

Alle AI-Logik und komplexe Server-Operationen laufen im FastAPI Python Backend (`backend/`).
Kein AI-Code im Frontend oder in Supabase Edge Functions (außer `process-receipt`).

## Endpunkte

| Methode | Pfad | Zweck |
|---------|------|-------|
| POST | `/api/plan/generate` | Vollständigen Wochenplan via DeepSeek generieren |
| POST | `/api/plan/regenerate-meal` | Einzelnen Meal-Slot neu generieren |
| POST | `/api/shopping/generate` | Einkaufsliste nach Kategorie aggregieren |
| POST | `/api/feedback` | Feedback verarbeiten + Auto-Blacklist |
| POST | `/api/households` | Household anlegen + Invite-Token erstellen |
| POST | `/api/households/join` | Household via Invite-Token beitreten |
| POST | `/api/households/{id}/invite` | Invite-Link rotieren |

## Auth-Flow

1. Frontend schickt Supabase JWT im `Authorization: Bearer <token>` Header
2. FastAPI validiert JWT mit `SUPABASE_JWT_SECRET`
3. Backend nutzt `SUPABASE_SERVICE_ROLE_KEY` für DB-Writes (umgeht RLS)

Wichtig: Anon Key hat RLS-Beschränkungen → nur für Client-seitige Reads.
Service Role Key niemals ans Frontend.

## Env-Variablen (backend/.env)

```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=       # Supabase Dashboard → Settings → API → JWT Secret
DEEPSEEK_API_KEY=
```

## Supabase Edge Functions

Nur noch eine aktive Edge Function:
- `process-receipt/` — Receipt OCR via Anthropic Vision (hat eigenen `ANTHROPIC_API_KEY` als Supabase Secret)
```

- [ ] **Step 2: frontend.md anlegen**

```markdown
---
title: Frontend — Expo React Native
category: architecture
last_updated: 2026-04-12
related: [[architecture/state-management]], [[architecture/data-layer]], [[conventions/auth]]
---

# Frontend — Expo React Native

## Stack

Expo Router (file-based routing), React Native, NativeWind 4 (Tailwind CSS).
Primary Color: `#2D6A4F` (grün). Design Tokens in `constants/theme.ts`.

## Navigation & Route Groups

Expo Router mit drei Route Groups:

| Route Group | Screens |
|-------------|---------|
| `(auth)/` | welcome, sign-in, sign-up |
| `(onboarding)/` | 7-schrittiger Onboarding-Flow |
| `(tabs)/` | Meal Plan, Shopping, Profile, Recipes |

Der Root `_layout.tsx` ist der Auth-Guard: prüft Supabase Session + ob Onboarding abgeschlossen,
leitet dann entsprechend weiter.

## Env-Variablen (frontend/.env)

```
EXPO_PUBLIC_SUPABASE_URL=       # Client-seitige Supabase URL
EXPO_PUBLIC_SUPABASE_ANON_KEY=  # Client-seitiger Anon Key
EXPO_PUBLIC_API_URL=            # FastAPI Base URL (z.B. http://localhost:8000)
```

## Commands

```bash
cd frontend
npm start              # Expo Dev Server
npm run ios            # iOS Simulator
npm run android        # Android Emulator
npm run type-check     # TypeScript noEmit
npm run lint           # ESLint
npm test               # Jest
```
```

- [ ] **Step 3: data-layer.md anlegen**

```markdown
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
- Backend (Service Role Key) umgeht RLS → kann für alle User schreiben
- Optimistische Updates: UI updated sofort, revert bei Fehler

## Mapper-Regel

**Immer** die Mapper-Funktionen aus `lib/supabase.ts` nutzen wenn DB-Rows gelesen werden.
Niemals snake_case Felder direkt in der UI verwenden. Siehe [[conventions/mappers]].
```

- [ ] **Step 4: state-management.md anlegen**

```markdown
---
title: State Management
category: architecture
last_updated: 2026-04-12
related: [[architecture/data-layer]], [[conventions/react-query]]
---

# State Management

## Zwei Schichten

### React Query (`@tanstack/react-query`) — Server State
- Alle remote/server State
- Cache-Keys sind nach `weekStart`-Datum gekeys (wöchentlicher Meal-Plan-Browser)
- Hooks leben in `hooks/`
- Nach jeder Mutation die Plan-Daten ändert: relevante Query Keys invalidieren
- Details: [[conventions/react-query]]

### Zustand — Client State
- Nur transienter UI-State
- `onboardingStore.ts` — persistiert Multi-Step-Formular in AsyncStorage (Resume mid-flow)
- `uiStore.ts` — Modals, Toasts und andere flüchtige UI-Zustände

## Faustregel

> Kommt die Daten vom Server? → React Query.
> Ist es reiner UI-State? → Zustand.
> Muss es über Neustarts hinweg erhalten bleiben? → Zustand + AsyncStorage Persist.
```

- [ ] **Step 5: Commit**

```bash
git add Obsidian_Plate/llm_wiki/architecture/
git commit -m "docs: add llm_wiki architecture pages"
```

---

### Task 4: Entity-Seiten

**Files:**
- Create: `Obsidian_Plate/llm_wiki/entities/meal-plan.md`
- Create: `Obsidian_Plate/llm_wiki/entities/household.md`
- Create: `Obsidian_Plate/llm_wiki/entities/recipe.md`

- [ ] **Step 1: meal-plan.md anlegen**

```markdown
---
title: Meal Plan — PlannedMeal vs HydratedMeal
category: entity
last_updated: 2026-04-12
related: [[architecture/data-layer]], [[conventions/mappers]], [[entities/recipe]]
---

# Meal Plan

## Zwei Typen — Kritischer Unterschied

### PlannedMeal
- **Was:** Roher DB-Row aus der Datenbank
- **Enthält:** Referenz auf Recipe (z.B. `recipe_id`), aber Recipe-Daten nicht aufgelöst
- **Wann nutzen:** Nur intern beim Lesen aus DB, vor dem Mapping

### HydratedMeal
- **Was:** PlannedMeal mit aufgelöstem Recipe
- **Enthält:** Alle PlannedMeal-Felder + vollständige Recipe-Daten
- **Wann nutzen:** Das ist was die UI konsumiert. Immer HydratedMeal im UI-Layer

## Faustregel

> UI konsumiert immer HydratedMeal, nie PlannedMeal direkt.

## Cache-Strategie

Wochenplan wird per `weekStart`-Datum gecacht (React Query Key).
Nach Mutation (z.B. Meal-Status ändern): relevante `weekStart` Keys invalidieren.
Details: [[conventions/react-query]]

## Optimistische Updates

Meal-Status-Änderungen updaten die UI sofort (optimistisch) und reverten bei Fehler.
```

- [ ] **Step 2: household.md anlegen**

```markdown
---
title: Household
category: entity
last_updated: 2026-04-12
related: [[architecture/backend]], [[conventions/auth]]
---

# Household

## Konzept

Mehrere User können einem Household angehören und einen gemeinsamen Meal-Plan teilen.

## Invite-Flow

1. Household-Owner ruft `POST /api/households` auf → erstellt Household + ersten Invite-Token
2. Invite-Link wird geteilt
3. Neuer User ruft `POST /api/households/join` mit Token auf → tritt Household bei
4. Token kann via `POST /api/households/{id}/invite` rotiert werden (alten Link ungültig machen)

## API-Endpunkte

| Endpunkt | Zweck |
|----------|-------|
| `POST /api/households` | Household erstellen + Invite-Token generieren |
| `POST /api/households/join` | Household via Token beitreten |
| `POST /api/households/{id}/invite` | Invite-Link rotieren |
```

- [ ] **Step 3: recipe.md anlegen**

```markdown
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
```

- [ ] **Step 4: Commit**

```bash
git add Obsidian_Plate/llm_wiki/entities/
git commit -m "docs: add llm_wiki entity pages"
```

---

### Task 5: Convention-Seiten

**Files:**
- Create: `Obsidian_Plate/llm_wiki/conventions/mappers.md`
- Create: `Obsidian_Plate/llm_wiki/conventions/react-query.md`
- Create: `Obsidian_Plate/llm_wiki/conventions/auth.md`
- Create: `Obsidian_Plate/llm_wiki/conventions/ai-calls.md`

- [ ] **Step 1: mappers.md anlegen**

```markdown
---
title: Mapper-Konvention
category: convention
last_updated: 2026-04-12
related: [[architecture/data-layer]], [[entities/meal-plan]], [[entities/recipe]]
---

# Mapper-Konvention

## Regel

**Immer** die Mapper-Funktionen aus `lib/supabase.ts` nutzen wenn DB-Rows gelesen werden.
Niemals snake_case Felder direkt in der UI-Schicht verwenden.

## Warum

Supabase gibt snake_case zurück (`meal_plan`, `recipe_id`).
Die UI-Schicht nutzt camelCase (`mealPlan`, `recipeId`).
Mapper-Funktionen sind die einzige Stelle wo diese Transformation passiert.

## Verfügbare Mapper

| Funktion | Transformiert |
|----------|---------------|
| `mapMealPlan()` | PlannedMeal DB-Row → camelCase |
| `mapRecipe()` | Recipe DB-Row → camelCase |

## Anti-Pattern

```typescript
// FALSCH — snake_case direkt in UI
const title = recipe.recipe_title;

// RICHTIG — Mapper nutzen
const mapped = mapRecipe(recipe);
const title = mapped.recipeTitle;
```
```

- [ ] **Step 2: react-query.md anlegen**

```markdown
---
title: React Query Konventionen
category: convention
last_updated: 2026-04-12
related: [[architecture/state-management]], [[entities/meal-plan]]
---

# React Query Konventionen

## Cache-Key Strategie

Meal-Plan-Daten werden per `weekStart`-Datum gecacht:

```typescript
// Query Key Format
['mealPlan', weekStart]  // weekStart = ISO-Datumsstring des Wochenbeginns
```

Damit kann der User durch Wochen browsen ohne Daten neu zu laden.

## Invalidierung nach Mutation

Nach jeder Mutation die Plan-Daten ändert:

```typescript
// Nach Meal-Status Änderung
queryClient.invalidateQueries({ queryKey: ['mealPlan', weekStart] });
```

Regel: **Nach jeder Mutation die Plan-Daten betrifft, relevante Query Keys invalidieren.**

## Hooks

Alle React Query Hooks leben in `hooks/`. Keine direkten `useQuery`/`useMutation` Calls
in Components — immer über dedizierte Hooks.

## Optimistische Updates

Meal-Status-Änderungen (z.B. "gekocht", "übersprungen"):
1. UI updated sofort (optimistisch)
2. Bei Fehler: revert auf vorherigen State
3. Kein Warten auf Server-Response für UX
```

- [ ] **Step 3: auth.md anlegen**

```markdown
---
title: Auth-Konvention
category: convention
last_updated: 2026-04-12
related: [[architecture/backend]], [[architecture/data-layer]]
---

# Auth-Konvention

## Frontend → Backend Flow

1. User ist via Supabase Auth eingeloggt → Supabase Session mit JWT
2. Frontend hängt JWT an jeden FastAPI Request: `Authorization: Bearer <token>`
3. FastAPI validiert JWT mit `SUPABASE_JWT_SECRET`
4. User-Identity wird aus validiertem JWT extrahiert

## Zwei Schlüssel

| Schlüssel | Wo | Zweck |
|-----------|-----|-------|
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Frontend | Client-seitige Reads (unterliegt RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend only | Server-seitige Writes (umgeht RLS) |

**Service Role Key niemals ans Frontend weitergeben.**

## RLS

Row Level Security sorgt dafür dass User mit Anon Key nur ihre eigenen Daten sehen.
Backend nutzt Service Role → kann für alle User schreiben (z.B. bei Household-Operationen).

## Supabase Auth Session prüfen

Root `_layout.tsx` prüft Session + Onboarding-Status und leitet entsprechend weiter.
Keine manuellen Auth-Checks in einzelnen Screens nötig.
```

- [ ] **Step 4: ai-calls.md anlegen**

```markdown
---
title: AI-Calls Konvention
category: convention
last_updated: 2026-04-12
related: [[architecture/backend]], [[decisions/fastapi-over-edge-functions]]
---

# AI-Calls Konvention

## Regel

**Alle AI-Calls laufen ausschließlich über das FastAPI Backend.**
Niemals direkt aus dem Frontend oder aus Supabase Edge Functions heraus (außer `process-receipt`).

## Warum

- `DEEPSEEK_API_KEY` ist ein Backend-Env-Var, wird niemals an den Client exponiert
- Zentrale Kontrolle über AI-Logik, Prompts und Fehlerbehandlung
- Einfacheres Debugging und Logging

## Ausnahme

`process-receipt` Supabase Edge Function nutzt `ANTHROPIC_API_KEY` für Receipt OCR.
Das ist die einzige erlaubte AI-Operation außerhalb des FastAPI Backends.

## Zugehörige Endpunkte

| Endpunkt | AI-Operation |
|----------|-------------|
| `POST /api/plan/generate` | Wochenplan via DeepSeek |
| `POST /api/plan/regenerate-meal` | Einzel-Meal via DeepSeek |
| `POST /api/shopping/generate` | Shopping-Liste Aggregation |

Hintergründe: [[decisions/fastapi-over-edge-functions]]
```

- [ ] **Step 5: Commit**

```bash
git add Obsidian_Plate/llm_wiki/conventions/
git commit -m "docs: add llm_wiki convention pages"
```

---

### Task 6: Decision-Seiten

**Files:**
- Create: `Obsidian_Plate/llm_wiki/decisions/fastapi-over-edge-functions.md`

- [ ] **Step 1: fastapi-over-edge-functions.md anlegen**

```markdown
---
title: FastAPI über Supabase Edge Functions
category: decision
last_updated: 2026-04-12
related: [[architecture/backend]], [[conventions/ai-calls]]
---

# FastAPI über Supabase Edge Functions

## Entscheidung

AI-Calls und komplexe Server-Logik laufen im FastAPI Python Backend, nicht in Supabase Edge Functions.

## Kontext

Ursprünglich liefen AI-Operationen in Supabase Edge Functions (Deno/TypeScript).
Das wurde auf FastAPI Python migriert.

## Gründe

- **Python-Ökosystem** — AI/ML-Bibliotheken, DeepSeek SDK, bessere LLM-Tooling-Unterstützung
- **Komplexität** — Edge Functions haben Limitierungen bei langen Laufzeiten und Payload-Größen
- **Debugging** — Lokale FastAPI-Entwicklung einfacher als Edge Function Debugging
- **Kontrolle** — Volle Kontrolle über Dependencies, kein Deno-Constraint
- **Einheitlichkeit** — Eine Sprache (Python) für alle Backend-Logik

## Was noch in Supabase läuft

- `process-receipt` Edge Function — Receipt OCR via Anthropic Vision
  - Bleibt als Edge Function weil es nah an Supabase Storage sitzt und simpel genug ist

## Impact

- `DEEPSEEK_API_KEY` lebt in `backend/.env`, niemals im Frontend
- Frontend kommuniziert via `callAPI()` in `lib/api.ts` mit dem Backend
- Alle AI-Endpunkte unter `/api/` prefix im FastAPI Server
```

- [ ] **Step 2: Commit**

```bash
git add Obsidian_Plate/llm_wiki/decisions/
git commit -m "docs: add llm_wiki decision pages"
```

---

### Task 7: Abschluss-Commit

- [ ] **Step 1: Alle Dateien prüfen**

```bash
find Obsidian_Plate/llm_wiki -type f | sort
```

Erwartete Ausgabe:
```
Obsidian_Plate/llm_wiki/architecture/backend.md
Obsidian_Plate/llm_wiki/architecture/data-layer.md
Obsidian_Plate/llm_wiki/architecture/frontend.md
Obsidian_Plate/llm_wiki/architecture/state-management.md
Obsidian_Plate/llm_wiki/conventions/ai-calls.md
Obsidian_Plate/llm_wiki/conventions/auth.md
Obsidian_Plate/llm_wiki/conventions/mappers.md
Obsidian_Plate/llm_wiki/conventions/react-query.md
Obsidian_Plate/llm_wiki/decisions/fastapi-over-edge-functions.md
Obsidian_Plate/llm_wiki/entities/household.md
Obsidian_Plate/llm_wiki/entities/meal-plan.md
Obsidian_Plate/llm_wiki/entities/recipe.md
Obsidian_Plate/llm_wiki/index.md
Obsidian_Plate/llm_wiki/log.md
```

- [ ] **Step 2: CLAUDE.md prüfen**

```bash
ls Obsidian_Plate/CLAUDE.md
```

Erwartete Ausgabe: `Obsidian_Plate/CLAUDE.md`
