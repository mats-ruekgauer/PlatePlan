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
