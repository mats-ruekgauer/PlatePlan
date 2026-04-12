# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Session Start — immer zuerst lesen

1. `Obsidian_Plate/HOME.md` — aktueller Projektstatus, aktive Features, offene Issues, offene Bugs
2. `Obsidian_Plate/llm_wiki/index.md` — welche Wiki-Seiten existieren
3. Bei konkreter Aufgabe: relevante `llm_wiki/`-Seiten lesen **bevor** Code geschrieben wird
4. Vollständige Vault-Anleitung: `Obsidian_Plate/CLAUDE.md`

**Wissen persistent halten — automatisch, ohne Aufforderung:**

Nach jeder Session die Erkenntnisse oder Änderungen produziert hat:
1. Relevante `llm_wiki/`-Seite updaten (oder neu anlegen falls nötig)
2. Neue Seiten in `llm_wiki/index.md` eintragen
3. Eintrag in `llm_wiki/log.md` anhängen
4. Obsidian Wiki-Links `[[relative/pfad]]` setzen wo inhaltliche Bezüge bestehen

Was ins Wiki gehört:
- Neue Architektur-Entscheidungen → `llm_wiki/decisions/`
- Neue Erkenntnisse (Bugs, Fallen, Gotchas) → passende `llm_wiki/`-Seite
- Neue Endpunkte oder geänderte Konventionen → entsprechende Seite updaten

---

## Architektur — Grundregeln (nicht verhandelbar)

```
Supabase = Auth + Datenbank + Realtime
FastAPI  = Business-Logik + alle Writes
```

### Was Supabase macht
- Auth (JWT ausstellen, Session verwalten, Token refreshen)
- Daten speichern (PostgreSQL)
- Realtime Push (Änderungen sofort im Frontend sichtbar)

### Was FastAPI macht
- **Alle Writes** — kein Frontend-Code schreibt direkt in Supabase
- Business-Logik (Validierung, Ownership-Checks, AI-Calls)
- JWT-Validierung bei jedem Request

### Was das Frontend macht
- **Reads**: direkt via Supabase Client (anon key + RLS)
- **Writes**: ausschließlich über `callAPI()` → FastAPI
- **Auth**: Supabase Auth, JWT in AsyncStorage, `autoRefreshToken: true`

### Verboten
- `supabase.from('...').insert/update/delete` im Frontend
- AI-Keys im Frontend oder Edge Functions
- Neue Edge Functions (nur `process-receipt` bleibt)
- Direct DB-Writes über den Service Role Key im Frontend

---

## Auth Flow

```
1. User → Supabase signIn → JWT (access_token + refresh_token)
2. JWT in AsyncStorage (Supabase client verwaltet das automatisch)
3. Jeder FastAPI-Request: Authorization: Bearer <access_token>
4. FastAPI validiert JWT cryptographisch (JWKS oder HS256)
5. Bei 401 von FastAPI: callAPI() refresht Session einmal, retry
6. Schlägt Refresh fehl → supabase.auth.signOut() → AuthGuard leitet zu Login
```

**Token-Refresh:** `autoRefreshToken: true` im Supabase Client + App-State-Handling in `_layout.tsx` (startAutoRefresh / stopAutoRefresh). `callAPI()` in `lib/api.ts` hat zusätzlich explizites 401-Handling als Sicherheitsnetz.

---

## Monorepo Structure

```
PlatePlan/
├── frontend/     ← Expo React Native app
│   ├── app/      ← Expo Router (Screens)
│   ├── hooks/    ← React Query Hooks (alle Reads + Mutations)
│   ├── lib/
│   │   ├── supabase.ts  ← Supabase Client + Mapper-Funktionen
│   │   └── api.ts       ← callAPI() für FastAPI-Requests
│   ├── stores/   ← Zustand Stores (Client-State)
│   └── types/    ← Shared TypeScript Types
├── backend/      ← FastAPI Python server
│   └── app/
│       ├── routers/     ← Endpunkte (plan, shopping, feedback, household, profile, favorites, automations)
│       ├── models/      ← Pydantic Request/Response Models
│       ├── services/    ← Business-Logik (deepseek, prompts, preferences, db)
│       ├── dependencies.py  ← JWT-Validierung + Service Client
│       └── config.py    ← Env-Variablen
├── supabase/
│   └── functions/
│       └── process-receipt/  ← einzige Edge Function (Receipt OCR)
└── CLAUDE.md
```

