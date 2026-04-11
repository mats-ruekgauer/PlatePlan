## Feature name
Onboarding

## Purpose
Neuen Nutzern beim ersten App-Start ihre Ernährungsziele, Präferenzen und Haushalts-Setup einrichten.

## Problem
Ohne Nutzerpräferenzen kann der AI keine personalisierten Meal Plans generieren.

## Goal
Nutzer durchläuft einmalig einen 7-Schritt-Setup-Flow und hat danach vollständig konfigurierte Präferenzen.

## Business / product value
Direkt verantwortlich für die Qualität der AI-generierten Meal Plans.

## Scope
7-Schritt-Flow:
1. Goals (Kalorien-/Protein-Ziele)
2. Dietary Preferences (Einschränkungen, Küchen)
3. Meal Slots (Frühstück/Mittag/Abend/Snack Konfiguration)
4. Shopping Days (Wöchentlicher Einkaufskalender)
5. Batch Cooking (1-3 Tage Meal Prep Strategie)
6. Pantry (Grundzutaten die immer vorhanden sind)
7. Complete (Abschluss-Screen)

Zustand wird in Zustand-Store + AsyncStorage persistiert (Resume mid-flow).

## Out of scope
Re-Onboarding, Onboarding-Überspringen
