## Screens / pages affected
- Shopping Tab (+ Scanner-Button)
- Receipt Scanner Screen (neu)
- Artikel-Review Screen (neu)
- Kosten-Summary (neu oder im Shopping Tab)

## New UI elements
- Kamera-View für Foto
- Artikel-Liste mit Preisen (editierbar)
- Kosten-Total pro Woche
- "Scanner öffnen" Button in Shopping Tab

## Placement
Innerhalb des Shopping Tab als optionales Feature

## User interactions
- Foto machen
- Artikel überprüfen + korrigieren
- Bestätigen

## Loading states
- Spinner während OCR-Processing

## Success states
- Artikel-Liste erscheint nach OCR

## Error states
- Schlechtes Foto: Fehlermeldung + Retry-Button

## Design constraints
- Kamera-Permissions müssen angefragt werden

## Reuse existing components
- Kamera-Integration (Expo Camera)
