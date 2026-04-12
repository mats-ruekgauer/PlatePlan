---
title: Defensive PostgREST Handling
category: decision
last_updated: 2026-04-12
related: [[architecture/backend]], [[architecture/data-layer]], [[entities/household]], [[entities/recipe]]
---

# Defensive PostgREST Handling

## Kontext

Mehrere FastAPI-Endpunkte scheiterten an impliziten Annahmen über PostgREST/Supabase:

- `maybe_single().execute()` wurde wie eine Response mit `.data` behandelt, liefert in `postgrest 2.28.3` bei 0 Rows aber `None`
- AI-generierte Recipe-Felder wurden direkt in Integer-Spalten geschrieben, obwohl DeepSeek Werte wie `"450.0"` oder `"70.0"` liefern kann
- `household_members` wurde im Backend per `profiles(display_name)` gejoint, obwohl in der Live-DB kein nutzbarer FK/Schema-Cache-Eintrag für diese Relation vorhanden war

## Entscheidung

FastAPI behandelt PostgREST-Antworten jetzt defensiv statt sich auf fragile Relation- und Typ-Annahmen zu verlassen:

1. `maybe_single()`-Reads werden zuerst normalisiert (`maybe_single_data`) und erst danach ausgewertet
2. AI-Rezeptzahlen für `caloriesPerServing`, Makros, `servings` und `cookTimeMinutes` werden vor dem DB-Write auf Ganzzahlen coerced
3. Household-Mitglieder laden Profile nicht mehr via PostgREST-Relation, sondern über einen separaten `profiles`-Read nach `user_id`

## Konsequenzen

- 500er durch `NoneType` auf `.data` verschwinden bei leeren `maybe_single()`-Treffern
- AI-Zahlformate wie `450.0` werden vor dem Insert an das DB-Schema angepasst
- `/api/households/{id}/members` hängt nicht mehr vom PostgREST-Schema-Cache ab
- Backend-Fehlerbilder werden kontrollierter: Schema-/Typfehler werden früher im Backend erkannt statt erst als rohe Postgres-Exceptions aufzuschlagen
