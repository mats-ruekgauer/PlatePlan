---
title: Auth-Konvention
category: convention
last_updated: 2026-04-12
related: [[architecture/backend]], [[architecture/data-layer]]
---

# Auth-Konvention

## Auth Flow (vollständig)

```
1. User → supabase.auth.signInWithPassword() → JWT (access_token + refresh_token)
2. JWT via AsyncStorage persistiert (Supabase Client übernimmt das)
3. autoRefreshToken: true → Supabase refresht Token automatisch im Hintergrund
4. App-State-Handling in _layout.tsx: startAutoRefresh / stopAutoRefresh
5. Jeder FastAPI-Request: Authorization: Bearer <access_token>
6. FastAPI validiert JWT cryptographisch (JWKS-Endpoint oder HS256 Fallback)
7. Bei 401 von FastAPI: callAPI() refresht Session einmal → retry
8. Schlägt Refresh fehl: supabase.auth.signOut() → AuthGuard → Login Screen
```

## JWT-Validierung im Backend (`dependencies.py`)

FastAPI unterstützt zwei Token-Typen:
- **HS256** (ältere Supabase-Projekte): HMAC mit `SUPABASE_JWT_SECRET`
- **ES256 / RS256** (neuere Projekte): Asymmetrisch via JWKS-Endpoint (`/auth/v1/.well-known/jwks.json`)

Der Header des JWT wird unverified geprüft um den Algorithmus zu bestimmen, dann vollständige Verifikation.

## 401-Handling in `callAPI()` (`lib/api.ts`)

```
Request mit token → 401?
  → supabase.auth.refreshSession()
    Fehler? → signOut() → throw
    OK? → neuen token holen → retry
      Wieder 401? → signOut() → throw
  → Anderer Fehlercode? → throw mit Statuscode
```

`signOut()` setzt die Session auf null → `onAuthStateChange` feuert → `AuthGuard` in `_layout.tsx` leitet zu `/(auth)/welcome`.

## Zwei Schlüssel

| Schlüssel | Wo | Zweck |
|-----------|-----|-------|
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Frontend | Client-seitige Reads (RLS greift) |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend only | Server-seitige Writes (bypassed RLS) |

**Service Role Key niemals ans Frontend.**

## RLS

Row Level Security stellt sicher dass Anon-Key-Reads nur eigene Daten zurückgeben.
FastAPI verwendet Service Role → kann für alle User schreiben (Household-Operationen, Plan-Inserts etc.).

Ownership-Checks passieren auf **beiden Ebenen**:
- RLS: automatisch für alle Supabase-Client-Reads
- FastAPI: expliziter Membership-Check vor jedem Write

## AuthGuard (`app/_layout.tsx`)

- Lauscht auf `supabase.auth.onAuthStateChange`
- Prüft Session + `onboardingComplete` (Zustand Store)
- Routet: kein Session → `/(auth)/welcome`, kein Onboarding → `/(onboarding)/step-batch`, sonst → `/(tabs)`
- Keine manuellen Auth-Checks in einzelnen Screens nötig
