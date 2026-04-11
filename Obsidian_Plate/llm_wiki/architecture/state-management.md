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
