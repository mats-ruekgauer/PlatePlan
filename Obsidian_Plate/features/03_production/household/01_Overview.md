## Feature name
Household Management

## Purpose
Mehrere Nutzer können einen gemeinsamen Haushalt mit geteiltem Meal Plan bilden.

## Problem
Familien und WGs planen gemeinsam — alle Mitglieder brauchen Zugang zum gleichen Plan.

## Goal
Household-Owner kann Mitglieder einladen, alle sehen denselben Wochenplan und ihre Präferenzen fließen in die AI ein.

## Business / product value
Wachstum durch Einladungen. Mehrspieler-Use-Case erhöht Retention.

## Scope
- `POST /api/households` — Household erstellen
- `POST /api/households/join` — via Invite-Token beitreten
- `POST /api/households/{id}/invite` — Link rotieren
- Household Screen: Mitglieder anzeigen, Einladungslink teilen
- Präferenz-Merging: Bei Plan-Generierung werden alle Mitglieder-Präferenzen berücksichtigt
- Invite-Screens: `/invite/[token]`, `/household/setup`

## Out of scope
Rollen-Management über Owner/Member hinaus, Household verlassen
