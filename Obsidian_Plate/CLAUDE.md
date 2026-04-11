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
Rohe Ideen, noch nicht zu Features verfeinert.

### `UI_CI/`
Design-Konventionen und Component-Guidelines (zukünftig).

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
2. Alle Dateien aus `features/01_not_implemented/example/` hineinkopieren
3. Alle Template-Dateien ausfüllen
4. Wenn Umsetzung startet: gesamten Ordner nach `features/02_current/` verschieben
5. Dateien aus `features/02_current/example/` ergänzen (Status, Progress Log, Open Issues)
6. Log-Eintrag:
   ```
   ## [YYYY-MM-DD] feature | <feature-name>
   - Was: Feature gestartet / Feature shipped
   - Betroffene Seiten: features/02_current/<feature-name>
   ```
7. Nach Fertigstellung: gesamten Ordner nach `features/03_production/` verschieben
8. `09_Final_implementation.md` aus Example ergänzen

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
