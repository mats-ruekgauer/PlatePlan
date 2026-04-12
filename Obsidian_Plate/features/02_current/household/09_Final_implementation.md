## Final behavior
Nutzer kann Household erstellen und andere via Einladungslink einladen. Alle Mitglieder sehen denselben Wochenplan.

## Backend implementation
- `POST /api/households` — Household + Invite-Token erstellen
- `POST /api/households/mine` — Households des aktuellen Users laden
- `POST /api/households/join` — via Token beitreten
- `POST /api/households/{id}/members` — Mitglieder laden
- `POST /api/households/{id}/invite` — Token rotieren
- `POST /api/households/{id}/update` — Household-Settings updaten
- `POST /api/households/{id}/leave` — Household verlassen

## Frontend implementation
- `app/household/setup.tsx` — Household Setup
- `app/household/[id].tsx` — Household Management
- `app/invite/[token].tsx` — Einladungslink-Landingpage
- `hooks/useHousehold.ts` — Household-Reads/-Mutationen via FastAPI + React-Query-Invalidierung
- Setup-Screen respektiert den Einstiegskontext (`onboarding` vs `profile`) beim Zurücknavigieren

## Database / state changes
- `households`, `household_members` (owner/member), `household_invites` (Token + Expiry)
- Persistierter `activeHouseholdId` wird beim Laden gegen echte Mitgliedschaften validiert und bei Bedarf auf den ersten vorhandenen Haushalt gesetzt

## Notes for future maintenance
- Präferenz-Merging passiert im Backend bei Plan-Generierung (alle Member-Präferenzen)
- Household-Reads laufen aktuell bewusst über FastAPI/Service-Role, weil der direkte Client-Read trotz vorhandener Daten zu leeren UI-States führen konnte
