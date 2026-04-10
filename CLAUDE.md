# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm start              # Start Expo dev server
npm run ios            # Run on iOS simulator
npm run android        # Run on Android emulator

# Type checking & linting
npm run type-check     # TypeScript noEmit check
npm run lint           # ESLint on .ts/.tsx files

# Testing
npm test               # Run Jest tests
npm run test:watch     # Watch mode
npm run test:coverage  # Coverage report
```

## Architecture

PlatePlan is an AI-powered meal planning React Native app built with Expo. The text-generation model runs exclusively in Supabase Deno Edge Functions — never in the client.

### Navigation & Auth

Expo Router with three route groups:
- `(auth)/` — welcome, sign-in, sign-up screens
- `(onboarding)/` — 7-step guided setup flow
- `(tabs)/` — main app (Meal Plan, Shopping, Profile, Recipes)

The root `_layout.tsx` acts as the auth guard: checks Supabase session and whether onboarding is complete, then routes accordingly.

### State Management

Two separate layers:
1. **React Query** (`@tanstack/react-query`) — all server/remote state. Cache keys are keyed by `weekStart` date for weekly plan browsing. Hooks live in `hooks/`.
2. **Zustand** — client-only state. `onboardingStore.ts` persists the multi-step form to AsyncStorage so users can resume mid-flow. `uiStore.ts` handles transient UI state (modals, toasts).

### Data Layer

- **Supabase client** (`lib/supabase.ts`) — full TypeScript type definitions and camelCase mappers (`mapMealPlan`, `mapRecipe`, etc.) that transform snake_case DB rows.
- **RLS enforces user isolation** on the client (anon key). Edge Functions use the service role key to bypass RLS for writes.
- Key distinction: `PlannedMeal` is the raw DB row; `HydratedMeal` resolves the chosen recipe and is what the UI consumes.

### Edge Functions (Supabase/Deno)

All AI and complex server logic lives in `supabase/functions/`:
- `generate-plan/` — full weekly meal plan via DeepSeek
- `regenerate-meal/` — regenerate a single meal slot
- `generate-shopping-list/` — aggregate ingredients by category
- `process-feedback/` — feedback processing (currently on hold)
- `process-receipt/` — receipt OCR via Anthropic Vision (currently on hold)
- `_shared/prompts.ts` — shared prompt constants

Prompts are centralized in `constants/prompts.ts`. Edge Functions build user-specific prompts dynamically from user preferences and feedback history. Zod validates structured model JSON responses before DB writes. Retry logic uses exponential backoff (3 attempts).

### Styling

NativeWind 4 (Tailwind CSS for React Native). Design tokens (colors, spacing, typography) are in `constants/theme.ts`. Primary color: `#2D6A4F` (green).

## Key Conventions

- **All text-generation API calls go through Edge Functions** — the `DEEPSEEK_API_KEY` is a Supabase secret, never exposed to the client.
- **Optimistic updates** — meal status changes update the UI immediately and revert on error.
- **Mappers** — always use the mapper functions in `lib/supabase.ts` when reading DB rows; never access snake_case fields directly in the UI layer.
- **React Query cache invalidation** — after any mutation that changes plan data, invalidate the relevant query keys so the UI stays in sync.

## Environment Variables

```env
EXPO_PUBLIC_SUPABASE_URL=      # Client-facing Supabase URL
EXPO_PUBLIC_SUPABASE_ANON_KEY= # Client-facing anon key
DEEPSEEK_API_KEY=              # Server-side only (Supabase Edge Function secret)
ANTHROPIC_API_KEY=             # Still used by receipt OCR
```

`DEEPSEEK_API_KEY` and `ANTHROPIC_API_KEY` are set as Supabase secrets, not in `.env`.
