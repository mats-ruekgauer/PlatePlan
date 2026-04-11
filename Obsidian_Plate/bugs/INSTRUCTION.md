# Bug Workflow

## Lifecycle

`bugs/open/<name>/` → `bugs/fixed/<name>/`

Ein Bug bleibt als kompletter Ordner erhalten wenn er gefixt wird — kein Informationsverlust.

## Prioritäten

| Stufe | Bedeutung |
|-------|-----------|
| **P0** | App-Crash oder komplett unbrauchbar |
| **P1** | Core-Flow kaputt (kein Workaround) |
| **P2** | Minor / kosmetisch |

## Neuen Bug anlegen

1. Ordner in `bugs/open/<bug-name>/` anlegen
2. Dateien aus `bugs/open/example/` hineinkopieren und ausfüllen
3. `HOME.md` → Open Bugs Section updaten

## Bug fixen

1. Gesamten Ordner von `bugs/open/` nach `bugs/fixed/` verschieben
2. `bugs/fixed/example/02_Fix.md` ergänzen (was gefixt wurde, commit, Version)
3. `HOME.md` → Open Bugs Section updaten
4. Aktuelles `releases/` Dokument updaten
