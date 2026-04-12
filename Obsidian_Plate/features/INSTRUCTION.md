# Feature System Workflow

Dieses System strukturiert Features nach ihrem aktuellen Umsetzungsstand.

## Ordnerstruktur

- `01_not_implemented`
- `02_current`
- `03_production`

Jeder dieser Ordner enthält einen `00_example`-Ordner als Vorlage für Features in diesem Status.

## Grundprinzip

Ein Feature startet immer in `01_not_implemented`.

Dort werden die geplanten Inhalte beschrieben, zum Beispiel:
- Überblick
- User Story
- Beziehungen zu anderen Features
- UI-Hinweise
- Acceptance Criteria
- offene Fragen

Sobald mit der Umsetzung begonnen wird, wird der komplette Feature-Ordner nach `02_current` verschoben.

Dabei gilt:
- Alle bisherigen Dateien bleiben erhalten
- Die Inhalte werden nicht ersetzt
- Die bestehenden Dateien werden bei Bedarf ergänzt
- Zusätzlich kommen die Dateien aus dem `example`-Ordner von `02_current` dazu

Typische Ergänzungen in `02_current` sind:
- `00_Status`
- `07_Progress_Log`
- `08_Open_Issues`

Wenn das Feature fertig implementiert und produktionsreif ist, wird der komplette Feature-Ordner nach `03_production` verschoben.

Auch hier gilt wieder:
- Alle bisherigen Dateien bleiben erhalten
- Die bisherigen Inhalte bleiben als Verlauf bestehen
- Die Dateien aus dem `example`-Ordner von `03_production` werden ergänzt

Typische Ergänzung in `03_production`:
- `09_Final_implementation`

## Wichtige Regel

Ein Feature wird beim Wechsel des Status nicht neu angelegt, sondern immer als kompletter Ordner in den nächsten Status verschoben.

Das Ziel ist:
- keine Informationsverluste
- klare Trennung nach Status
- saubere Weiterentwicklung eines Features von Planung bis Produktion

## Workflow

### 1. Neues Feature
- Neues Feature auf Basis von `01_not_implemented/example` anlegen
- Dateien ausfüllen

### 2. Umsetzung startet
- Kompletten Feature-Ordner nach `02_current` verschieben
- Dateien aus `02_current/example` ergänzen
- Fortschritt dokumentieren

### 3. Feature ist fertig
- Kompletten Feature-Ordner nach `03_production` verschieben
- Dateien aus `03_production/example` ergänzen
- finalen Stand dokumentieren

## Ziel des Systems

Das System soll sicherstellen, dass jedes Feature:
- zuerst sauber beschrieben wird
- während der Umsetzung dokumentiert wird
- am Ende einen klaren finalen Stand hat