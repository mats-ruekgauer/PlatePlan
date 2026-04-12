## Gelöst am
2026-04-12

## Lösung
- DB: `short_code TEXT UNIQUE` zu `household_invites` hinzugefügt (Supabase MCP Migration)
- Backend: `_generate_short_code()` erzeugt `PP-XXXXXX` (6 alphanumerische Zeichen, keine verwechselbaren O/0 I/1)
- Backend: Invite-Ablauf auf **6 Stunden** geändert (vorher 7 Tage)
- Backend: `create_invite` und `create_household` geben `shortCode` zurück
- Backend: `join_household` akzeptiert jetzt `shortCode` (Klartext-Lookup) ODER `token` (Hash-Lookup)
- Frontend: Neuer Screen `app/household/invite.tsx` mit QR-Code (react-native-qrcode-svg), Kurz-Code-Anzeige, Share-Button mit formatierter Nachricht, Refresh- und Done-Button
- Frontend: Nach Household-Erstellung direkt zum Invite-Screen navigieren (statt generic Screen)
- Frontend: Join-Mode auf masked Kurz-Code-Eingabe umgestellt (`PP-` vorangestellt, User tippt nur 6 Zeichen)
- Frontend: "Invite"-Button überall navigiert zum Invite-Screen (statt nur Share-Sheet)

## Geänderte Dateien / Endpunkte
| Datei / Endpunkt | Änderung |
|---|---|
| `household_invites` (DB) | `short_code TEXT UNIQUE` hinzugefügt |
| `backend/app/routers/household.py` | `_generate_short_code()`, shortCode in create_invite/create_household, shortCode-Lookup in join |
| `backend/app/models/household.py` | `JoinHouseholdRequest.shortCode`, `CreateInviteRequest.expiryHours` |
| `frontend/app/household/invite.tsx` | Neu: QR + Kurz-Code Screen |
| `frontend/app/household/setup.tsx` | Nach Create → Invite-Screen; Join → Kurz-Code masked input |
| `frontend/app/household/[id].tsx` | Invite-Button → Invite-Screen |
| `frontend/app/(tabs)/profile.tsx` | Invite-Button → Invite-Screen |
| `frontend/hooks/useHousehold.ts` | `useShareInvite` gibt `{inviteLink, shortCode, expiresAt}` zurück |
| `frontend/app/_layout.tsx` | Route `household/invite` registriert |

## Commit / PR
(branch: main — direkt committed)

## Auswirkung auf das Feature
- Join-Flow benötigt nur noch Kurz-Code — kein URL-Eingabefeld mehr
- Invite-Screen ist dedizierter Screen (nicht nur Share-Sheet)
- Invites laufen nach 6h ab (war vorher 7 Tage)
- QR-Code ermöglicht schnelles Einladen ohne Tippen

## Folgefix (selbe Session)
Zusätzliche Änderungen nach User-Feedback:
- Backend: Neuer `POST /api/households/{id}/current-invite` Endpoint — gibt bestehenden gültigen Invite zurück, rotiert **nicht**. Nur wenn keiner existiert/abgelaufen → neuer wird erstellt.
- Backend: `_insert_new_invite()` zentralisiert Invite-Erstellung mit Collision-Retry (5 Versuche).
- Backend: `usage_limit = null` = unbegrenzte Nutzung — Mehrfachnutzung bestätigt und dokumentiert.
- Frontend: `useCurrentInvite(id)` Hook ruft `current-invite` ab (30s stale-time).
- Frontend: `invite.tsx` nutzt `useCurrentInvite` statt immer `useShareInvite` — kein Rotate mehr beim Öffnen.
- Frontend: QR-Code codiert `plateplan://invite/PP-XXXXXX` (Short-Code-URL) da Raw-Token nie gespeichert wird.
- Frontend: Echte Restzeit aus `expiresAt` berechnet (z.B. "Läuft ab in 5h 23min") statt Hardcode "6 Stunden".
- Frontend: `useJoinHousehold` akzeptiert `{ token? } | { shortCode? }`.
- Frontend: `invite/[token].tsx` erkennt `PP-XXXXXX`-Format und nutzt ShortCode-Join-Pfad.
- Frontend: Invite-Button in `[id].tsx` und `profile.tsx` navigiert direkt ohne vorherigen API-Call.

## Lessons Learned
- `react-native-qrcode-svg` erfordert `--legacy-peer-deps` bei Expo 55 wegen Testing-Library Peer-Dep-Konflikt
- Expo Router Typed Routes brauchen `as any` für neue Routen bis Dev-Server die Typen neu generiert
- `short_code` als Klartext speichern ist bei kurzlebigen Codes (6h) korrekt — kein Security-Risiko, da kein Passwort-Equivalent
- Raw-Token wird nie gespeichert (nur Hash) → QR-Code muss Short-Code-basierte URL nutzen, nicht Token-basierte Deep-Link-URL
