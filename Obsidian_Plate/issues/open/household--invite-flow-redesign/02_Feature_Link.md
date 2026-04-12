# Feature Link

Dieses Issue gehört zu:

→ [[features/02_current/household/01_Overview]]

## Betroffene Scopes im Feature

| Scope | Änderung |
|-------|----------|
| `POST /api/households/{id}/invite` | Ablaufzeit auf 6h setzen; Kurz-Code zurückgeben |
| `POST /api/households/join` | Kurz-Code-Lookup zusätzlich zu Token-Lookup |
| `/household/setup` | Nach Erstellung direkt → Invite-View mit QR + Code |
| Household Screen | Share-Button: vorgefertigte Nachricht mit Link + Code |
| Join-Screen | Eingabe auf Kurz-Code vereinfachen (kein URL-Feld) |
| `household_invites` Tabelle | `short_code`-Spalte ergänzen, `expires_at` auf 6h |
