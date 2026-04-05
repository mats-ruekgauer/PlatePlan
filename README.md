# PlatePlan 🍽️

An AI-powered meal planning app built with React Native (Expo) and Supabase. PlatePlan generates personalised weekly meal plans, builds your shopping list automatically, and learns from your preferences over time.

---

## Features

### Meal Planning
- **AI-generated weekly meal plans** — Claude creates a full week of meals based on your dietary preferences, nutrition targets, cuisine preferences, and seasonality settings
- **Week navigation** — scroll to browse previous and future weeks; generate next week's plan with one tap
- **Meal actions per slot** — Approve, Skip (with undo), or request a completely different meal (↻ Different, AI-powered)
- **Status tracking** — each meal progresses through Recommended → Planned → Prepared → Cooked → Rated
- **Estimated price** — each recipe shows a per-serving cost estimate in EUR
- **Batch cooking** — recipes are grouped across days when batch cooking is enabled

### Shopping List
- **Auto-generated** — a shopping list is created automatically every time a new plan is generated
- **Grouped by category** — items organised for efficient supermarket runs
- **Progress tracking** — check off items as you shop; "All done!" banner when complete

### Favourites
- **Star any meal** — tap the ⭐ on a meal detail screen to save it as a favourite
- **Add manually** — add custom dish names in Profile settings
- **Influences planning** — favourites are passed to Claude so similar meals appear more often

### Automations
- **Apple Reminders export** — automatically open Reminders with the shopping list after every plan generation
- **SMS share** — automatically send the shopping list to a saved contact via SMS

### Onboarding
- Guided 7-step setup: goals (TDEE calculator), food preferences, meal slots, batch cooking, pantry staples, shopping days
- Preferences editable any time from the Profile tab (no re-onboarding required)

### Profile & Settings
- Edit nutrition goals, meal slots, food preferences, shopping days independently
- View and manage favourite dishes
- Configure automations

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo SDK 55 |
| Navigation | Expo Router (file-based) |
| Styling | NativeWind v4 (Tailwind CSS) |
| State | Zustand + AsyncStorage (onboarding), React Query (server state) |
| Backend | Supabase (PostgreSQL + Auth + Row-Level Security) |
| AI | Anthropic Claude (via Supabase Edge Functions) |
| Edge Functions | Deno (Supabase Functions) |

---

## Project Structure

```
PlatePlan/
├── app/
│   ├── (auth)/          # Welcome, sign-in, sign-up screens
│   ├── (onboarding)/    # 7-step onboarding flow
│   ├── (tabs)/          # Main app tabs (Meal Plan, Shopping, Profile)
│   ├── meal/[id].tsx    # Meal detail + feedback screen
│   └── settings/        # Standalone settings screens (preferences)
├── components/
│   ├── plan/            # DayCard, MealSlot, MealSwapper
│   ├── onboarding/      # Progress indicator
│   └── ui/              # Badge, Button, Card, Skeleton, etc.
├── hooks/               # React Query hooks (usePlan, useShoppingList, useFavorites, …)
├── lib/                 # Supabase client, mappers, sharing utils
├── stores/              # Zustand onboarding store
├── supabase/
│   ├── functions/       # Edge Functions (generate-plan, regenerate-meal, generate-shopping-list)
│   └── migrations/      # SQL migrations
└── types/               # Shared TypeScript types
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- Expo CLI (`npm install -g expo`)
- Supabase account
- Anthropic API key

### 1. Clone & install

```bash
git clone https://github.com/mats-ruekgauer/PlatePlan.git
cd PlatePlan
npm install
```

### 2. Environment variables

Create a `.env` file in the project root:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Supabase setup

Run the migrations in order:

```bash
supabase db push
# or apply manually via Supabase Dashboard → SQL editor
```

Deploy the Edge Functions:

```bash
supabase functions deploy generate-plan --no-verify-jwt
supabase functions deploy regenerate-meal --no-verify-jwt
supabase functions deploy generate-shopping-list --no-verify-jwt
```

Set the `ANTHROPIC_API_KEY` secret in your Supabase project:

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

### 4. Run

```bash
npx expo start --ios
```

---

## Database Schema

| Table | Purpose |
|---|---|
| `profiles` | Display name, avatar |
| `user_preferences` | Nutrition targets, dietary restrictions, meal slots, shopping days, etc. |
| `meal_plans` | Weekly plan metadata (week_start, status) |
| `planned_meals` | Individual meal slots with status, recipe references |
| `recipes` | Full recipe data (ingredients, steps, macros, estimated price) |
| `shopping_lists` | Generated shopping list items (JSONB array) |
| `meal_feedback` | Taste / portion ratings per meal |
| `user_favorites` | Starred recipes + manually added favourite dishes |
| `automations` | User-configured automations (Reminders, SMS) |

---

## Edge Functions

### `generate-plan`
Generates a full 7-day meal plan for the given `weekStart` date. Loads user preferences, feedback history, and favourite dishes, then calls Claude to produce structured recipe JSON. Stores recipes and planned meals in the database.

### `regenerate-meal`
Replaces a single planned meal slot with a new AI-generated recipe. Avoids duplicating any meal already in the current week's plan.

### `generate-shopping-list`
Aggregates all ingredients from a plan's recipes, deduplicates, groups by category, and stores as a `shopping_lists` row.

---

## Roadmap

### 🐛 Bug Fixes (current)
- [ ] Generate new week doesn't work
- [ ] View meal doesn't work
- [ ] Edit preferences doesn't work
- [ ] Shopping list doesn't work

### ✨ New Features
- [ ] **Households vs Accounts** — shared planning for families / flatmates
- [ ] **Equipment** — user specifies available kitchen equipment; affects recipe suggestions
- [ ] **Meal plan layout overhaul** — combine status + Approve/Skip into one button; integrate shopping list view into meal plan
- [ ] **Price per ingredient** — show cost breakdown at ingredient level, not just per serving
- [ ] **Preferences: processed ingredients** — slider for how much pre-processed / convenience food is acceptable
- [ ] **Dish list** — browse all generated recipes in one place

### 🔁 Ongoing
- [ ] Fix bugs (post-feature)
- [ ] Extensive testing

### 🚀 Launch Milestones
- [ ] **Private go-live** — get the app running and approved on the App Store
- [ ] **Friends & family go-live** — limited rollout for feedback
- [ ] **Public go-live**
