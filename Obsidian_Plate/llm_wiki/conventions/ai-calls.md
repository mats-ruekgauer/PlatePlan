---
title: AI-Calls Konvention
category: convention
last_updated: 2026-04-12
related: [[architecture/backend]], [[decisions/fastapi-over-edge-functions]]
---

# AI-Calls Konvention

## Regel

**Alle AI-Calls laufen ausschließlich über das FastAPI Backend.**
Niemals direkt aus dem Frontend oder aus Supabase Edge Functions heraus (außer `process-receipt`).

## Warum

- `DEEPSEEK_API_KEY` ist ein Backend-Env-Var, wird niemals an den Client exponiert
- Zentrale Kontrolle über AI-Logik, Prompts und Fehlerbehandlung
- Einfacheres Debugging und Logging

## Ausnahme

`process-receipt` Supabase Edge Function nutzt `ANTHROPIC_API_KEY` für Receipt OCR.
Das ist die einzige erlaubte AI-Operation außerhalb des FastAPI Backends.

## Zugehörige Endpunkte

| Endpunkt | AI-Operation |
|----------|-------------|
| `POST /api/plan/generate` | Wochenplan via DeepSeek |
| `POST /api/plan/regenerate-meal` | Einzel-Meal via DeepSeek |
| `POST /api/shopping/generate` | Shopping-Liste Aggregation |

Hintergründe: [[decisions/fastapi-over-edge-functions]]
