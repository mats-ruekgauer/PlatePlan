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
