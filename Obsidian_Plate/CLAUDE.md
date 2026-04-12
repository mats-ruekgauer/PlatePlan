# Obsidian_Plate — Agent Schema

Dieser Vault dient zwei Zwecken:
1. **PM-Tool** — Feature-Lifecycle via `features/`
2. **Agent-Brain** — Persistentes Wissenswiki via `llm_wiki/`

Das `CLAUDE.md` im Projekt-Root bleibt die technische Referenz. Dieses Wiki
ergänzt es mit Tiefe, Entscheidungshistorie und Domain-Wissen.

---

## Ordner-Übersicht

### `features/`
Feature-Lifecycle-Management. Drei Zustände:
- `01_not_implemented/` — geplant, noch nicht gestartet
- `02_current/` — aktiv in Umsetzung
- `03_production/` — shipped

Vollständiger Workflow: siehe `features/INSTRUCTION.md`

### `llm_wiki/`
Persistentes, LLM-gepflegtes Wissenswiki.

Struktur:
- `index.md` — Katalog aller Seiten (immer zuerst lesen bei Fragen)
- `log.md` — Append-only Operationslog
- `architecture/` — System-Architektur Seiten
- `entities/` — Domain-Entitäten
- `conventions/` — Coding-Konventionen & Patterns
- `decisions/` — Architektur-Entscheidungen (Warum X statt Y)

### `ideas/`
Rohe Ideen, noch nicht zu Features verfeinert. Promotion zu Features ist eine manuelle User-Entscheidung — Claude promoted niemals automatisch.

### `roadmap/`
- `backlog.md` — Priorisierter Backlog (P1/P2/P3), wird von Claude gepflegt

### `bugs/`
Bug-Tracking. Zwei Zustände:
- `open/<name>/` — offen
- `fixed/<name>/` — gefixt

Vollständiger Workflow: siehe `bugs/INSTRUCTION.md`

### `releases/`
Changelog. Eine Datei pro Release. Template: `releases/00_example.md`

### `UI_CI/`
Design-Konventionen. Bei UI-Arbeit immer zuerst lesen.
- `design-tokens.md` — Farben, Spacing, Typography (aus `constants/theme.ts`)
- `patterns.md` — Loading, Error, Empty State Standards

---

## Agent-Workflows

### Ingest (neues Wissen hinzufügen)

Wenn du etwas Wichtiges über das System lernst, das noch nicht im Wiki steht:

1. Kategorie bestimmen: architecture / entity / convention / decision
2. Seite im passenden Unterordner anlegen oder updaten
3. `llm_wiki/index.md` aktualisieren — neue Seite eintragen
4. Eintrag in `llm_wiki/log.md` anhängen:
   ```
   ## [YYYY-MM-DD] ingest | <Seitentitel>
   - Was: <Einzeiler>
   - Betroffene Seiten: <Liste>
   ```

### Query (Fragen beantworten)

1. `llm_wiki/index.md` lesen → relevante Seiten identifizieren
2. Seiten lesen → Antwort mit Referenzen synthetisieren (z.B. `[[conventions/mappers]]`)
3. Neue Erkenntnisse aus der Antwort direkt als Seite speichern (Ingest)

### Feature bauen (PM-Workflow)

Wenn ein neues Feature geplant wird:
1. Ordner in `features/01_not_implemented/<feature-name>/` anlegen
2. Alle Dateien aus `features/01_not_implemented/00_example/` hineinkopieren
3. Alle Template-Dateien ausfüllen
4. Wenn Umsetzung startet: gesamten Ordner nach `features/02_current/` verschieben
5. Dateien aus `features/02_current/00_example/` ergänzen (Status, Progress Log, Open Issues)
6. Log-Eintrag:
   ```
   ## [YYYY-MM-DD] feature | <feature-name>
   - Was: Feature gestartet / Feature shipped
   - Betroffene Seiten: features/02_current/<feature-name>
   ```
7. Nach Fertigstellung: gesamten Ordner nach `features/03_production/` verschieben
8. `09_Final_implementation.md` aus Example ergänzen

### Session Start

Zu Beginn jeder Session:
1. `HOME.md` lesen — aktueller Status, aktive Features, offene Bugs, Top-P1
2. Bei "build [feature]": `features/01_not_implemented/[name]/` lesen
3. Bei "fix [bug]": `bugs/open/[name]/` lesen
4. Bei "was als nächstes?" / "work on backlog": `roadmap/backlog.md` lesen → Top P1 nehmen
5. Bei UI-Arbeit: `UI_CI/` lesen bevor Komponenten gebaut werden

### Backlog pflegen

Wenn ein Feature in `01_not_implemented/` angelegt wird:
→ Eintrag in `roadmap/backlog.md` hinzufügen (P1/P2/P3 nach Absprache)

Wenn ein Feature nach `02_current/` verschoben wird:
→ Checkbox in `roadmap/backlog.md` ankreuzen, `[in progress]` ergänzen

Wenn ein Feature nach `03_production/` verschoben wird:
→ Eintrag aus P1/P2/P3 entfernen, in `## Done` verschieben
→ Eintrag in aktuellem `releases/` anlegen
→ `HOME.md` aktualisieren

### Lint (periodischer Health-Check)

Vor großen Features oder wenn Wiki sich veraltet anfühlt:
- Widersprüche zwischen Seiten flaggen
- Orphan-Seiten (keine `[[Links]]` die darauf zeigen) identifizieren
- Konzepte die erwähnt werden aber keine eigene Seite haben
- `log.md` mit Lint-Ergebnissen updaten

---

## Frontmatter-Konvention

Alle `llm_wiki/` Seiten beginnen mit:

```yaml
---
title: <Seitentitel>
category: architecture | entity | convention | decision
last_updated: YYYY-MM-DD
related: [[relative/pfad]], [[anderer/pfad]]
---
```

## Log-Format

`log.md` Einträge immer:

```
## [YYYY-MM-DD] <operation> | <Titel>
- Was: <Zusammenfassung>
- Betroffene Seiten: <kommagetrennte Seiten>
```

Operationen: `ingest`, `query`, `feature`, `lint`, `decision`
