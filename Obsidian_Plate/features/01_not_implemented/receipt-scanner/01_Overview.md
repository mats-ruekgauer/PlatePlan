## Feature name
Receipt Scanner (Kostentracking)

## Purpose
Nutzer können Kassenzettel scannen um tatsächliche Einkaufskosten zu tracken.

## Problem
Nutzer wissen nicht was ihr Wochenplan tatsächlich kostet. `receipt_items` Tabelle existiert bereits aber wird nicht genutzt.

## Goal
Nutzer fotografiert Kassenzettel → App extrahiert Artikel und Preise → Kosten werden dem Wochenplan zugeordnet.

## Business / product value
Kostenbewusstsein + Budgetplanung. Differenzierungsmerkmal gegenüber Konkurrenz.

## Scope
- Receipt Scan Screen: Kamera-Integration
- OCR via `process-receipt` Supabase Edge Function (Anthropic Vision — bereits vorhanden!)
- Artikel-Liste reviewen + korrigieren
- Kosten-Übersicht pro Woche

## Out of scope
Preisvergleich, Supermarkt-Integration, Budget-Alerts
