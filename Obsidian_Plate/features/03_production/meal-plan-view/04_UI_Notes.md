## Screens / pages affected
- Home Tab
- Meal Detail Screen

## New UI elements
- Tagesgruppen mit Meal-Slot-Cards
- Wochen-Navigator (vor/zurück)
- Status-Badge (geplant/gekocht/übersprungen)
- Meal Detail: Rezept, Nährwerte, Portionen

## Placement
Haupt-Tab (Home)

## User interactions
- Tap auf Meal → Detail
- Long-Press oder Button → Status ändern
- Woche navigieren

## Loading states
- Skeleton-Cards beim ersten Laden

## Success states
- Status-Badge updated sofort (optimistisch)

## Error states
- Revert bei fehlgeschlagenem Status-Update + Toast

## Design constraints
- Meal-Cards klar nach Tagen gruppiert

## Reuse existing components
- Recipe-Card Komponente
