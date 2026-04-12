# Design: Obsidian als PM- und Agent-Brain für PlatePlan

**Date:** 2026-04-12
**Status:** Approved

---

## Goal

Den Obsidian-Vault `Obsidian_Plate/` als zwei-in-einem Tool aufbauen:
1. **PM-Tool** — Features über ihren gesamten Lifecycle tracken (Plan → In Progress → Production)
2. **Agent-Brain** — Ein persistent gepflegtes LLM-Wiki, das Agents Projekt-Kontext liefert ohne ihn jedes Mal neu aus dem Code ableiten zu müssen

Das `CLAUDE.md` im Projekt-Root bleibt unverändert. Das Wiki **ergänzt** es mit Tiefe, Entscheidungshistorie und Domain-Wissen.

---

## Vault-Struktur

```
Obsidian_Plate/
├── CLAUDE.md              ← Schema: erklärt Agents den ganzen Vault + Workflows
├── features/              ← PM-Tool (bereits strukturiert)
│   ├── INSTRUCTION.md     ← Workflow-Beschreibung (bereits vorhanden)
│   ├── 01_not_implemented/
│   ├── 02_current/
│   └── 03_production/
├── llm_wiki/              ← Agent-Brain
│   ├── index.md           ← Katalog aller Wiki-Seiten (Agent liest zuerst)
│   ├── log.md             ← Append-only Log (Ingests, Entscheidungen, Queries)
│   ├── architecture/      ← System-Architektur
│   ├── entities/          ← Domain-Entitäten
│   ├── conventions/       ← Coding-Konventionen & Patterns
│   └── decisions/         ← Architektur-Entscheidungen (Warum X statt Y)
├── ideas/                 ← Ideen-Sammlung (bereits vorhanden)
└── UI_CI/                 ← Design-Konventionen (zukünftig)
```

---

## CLAUDE.md Schema

Das `Obsidian_Plate/CLAUDE.md` definiert für Agents:

- Zweck jedes Ordners
- Drei Haupt-Operationen: **Ingest**, **Query**, **Feature bauen**
- Lint-Workflow (periodisch)
- Konventionen: Frontmatter-Format, Log-Format, Verlinkung

---

## llm_wiki — Initiale Seiten

Beim Setup werden folgende Seiten aus bestehendem Projekt-Wissen erstellt:

### `architecture/`
- `backend.md` — FastAPI-Endpunkte, Auth-Flow, Service-Role vs JWT
- `frontend.md` — Expo Router, Route Groups, Navigation-Guard
- `data-layer.md` — Supabase Client vs FastAPI Client, RLS
- `state-management.md` — React Query (Server State) vs Zustand (Client State)

### `entities/`
- `meal-plan.md` — PlannedMeal vs HydratedMeal
- `household.md` — Household-Modell, Invite-Token
- `recipe.md` — Recipe-Struktur

### `conventions/`
- `mappers.md` — snake_case → camelCase, wann zu nutzen
- `react-query.md` — Cache-Keys nach weekStart, Invalidierung nach Mutation
- `auth.md` — JWT-Flow Frontend → FastAPI, Service-Role für Writes
- `ai-calls.md` — Nur via Backend, nie Client-seitig

### `decisions/`
- `fastapi-over-edge-functions.md` — Warum AI-Calls ins Backend wanderten

---

## Agent-Workflows

### Ingest (neue Info in Wiki einpflegen)
1. Quelle lesen/verstehen
2. Summary-Seite im passenden Unterordner anlegen
3. Betroffene bestehende Seiten updaten (Cross-References, Widersprüche)
4. `index.md` aktualisieren (neue Seite eintragen)
5. Eintrag in `log.md` anhängen

### Query (Frage gegen Wiki beantworten)
1. `index.md` lesen → relevante Seiten identifizieren
2. Seiten lesen → Antwort synthetisieren mit Zitaten
3. Wertvolle Erkenntnisse als neue Seite speichern (Wissen accumulates)

### Feature bauen (PM-Workflow)
1. Feature-Ordner in `01_not_implemented/` anlegen (aus Example-Template)
2. Alle Template-Dateien ausfüllen
3. Brainstorming → Spec → Implementation Plan
4. Ordner nach `02_current/` verschieben wenn Umsetzung startet
5. `log.md` Eintrag: Feature gestartet
6. Nach Fertigstellung → `03_production/`

### Lint (periodisch)
- Widersprüche zwischen Seiten flaggen
- Orphan-Seiten (keine Verlinkung) identifizieren
- Veraltete Claims markieren
- Fehlende Cross-References ergänzen

---

## Frontmatter-Konvention (llm_wiki Seiten)

```yaml
---
title: <Seitenname>
category: architecture | entity | convention | decision
last_updated: YYYY-MM-DD
related: [[andere-seite]], [[noch-eine]]
---
```

---

## Log-Format (`log.md`)

```
## [YYYY-MM-DD] <operation> | <title>
- Was: ...
- Betroffene Seiten: ...
```

---

## Out of Scope

- `UI_CI/` — wird später separat designed
- Obsidian Plugin-Konfiguration (Dataview, Marp etc.) — optional, nicht Teil dieses Setups
- Automatisierte Sync-Tools — manuell + LLM-gestützt reicht für diesen Scale
