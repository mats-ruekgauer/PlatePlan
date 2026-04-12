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

### Plan
| Methode | Pfad | Zweck |
|---------|------|-------|
| POST | `/api/plan/generate` | Vollständigen Wochenplan via DeepSeek generieren |
| POST | `/api/plan/regenerate-meal` | Einzelnen Meal-Slot neu generieren |
| POST | `/api/plan/swap-meal` | `chosen_recipe_id` für ein Meal setzen |
| POST | `/api/plan/update-meal-status` | Meal-Status ändern (`recommended` → `cooked` etc.) |

### Shopping
| Methode | Pfad | Zweck |
|---------|------|-------|
| POST | `/api/shopping/generate` | Einkaufsliste nach Kategorie aggregieren |
| POST | `/api/shopping/toggle-item` | Shopping-Item abhaken/abhaken rückgängig |
| POST | `/api/shopping/mark-exported` | Liste als exportiert markieren (`exported_at`) |

### Feedback
| Methode | Pfad | Zweck |
|---------|------|-------|
| POST | `/api/feedback` | Feedback verarbeiten + Auto-Blacklist |

### Households
| Methode | Pfad | Zweck |
|---------|------|-------|
| POST | `/api/households` | Household anlegen + Invite-Token erstellen |
| POST | `/api/households/mine` | *(nicht mehr vom Frontend aufgerufen — Reads via Supabase direkt)* |
| POST | `/api/households/join` | Household via Invite-Token beitreten |
| POST | `/api/households/{id}/members` | *(nicht mehr vom Frontend aufgerufen — Reads via Supabase direkt)* |
| POST | `/api/households/{id}/invite` | Invite-Link rotieren |
| POST | `/api/households/{id}/update` | Household-Settings updaten |
| POST | `/api/households/{id}/leave` | Aus Household austreten |

> Household-Reads (`mine`, `members`) wurden auf Supabase-Direct-Read umgestellt (2026-04-12). Die FastAPI-Endpunkte bleiben im Backend, werden aber nicht mehr vom Frontend genutzt.

### Profile
| Methode | Pfad | Zweck |
|---------|------|-------|
| POST | `/api/profile/update-display-name` | Display-Name des Users ändern |
| POST | `/api/profile/update-preferences` | User-Preferences partiell updaten |

### Favorites
| Methode | Pfad | Zweck |
|---------|------|-------|
| POST | `/api/favorites/toggle` | Rezept-Favorit hinzufügen oder entfernen (idempotent) |
| POST | `/api/favorites/add-custom` | Custom-Favorit (kein Rezept) anlegen |
| POST | `/api/favorites/remove` | Favorit nach ID löschen (Ownership-Check) |

### Automations
| Methode | Pfad | Zweck |
|---------|------|-------|
| POST | `/api/automations/upsert` | Automation erstellen oder updaten (by user_id + type) |
| POST | `/api/automations/delete` | Automation löschen (Ownership-Check) |

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
