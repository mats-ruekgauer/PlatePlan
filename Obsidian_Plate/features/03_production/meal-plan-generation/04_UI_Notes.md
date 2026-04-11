## Screens / pages affected
- Home Tab (`app/(tabs)/index.tsx`)

## New UI elements
- "Plan generieren" Button
- Loading-State während Generierung (Spinner + Text)
- Erfolgs-State: Plan erscheint

## Placement
Prominenter CTA im Home Tab wenn kein Plan vorhanden

## User interactions
- Button Tap → Generierung starten
- "Ersetzen" auf einzelnem Meal → Regenerierung

## Loading states
- Full-Screen Spinner mit Text "Dein Plan wird erstellt..."

## Success states
- Plan erscheint direkt, kein Modal

## Error states
- Toast/Snackbar mit Fehlermeldung + Retry

## Design constraints
- Loading darf nicht zu lang wirken (evtl. Fortschritts-Hint)

## Reuse existing components
- Spinner-Komponente aus UI
