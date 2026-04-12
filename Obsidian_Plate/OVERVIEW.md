# PlatePlan — Projektübersicht

> KI-gestützte Mahlzeitenplanung für iOS & Android. Generiert personalisierte Wochenpläne, erstellt Einkaufslisten und lernt aus Feedback.

---

## 📦 Tech Stack

| Schicht | Technologie | Aufgabe |
|---------|-------------|---------|
| **App** | React Native + Expo | iOS & Android |
| **Navigation** | Expo Router | File-based Routing |
| **Styling** | NativeWind 4 (Tailwind) | UI, Primärfarbe `#2D6A4F` |
| **State** | React Query + Zustand | Server-State + Client-State |
| **Backend** | FastAPI (Python) | Business-Logik, AI, alle Writes |
| **Datenbank** | Supabase (PostgreSQL) | Speicherung + Auth + Realtime |
| **AI** | DeepSeek | Mahlzeitengenerierung |
| **OCR** | Anthropic Vision | Kassenbon-Scanner |

---

## 🏗️ Architektur

```
┌─────────────────────────────────────────────────────────┐
│                    React Native App                      │
│                                                         │
│   Reads ──────────────────────────► Supabase (RLS)      │
│   Writes ──────────────────────────► FastAPI Backend    │
│   Auth ────────────────────────────► Supabase Auth      │
└─────────────────────────────────────────────────────────┘
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
    ┌──────────────────┐   ┌──────────────────────┐
    │  FastAPI Backend │   │  Supabase            │
    │                  │   │                      │
    │  • Alle Writes   │──►│  • PostgreSQL DB     │
    │  • AI Calls      │   │  • RLS Policies      │
    │  • JWT Check     │   │  • Realtime Push     │
    │  • Business-     │   │  • Auth (JWT)        │
    │    Logik         │   │  • Storage           │
    └──────────────────┘   └──────────────────────┘
```

### Goldene Regeln

> [!important] Schreiben = FastAPI, Lesen = Supabase
> - Kein `supabase.from().insert/update/delete` im Frontend
> - Alle Writes über `callAPI('/api/...')` → FastAPI
> - Reads direkt über Supabase Client (anon key + RLS)
> - Supabase = Infra. FastAPI = Gehirn.

### Auth Flow

```
1. Supabase signIn ──► JWT (access + refresh token)
2. Token in AsyncStorage (Supabase verwaltet das)
3. Jeder API-Request ──► Authorization: Bearer <token>
4. FastAPI prüft JWT cryptographisch (JWKS / HS256)
5. Token abgelaufen ──► auto-refresh, dann retry
6. Refresh fehlgeschlagen ──► signOut ──► Login Screen
```

---

## 🗂️ Codestruktur

```
PlatePlan/
├── frontend/
│   ├── app/
│   │   ├── (auth)/          ← Welcome, Sign In, Sign Up
│   │   ├── (onboarding)/    ← 7-Step Setup
│   │   └── (tabs)/          ← Meal Plan, Shopping, Profile, Recipes
│   ├── hooks/               ← React Query Hooks (alle Reads + Mutations)
│   ├── lib/
│   │   ├── supabase.ts      ← Supabase Client + Mapper-Funktionen
│   │   └── api.ts           ← callAPI() für FastAPI
│   ├── stores/              ← Zustand (Onboarding, Household, UI)
│   └── types/               ← Shared TypeScript Types
│
├── backend/
│   └── app/
│       ├── routers/         ← plan, shopping, feedback, households,
│       │                       profile, favorites, automations
│       ├── services/        ← deepseek, prompts, preferences, db
│       └── dependencies.py  ← JWT-Validierung
│
└── supabase/functions/
    └── process-receipt/     ← Receipt OCR (einzige Edge Function)
```

---

## ✅ Features — Was ist live

