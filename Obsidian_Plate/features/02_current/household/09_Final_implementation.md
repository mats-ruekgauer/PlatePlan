## Final behavior
Nutzer kann Household erstellen und andere via Einladungslink einladen. Alle Mitglieder sehen denselben Wochenplan.

## Backend implementation
- `POST /api/households` — Household + Invite-Token erstellen
- `POST /api/households/join` — via Token beitreten
- `POST /api/households/{id}/invite` — Token rotieren

## Frontend implementation
- `app/household/setup.tsx` — Household Setup
- `app/household/[id].tsx` — Household Management
- `app/invite/[token].tsx` — Einladungslink-Landingpage

## Database / state changes
- `households`, `household_members` (owner/member), `household_invites` (Token + Expiry)

## Notes for future maintenance
- Präferenz-Merging passiert im Backend bei Plan-Generierung (alle Member-Präferenzen)
- RLS: Members können nur ihren eigenen Household sehen
