## Feature name
Automations & Reminders

## Purpose
Push-Benachrichtigungen und Erinnerungen für Mahlzeiten, Einkaufen und Meal Prep.

## Problem
Nutzer vergessen zu kochen oder einzukaufen. `automations` Tabelle in DB vorhanden aber keine Implementierung.

## Goal
Nutzer bekommt zur konfigurierten Zeit eine Erinnerung (z.B. "Heute ist dein Einkaufstag" oder "Abendessen in 1h").

## Business / product value
Erhöht tägliche App-Nutzung und Retention durch Habit-Building.

## Scope
- Push Notification Permission (bereits angefragt in Onboarding)
- Reminder konfigurieren: Einkaufstag, Mahlzeitenzeiten
- `automations` Tabelle nutzen
- Backend oder Supabase Cron für Notification-Dispatch

## Out of scope
SMS-Sharing (war geplant aber deprioritiert), In-App Benachrichtigungen
