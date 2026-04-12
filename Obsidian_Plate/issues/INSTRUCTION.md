# Issues — Workflow

Issues beschreiben **Anpassungen, Verbesserungen oder Korrekturen** an bestehenden oder geplanten Features.
Sie sind immer an ein Feature gelinkt und dokumentieren, was sich ändern soll — und warum.

> **Abgrenzung:**
> - `bugs/` → etwas funktioniert falsch / kaputt
> - `issues/` → etwas funktioniert, soll aber anders sein (Verhalten, UX, Scope, Design)
> - `ideas/` → noch kein Feature-Bezug, reine Rohideen

---

## Ordner-Struktur

```
issues/
├── INSTRUCTION.md       ← diese Datei
├── open/
│   └── <issue-name>/   ← ein Ordner pro Issue
│       ├── 01_Issue.md
│       ├── 02_Feature_Link.md
│       └── 03_Status.md
└── resolved/
    └── <issue-name>/   ← hierher verschieben wenn erledigt
        └── 04_Resolution.md  ← hinzufügen nach Erledigung
```

---

## Workflow

### Neues Issue anlegen

1. Ordner in `issues/open/<issue-name>/` erstellen
2. Alle Dateien aus `issues/open/example/` hineinkopieren und ausfüllen
3. In `02_Feature_Link.md` das betroffene Feature via `[[...]]` verlinken
4. Eintrag in `HOME.md` → Sektion "Open Issues" ergänzen
5. Optional: Rückverweis im Feature-Ordner unter `03_Relations.md` setzen

### Issue bearbeiten / in Arbeit nehmen

1. `03_Status.md` auf `In Progress` setzen, Assignee + Datum eintragen
2. Feature-Dateien sofort anpassen — **nicht erst beim Schließen:**
   - Scope ändert sich → `01_Overview.md` des Features updaten
   - Verhalten ändert sich → `05_Acceptance_Criteria.md` anpassen
   - UI betroffen → `04_UI_Notes.md` anpassen
   - Abhängigkeiten ändern sich → `03_Relations.md` anpassen

### Issue schließen

**Pflicht: Das verlinkte Feature muss aktuell sein, bevor das Issue als resolved gilt.**

1. Feature-Dateien final prüfen und abgleichen:
   - `01_Overview.md` — spiegelt das Issue die geänderte Beschreibung wider?
   - `05_Acceptance_Criteria.md` — sind die neuen Kriterien eingetragen?
   - `04_UI_Notes.md` — sind UI-Änderungen dokumentiert?
   - `06_Open_Questions.md` — durch das Issue entstandene Fragen beantwortet?
2. `04_Resolution.md` aus `resolved/example/` in den Issue-Ordner kopieren und ausfüllen
3. Gesamten Ordner von `open/` nach `resolved/` verschieben
4. `HOME.md` aktualisieren (Issue aus Open Issues entfernen)
5. Log-Eintrag in `llm_wiki/log.md` anhängen:
   ```
   ## [YYYY-MM-DD] issue | <issue-name>
   - Was: Issue geschlossen — <Kurzfassung der Lösung>
   - Betroffene Seiten: features/..., issues/resolved/<name>
   ```

---

## Namenskonvention

`<feature-name>--<kurzbezeichnung>` z.B. `favorites-management--sort-order`

---

## Verlinkung

- Issues → Features: `[[features/02_current/<name>/01_Overview]]`
- Features → Issues: optional, in `03_Relations.md` des Features
- Issues untereinander: wenn ein Issue ein anderes blockiert oder davon abhängt
