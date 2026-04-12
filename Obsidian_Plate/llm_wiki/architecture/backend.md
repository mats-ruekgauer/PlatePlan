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
| POST | `/api/households/mine` | Haushalte des aktuellen Users laden |
| POST | `/api/households/join` | Household via Invite-Token beitreten |
| POST | `/api/households/{id}/members` | Mitglieder eines Households laden |
| POST | `/api/households/{id}/invite` | Invite-Link rotieren |
| POST | `/api/households/{id}/update` | Household-Settings updaten |
| POST | `/api/households/{id}/leave` | Aus Household austreten |

## Auth-Flow

1. Frontend schickt Supabase JWT im `Authorization: Bearer <token>` Header
2. FastAPI validiert JWT mit `SUPABASE_JWT_SECRET`
3. Backend nutzt `SUPABASE_SERVICE_ROLE_KEY` für DB-Writes und ausgewählte Reads (umgeht RLS)

Wichtig: Anon Key hat RLS-Beschränkungen → nur für Client-seitige Reads, wenn der Read-Pfad stabil ist. Household-Reads (`mine`, `members`) wurden auf Backend-Endpunkte verschoben, damit vorhandene Daten nicht mehr als leerer State im UI landen.
Service Role Key niemals ans Frontend.

## Defensive DB-Reads/Writes

- `maybe_single()` aus `postgrest 2.28.3` liefert bei 0 Treffern `None`, nicht eine Response mit `.data`
- Backend-Code muss diese Nullform zuerst normalisieren, bevor Felder gelesen werden
- AI-generierte Rezeptdaten werden vor dem Insert auf das reale DB-Schema coerced, besonders Integer-Felder wie Kalorien, Makros, Portionen und Kochzeit
- Household-Mitglieder werden im Backend für `/api/households/{id}/members` via Service-Role geladen; dieser Endpunkt ist jetzt die kanonische Quelle für den Member-Screen im Frontend

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
- Code liegt in `supabase/functions/process-receipt/index.ts` + `supabase/functions/_shared/prompts.ts`

## DB-Schema-Verwaltung

**Kein lokaler `supabase/migrations/` Ordner** — wurde entfernt. Alle Schema-Änderungen direkt über den **Supabase MCP** (`apply_migration`) auf die Online-DB anwenden. Der MCP ist die einzige Source of Truth für das Schema.

Supabase Projekt-ID: `ntollkfmmkxgokhheqle`
