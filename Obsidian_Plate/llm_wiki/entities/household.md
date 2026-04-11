---
title: Household
category: entity
last_updated: 2026-04-12
related: [[architecture/backend]], [[conventions/auth]]
---

# Household

## Konzept

Mehrere User können einem Household angehören und einen gemeinsamen Meal-Plan teilen.

## Invite-Flow

1. Household-Owner ruft `POST /api/households` auf → erstellt Household + ersten Invite-Token
2. Invite-Link wird geteilt
3. Neuer User ruft `POST /api/households/join` mit Token auf → tritt Household bei
4. Token kann via `POST /api/households/{id}/invite` rotiert werden (alten Link ungültig machen)

## API-Endpunkte

| Endpunkt | Zweck |
|----------|-------|
| `POST /api/households` | Household erstellen + Invite-Token generieren |
| `POST /api/households/join` | Household via Token beitreten |
| `POST /api/households/{id}/invite` | Invite-Link rotieren |
