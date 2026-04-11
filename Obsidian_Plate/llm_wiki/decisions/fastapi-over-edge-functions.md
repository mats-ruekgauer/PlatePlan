---
title: FastAPI über Supabase Edge Functions
category: decision
last_updated: 2026-04-12
related: [[architecture/backend]], [[conventions/ai-calls]]
---

# FastAPI über Supabase Edge Functions

## Entscheidung

AI-Calls und komplexe Server-Logik laufen im FastAPI Python Backend, nicht in Supabase Edge Functions.

## Kontext

Ursprünglich liefen AI-Operationen in Supabase Edge Functions (Deno/TypeScript).
Das wurde auf FastAPI Python migriert.

## Gründe

- **Python-Ökosystem** — AI/ML-Bibliotheken, DeepSeek SDK, bessere LLM-Tooling-Unterstützung
- **Komplexität** — Edge Functions haben Limitierungen bei langen Laufzeiten und Payload-Größen
- **Debugging** — Lokale FastAPI-Entwicklung einfacher als Edge Function Debugging
- **Kontrolle** — Volle Kontrolle über Dependencies, kein Deno-Constraint
- **Einheitlichkeit** — Eine Sprache (Python) für alle Backend-Logik

## Was noch in Supabase läuft

- `process-receipt` Edge Function — Receipt OCR via Anthropic Vision
  - Bleibt als Edge Function weil es nah an Supabase Storage sitzt und simpel genug ist

## Impact

- `DEEPSEEK_API_KEY` lebt in `backend/.env`, niemals im Frontend
- Frontend kommuniziert via `callAPI()` in `lib/api.ts` mit dem Backend
- Alle AI-Endpunkte unter `/api/` prefix im FastAPI Server