| Feature | Beschreibung |
|---------|-------------|
| **Auth** | Email/Passwort, Session-Management, Auto-Refresh |
| **Onboarding** | 7-Schritte Setup: Ziele, Ernährung, Haushalt, Präferenzen |
| **Meal Plan** | KI-generierter Wochenplan (DeepSeek), Regenerierung einzelner Slots |
| **Meal View** | Rezept-Details, Status-Tracking (empfohlen / gekocht / übersprungen) |
| **Shopping List** | KI-aggregierte Einkaufsliste, abhaken, Export |
| **Feedback** | Bewertungen pro Mahlzeit, Auto-Blacklist bei negativem Feedback |
| **Household** | Mehrere Nutzer, Invite-Links, gemeinsame Planung |
| **Profil** | Kalorien-/Makro-Ziele, Einschränkungen, Lieblingsküchen |
| **Recipes** | KI-Rezepte + manuelle Rezepte, Zutaten, Nährwerte |
| **Automations** | Einkaufsliste per SMS teilen, iOS Reminders Export |

---

## 🗺️ Roadmap

### P1 — Nächste Schritte

| Feature | Warum | Status |
|---------|-------|--------|
| **Favoriten-Management** | DB bereits vorhanden, Quick Win | 🔲 |
| **Dish-List (Wunschliste)** | Nutzer gibt Lieblingsgerichte vor → Plan berücksichtigt sie | 🔲 |

### P2 — Mittelfristig

| Feature | Warum |
|---------|-------|
| **Kassenbon-Scanner** | Kostentracking, OCR-Function bereits vorhanden |
| **Cook-from-Scratch Modus** | Vertiefter Filter, DB-Spalte existiert bereits |

### P3 — Nice to have

| Feature | Warum |
|---------|-------|
| **Push Notifications** | Erinnerungen für Mahlzeiten, Schema vorhanden |

---

## 🎨 Design System

**Primärfarbe:** `#2D6A4F` (Dunkelgrün)

| Farbe | Hex | Wo |
|-------|-----|----|
| Primary | `#2D6A4F` | Buttons, CTAs, aktive Zustände |
| Primary Light | `#52B788` | Sekundäre Highlights |
| Primary XLight | `#D8F3DC` | Hintergründe, Chips |
| Surface | `#FFFFFF` | Cards, Modals |
| Danger | `#DC2626` | Fehler, Löschen |

Design-Tokens vollständig: [[UI_CI/design-tokens]] | Patterns: [[UI_CI/patterns]]

---

## 🗃️ Datenbank — Tabellen

| Tabelle | Inhalt |
|---------|--------|
| `profiles` | User-Profile (Display Name) |
| `user_preferences` | Kalorien, Makros, Ernährungseinschränkungen, Sprache |
| `households` | Haushalt-Settings (Meal Slots, Shopping Days) |
| `household_members` | Haushalt-Mitgliedschaften + Rollen |
| `household_invites` | Invite-Token-Hashes + Ablaufzeiten |
| `recipes` | KI- und manuell erstellte Rezepte |
| `meal_plans` | Wochenpläne (per Haushalt + Wochenbeginn) |
| `planned_meals` | Einzelne Mahlzeit-Slots (Rezept-Zuordnung, Status) |
| `shopping_lists` | Aggregierte Einkaufslisten per Plan |
| `meal_feedback` | Bewertungen (Geschmack, Portion, Wiederholung) |
| `user_favorites` | Favorisierte Rezepte + Custom-Favoriten |
| `automations` | User-konfigurierte Automationen (SMS, Reminders) |
| `receipt_items` | OCR-gescannte Kassenbon-Posten |

---

## 🔗 Schnelllinks

- Status & aktive Arbeit → [[HOME]]
- Priorisierter Backlog → [[roadmap/backlog]]
- Architektur (technisch) → [[llm_wiki/architecture/data-layer]]
- Alle FastAPI Endpoints → [[llm_wiki/architecture/backend]]
- Auth Flow (technisch) → [[llm_wiki/conventions/auth]]
- Design Tokens → [[UI_CI/design-tokens]]