> DB-Schema wird **nicht** lokal verwaltet — ausschließlich über Supabase MCP (`apply_migration`). Kein lokaler `migrations/` Ordner.

---

## FastAPI Endpunkte — vollständige Liste

Alle Endpoints erwarten `Authorization: Bearer <JWT>` und POST-Body als JSON.

| Router | Pfad | Zweck |
|--------|------|-------|
| plan | `POST /api/plan/generate` | Wochenplan via DeepSeek generieren |
| plan | `POST /api/plan/regenerate-meal` | Einzelnen Meal-Slot neu generieren |
| plan | `POST /api/plan/swap-meal` | chosen_recipe_id setzen |
| plan | `POST /api/plan/update-meal-status` | Meal-Status ändern |
| shopping | `POST /api/shopping/generate` | Einkaufsliste aggregieren |
| shopping | `POST /api/shopping/toggle-item` | Item abhaken |
| shopping | `POST /api/shopping/mark-exported` | Liste als exportiert markieren |
| feedback | `POST /api/feedback` | Feedback + Auto-Blacklist |
| households | `POST /api/households` | Household erstellen |
| households | `POST /api/households/join` | Via Invite-Token beitreten |
| households | `POST /api/households/{id}/invite` | Invite-Link rotieren |
| households | `POST /api/households/{id}/update` | Settings updaten |
| households | `POST /api/households/{id}/leave` | Austreten |
| profile | `POST /api/profile/update-display-name` | Display-Name ändern |
| profile | `POST /api/profile/update-preferences` | Präferenzen updaten |
| favorites | `POST /api/favorites/toggle` | Favorit hinzufügen/entfernen |
| favorites | `POST /api/favorites/add-custom` | Custom-Favorit anlegen |
| favorites | `POST /api/favorites/remove` | Favorit löschen |
| automations | `POST /api/automations/upsert` | Automation erstellen/updaten |
| automations | `POST /api/automations/delete` | Automation löschen |

---

## Supabase Reads — direkt via Client

Diese Tabellen werden **direkt** via `supabase.from('...').select()` gelesen (anon key + RLS):

| Tabelle | Hook |
|---------|------|
| `meal_plans` | `usePlan.ts` |
| `planned_meals` | `usePlan.ts` |
| `recipes` | `usePlan.ts` |
| `profiles` | `useProfile.ts` |
| `user_preferences` | `useProfile.ts` |
| `user_favorites` | `useFavorites.ts` |
| `shopping_lists` | `useShoppingList.ts` |
| `automations` | `useAutomations.ts` |
| `households` | `useHousehold.ts` |
| `household_members` | `useHousehold.ts` |

**Mapper-Pflicht:** Immer `mapXxx()` aus `lib/supabase.ts` verwenden — niemals snake_case Felder direkt in der UI nutzen.

---

## Key Conventions

- **Writes → FastAPI**: `callAPI('/api/...', body)` — niemals direkt `supabase.from().insert/update/delete`
- **Reads → Supabase**: `supabase.from('...').select()` mit anon key
- **AI-Calls**: Nur im FastAPI Backend, `DEEPSEEK_API_KEY` nur in `backend/.env`
- **Mapper**: `mapMealPlan()`, `mapRecipe()` etc. aus `lib/supabase.ts` bei jedem DB-Read
- **Optimistic Updates**: Status-Änderungen sofort im Cache, Revert bei Fehler
- **React Query Invalidierung**: Nach jeder Mutation relevante Query Keys invalidieren
- **RLS**: Ownership-Check im Backend (FastAPI) UND RLS in Supabase — beide Ebenen
- **DB-Schema**: Nur via Supabase MCP ändern (`apply_migration`), nach `CASCADE` immer `pg_policies` prüfen

---

## Commands

```bash
# Frontend (from frontend/)
npm start              # Expo dev server
npm run ios            # iOS Simulator
npm run type-check     # TypeScript check
npm run lint           # ESLint

# Backend (from backend/)
uvicorn app.main:app --reload   # FastAPI dev server (port 8000)
pip install -r requirements.txt
```

## Environment Variables

### Frontend (`frontend/.env`)
```env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_API_URL=           # z.B. http://localhost:8000
```

### Backend (`backend/.env`)
```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=           # Supabase Dashboard → Settings → API → JWT Secret
DEEPSEEK_API_KEY=
```

`ANTHROPIC_API_KEY` ist Supabase Secret (nur für `process-receipt` Edge Function).
