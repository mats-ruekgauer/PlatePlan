## Screens / pages affected
- 7 Onboarding-Step-Screens in `app/(onboarding)/`
- Welcome-Screen (Abschluss Step 7)

## New UI elements
- Progress-Bar / Step-Indicator
- Numerische Inputs (Kalorien, Protein)
- Multi-Select für Diäten und Küchen
- Toggle-Switches für Meal Slots
- Kalender-Picker für Einkaufstage
- Slider oder Auswahl für Batch-Cooking

## Placement
Eigener `(onboarding)/` Route Group, nach Auth vor Main-App

## User interactions
- Vor/Zurück Navigation zwischen Steps
- Felder ausfüllen
- Weiter-Button am Ende jedes Steps

## Loading states
- Saving-Spinner beim finalen Abschluss-Step

## Success states
- Step 7: Bestätigungs-Animation → Weiterleitung

## Error states
- Pflichtfelder: Weiter-Button disabled

## Design constraints
- Konsistentes Step-Indicator Pattern durch alle 7 Steps

## Reuse existing components
- Input-Komponenten aus Auth
