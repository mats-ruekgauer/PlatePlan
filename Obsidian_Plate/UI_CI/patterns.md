# UI Patterns

Standards für wiederkehrende UI-Zustände. Immer diese Patterns verwenden — kein Erfinden von Eigenem.

---

## Loading States

| Kontext | Pattern |
|---------|---------|
| Listen, Cards | Skeleton (gleiche Dimensionen wie Inhalt) |
| Full-Screen-Wait (z.B. Plan generieren) | Spinner zentriert + kurzer Text |
| Button-Action | Button disabled + Spinner im Button |

- Skeleton-Farbe: `surfaceSecondary` → `border` (animiert)
- Spinner-Farbe: `primary`

---

## Error States

| Kontext | Pattern |
|---------|---------|
| API-Fehler in Screen | Fehlermeldung + "Erneut versuchen" Button |
| Inline-Fehler (Form) | Rote Textnachricht unter dem Feld |
| Toast/Snackbar | Kurze Nachricht, auto-dismiss nach 3s |

- Fehlerfarbe: `danger` (`#DC2626`)
- Immer eine Aktion anbieten (Retry, Dismiss oder Navigation)

---

## Empty States

| Kontext | Pattern |
|---------|---------|
| Leere Liste | Icon + beschreibender Text + primärer CTA-Button |
| Noch keine Daten | Erklärungstext + Onboarding-Aktion |

- Icon: passend zum Kontext, `textMuted` Farbe
- CTA: `primary` Button

---

## Success States

- Toast/Snackbar mit `success` (`#16A34A`)
- Kein Modal für einfache Bestätigungen
- Bei wichtigen Aktionen (z.B. Plan generiert): kurze In-Screen-Meldung

---

## Modals / Bottom Sheets

- Leichter Backdrop (halbtransparent schwarz)
- `radius.xl` (24px) oben links + rechts
- Shadow `lg`
- Schließen via Swipe-down oder X-Button oben rechts
