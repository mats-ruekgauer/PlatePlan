## Feature name
Authentication

## Purpose
Nutzer können sich registrieren, einloggen und abmelden.

## Problem
App braucht sichere Nutzeridentifikation für personalisierte Daten und Household-Zuordnung.

## Goal
Nutzer können sich mit E-Mail/Passwort registrieren und einloggen.

## Business / product value
Basis für alle personalisierten Features. Ohne Auth kein Meal Plan, kein Household.

## Scope
- Welcome Screen
- Sign-In Screen (E-Mail + Passwort)
- Sign-Up Screen (E-Mail + Passwort)
- Supabase Auth Integration
- Session-Persistenz
- Auth-Guard in Root `_layout.tsx`

## Out of scope
Social Login (Google, Apple), Passwort-Reset-Flow (basic Supabase Reset vorhanden)
