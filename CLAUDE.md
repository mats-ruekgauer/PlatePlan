# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Obsidian Vault — PM Tool & Wissenswiki

Das Projekt nutzt einen Obsidian-Vault unter `Obsidian_Plate/` als kombiniertes PM-Tool und persistentes Wissenswiki.

**Session Start — immer zuerst:**
1. `Obsidian_Plate/HOME.md` lesen — aktueller Projektstatus, aktive Features, offene Bugs
2. `Obsidian_Plate/llm_wiki/index.md` lesen — welche Wiki-Seiten existieren
3. Bei konkreter Aufgabe: relevante `llm_wiki/`-Seiten lesen bevor Code geschrieben wird
4. Vollständige Anleitung: `Obsidian_Plate/CLAUDE.md`

**Wissen persistent halten:**
- Neue Architektur-Entscheidungen → `llm_wiki/decisions/`
- Neue Erkenntnisse über Entities/Conventions → entsprechende `llm_wiki/`-Seite updaten
- `llm_wiki/index.md` und `llm_wiki/log.md` nach jeder Änderung aktualisieren

**DB-Änderungen:**
- Supabase-Schema **ausschließlich** über den Supabase MCP direkt auf die Online-DB anwenden (`apply_migration`)
- Es gibt keinen lokalen `supabase/migrations/` Ordner mehr — der MCP ist die einzige Source of Truth
- Nach `DROP COLUMN CASCADE` immer `pg_policies` prüfen — Policies werden stillschweigend gelöscht

## Monorepo Structure

```
PlatePlan/
├── frontend/     ← Expo React Native app
├── backend/      ← FastAPI Python server
├── supabase/
│   └── functions/
│       ├── process-receipt/   ← einzige verbleibende Edge Function (Receipt OCR via Anthropic)
│       └── _shared/prompts.ts ← wird von process-receipt importiert
└── CLAUDE.md
```

> DB-Schema wird **nicht** lokal in Migrations-Dateien verwaltet — ausschließlich über den Supabase MCP.

## Commands

```bash
# Frontend (run from frontend/)
cd frontend
npm start              # Start Expo dev server
npm run ios            # Run on iOS simulator
npm run android        # Run on Android emulator
npm run type-check     # TypeScript noEmit check
npm run lint           # ESLint on .ts/.tsx files
npm test               # Run Jest tests

# Backend (run from backend/)
cd backend
uvicorn app.main:app --reload   # Start FastAPI dev server (port 8000)
pip install -r requirements.txt  # Install dependencies
```

## Architecture

PlatePlan is an AI-powered meal planning React Native app built with Expo. All AI and server-side logic runs in a **FastAPI Python backend** (`backend/`). Supabase is used only for auth and database storage.

### Frontend (`frontend/`)

#### Navigation & Auth

Expo Router with three route groups:
- `(auth)/` — welcome, sign-in, sign-up screens
- `(onboarding)/` — 7-step guided setup flow
- `(tabs)/` — main app (Meal Plan, Shopping, Profile, Recipes)

The root `_layout.tsx` acts as the auth guard: checks Supabase session and whether onboarding is complete, then routes accordingly.

#### State Management

Two separate layers:
1. **React Query** (`@tanstack/react-query`) — all server/remote state. Cache keys are keyed by `weekStart` date for weekly plan browsing. Hooks live in `hooks/`.
2. **Zustand** — client-only state. `onboardingStore.ts` persists the multi-step form to AsyncStorage so users can resume mid-flow. `uiStore.ts` handles transient UI state (modals, toasts).

#### Data Layer

- **Supabase client** (`lib/supabase.ts`) — full TypeScript type definitions and camelCase mappers (`mapMealPlan`, `mapRecipe`, etc.) that transform snake_case DB rows. Used for auth and direct DB reads.
- **FastAPI client** (`lib/api.ts`) — `callAPI()` sends requests to the FastAPI backend with the Supabase JWT for auth.
- **RLS enforces user isolation** on the client (anon key). The FastAPI backend uses the service role key for writes.
- Key distinction: `PlannedMeal` is the raw DB row; `HydratedMeal` resolves the chosen recipe and is what the UI consumes.

### Backend (`backend/`)

FastAPI Python server handling all AI and complex server logic:
- `POST /api/plan/generate` — full weekly meal plan via DeepSeek
- `POST /api/plan/regenerate-meal` — regenerate a single meal slot
- `POST /api/shopping/generate` — aggregate ingredients by category
- `POST /api/feedback` — feedback processing + auto-blacklist
- `POST /api/households` — create household + invite token
- `POST /api/households/join` — join via invite token
- `POST /api/households/{id}/invite` — rotate invite link

Auth: all endpoints validate Supabase JWT from `Authorization: Bearer <token>` header.

### Supabase Edge Functions (`supabase/functions/`)

Only one function remains:
- `process-receipt/` — receipt OCR via Anthropic Vision

### Styling

NativeWind 4 (Tailwind CSS for React Native). Design tokens (colors, spacing, typography) are in `constants/theme.ts`. Primary color: `#2D6A4F` (green).

## Key Conventions

- **All AI calls go through the FastAPI backend** — `DEEPSEEK_API_KEY` is a backend env var, never exposed to the client.
- **Auth**: Frontend passes the Supabase JWT to FastAPI; FastAPI validates it with `SUPABASE_JWT_SECRET`.
- **Optimistic updates** — meal status changes update the UI immediately and revert on error.
- **Mappers** — always use the mapper functions in `lib/supabase.ts` when reading DB rows; never access snake_case fields directly in the UI layer.
- **React Query cache invalidation** — after any mutation that changes plan data, invalidate the relevant query keys so the UI stays in sync.

## Environment Variables

### Frontend (`frontend/.env`)
```env
EXPO_PUBLIC_SUPABASE_URL=      # Client-facing Supabase URL
EXPO_PUBLIC_SUPABASE_ANON_KEY= # Client-facing anon key
EXPO_PUBLIC_API_URL=           # FastAPI base URL (e.g. http://localhost:8000)
```

### Backend (`backend/.env`)
```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=           # Supabase Dashboard → Settings → API → JWT Secret
DEEPSEEK_API_KEY=
```

`ANTHROPIC_API_KEY` is still a Supabase secret (used by `process-receipt` edge function).
