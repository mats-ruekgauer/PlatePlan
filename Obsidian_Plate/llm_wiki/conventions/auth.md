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
