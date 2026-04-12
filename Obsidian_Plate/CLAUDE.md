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

### `issues/`
Anpassungs- und Verbesserungs-Tracking für bestehende oder geplante Features. Zwei Zustände:
- `open/<name>/` — offen
- `resolved/<name>/` — erledigt

Abgrenzung: Issues sind keine Bugs (nichts ist kaputt), sondern Scope- oder Verhaltensänderungen.
Jedes Issue ist via `[[...]]` an ein Feature gelinkt.

Vollständiger Workflow: siehe `issues/INSTRUCTION.md`

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

### Issue anlegen

Wenn eine Anpassung an einem Feature gewünscht wird:
1. Ordner in `issues/open/<feature-name>--<kurzbezeichnung>/` anlegen
2. Alle Dateien aus `issues/open/example/` hineinkopieren und ausfüllen
3. In `02_Feature_Link.md` das betroffene Feature verlinken
4. `HOME.md` → "Open Issues" ergänzen
5. Log-Eintrag in `llm_wiki/log.md`:
   ```
   ## [YYYY-MM-DD] issue | <issue-name>
   - Was: Neues Issue angelegt — <Kurzfassung>
   - Betroffene Seiten: features/..., issues/open/<name>
   ```

### Issue schließen

1. **Feature-Dateien updaten** (Pflicht, vor dem Schließen):
   - `01_Overview.md` — Scope/Beschreibung aktuell?
   - `05_Acceptance_Criteria.md` — neue Kriterien eingetragen?
   - `04_UI_Notes.md` — UI-Änderungen dokumentiert?
2. `04_Resolution.md` aus `issues/resolved/example/` in Issue-Ordner kopieren und ausfüllen
3. Gesamten Ordner nach `issues/resolved/` verschieben
4. `HOME.md` aktualisieren

### Trigger-Mapping — was Claude bei welcher Aussage tut

| User sagt … | Claude tut … |
|---|---|
| "implementiere [feature]" / "bau [feature]" / "baue [feature]" | 1. Feature-Ordner in `01_not_implemented/[name]/` lesen<br>2. Ordner nach `02_current/` verschieben<br>3. `features/02_current/00_example/` Dateien ergänzen<br>4. `feature-dev` Skill verwenden um zu bauen<br>5. Nach Fertigstellung: nach `03_production/` verschieben, `09_Final_implementation.md` ergänzen<br>6. `HOME.md` + `roadmap/backlog.md` updaten |
| "fix issue [name]" / "arbeite an issue [name]" | 1. `issues/open/[name]/` lesen<br>2. Verlinktes Feature lesen<br>3. Bauen<br>4. Feature-Dateien updaten (Pflicht)<br>5. Issue nach `resolved/` verschieben<br>6. `HOME.md` updaten |
| "fix bug [name]" / "fiх [bug]" | 1. `bugs/open/[name]/` lesen<br>2. Fixen<br>3. Bug nach `fixed/` verschieben<br>4. `HOME.md` updaten |
| "was als nächstes?" / "work on backlog" / "top priority" | `roadmap/backlog.md` lesen → Top P1 nehmen und vorschlagen |
| "plane feature [name]" / "leg feature an" | Feature-Ordner in `01_not_implemented/` anlegen, Templates ausfüllen, Backlog-Eintrag ergänzen |
| "leg issue an für [feature]" | Issue-Ordner in `issues/open/` anlegen, Templates ausfüllen, `HOME.md` updaten |

**Skills und PM-Workflow schließen sich nicht aus.** Claude darf (und soll) beim Bauen passende Skills verwenden — z.B. `feature-dev` für Features. Der PM-Workflow (Ordner verschieben, Dateien updaten, Log-Eintrag) kommt danach, als fester Abschlussschritt.

### Session Start

Zu Beginn jeder Session:
1. `HOME.md` lesen — aktueller Status, aktive Features, offene Issues, offene Bugs, Top-P1
2. Trigger-Mapping oben prüfen — welche Aussage des Users passt?
3. Bei UI-Arbeit: `UI_CI/` lesen bevor Komponenten gebaut werden

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
