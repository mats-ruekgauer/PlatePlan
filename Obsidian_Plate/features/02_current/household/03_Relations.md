## Prerequisites
- [[auth]] — alle Mitglieder müssen eingeloggt sein
- [[onboarding]] — Präferenzen müssen für Merging vorhanden sein

## Builds on this feature
- [[meal-plan-generation]] — Household-Merging der Präferenzen

## Related UI / pages / components
- `app/household/setup.tsx`
- `app/household/[id].tsx`
- `app/invite/[token].tsx`

## Shared data / logic
- `households`, `household_members`, `household_invites` Tabellen

## Impact if changed
- Änderungen am Household-Modell betreffen Plan-Generierung (Präferenz-Merging)
