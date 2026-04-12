# Issue: Household Invite Flow Redesign

## Zusammenfassung
Der aktuelle Invite-Flow ist zu generisch. Nach Household-Erstellung soll der User direkt in eine dedizierte Invite-View gelangen. Der Join-Prozess soll auf Kurz-Code-Eingabe vereinfacht werden. Links und Codes sollen zeitlich ablaufen.

---

## Gewünschtes Verhalten

### 1 — Nach Household-Erstellung: direkt zur Invite-View
Statt nach Household-Erstellung auf einen allgemeinen Screen zu leiten, soll der User **sofort** auf einen Invite-Screen navigieren, der zeigt:
- QR-Code des Invite-Links (zum Scannen)
- Darunter: der 6–8-stellige Kurz-Code (zum Abtippen)

### 2 — Share-Button: vorgefertigte Nachricht
Der Share-Button schickt eine vorbereitete Nachricht mit:
- Dem vollständigen Invite-Link (zum Antippen/Öffnen)
- Dem Kurz-Code (als Fallback zum Abtippen)

Beispiel:
> "Tritt meinem PlatePlan-Haushalt bei!
> Link: https://plateplan.app/invite/abc123
> Code: PP-4729"

### 3 — Join-Eingabe: nur Kurz-Code
Der "Beitreten"-Button öffnet ein Eingabefeld für den **Kurz-Code** (z.B. `PP-4729`).
Der vollständige Invite-Link ist zum Anklicken gedacht — nicht zum Abtippen.
→ Kein URL-Eingabefeld mehr im Join-Flow.

### 4 — Ablauf nach wenigen Stunden
Invite-Links und -Codes sollen nach **6 Stunden** ablaufen.
Nach Ablauf muss der Owner einen neuen Code generieren.
Das bestehende `/api/households/{id}/invite` (Link rotieren) bleibt der Mechanismus dafür.

---

## Aktueller Zustand
- Nach Household-Erstellung: Navigation zu einem generischen Household-Screen
- Share teilt einen rohen Link ohne vorbereiteten Text
- Join-Flow: unklar, ob Kurz-Code-Eingabe existiert
- Ablaufzeit: aktuell unklar / nicht durchgesetzt

---

## Offene Fragen
- Wie lang soll der Kurz-Code sein? (Vorschlag: 6 Stellen, z.B. `PP-4729`)
- Soll der QR-Code nativ generiert werden (expo-qr-code o.ä.) oder ein externer Service?
- Wird der Kurz-Code serverseitig gehasht gespeichert oder klartext?
- Soll bei abgelaufenem Link eine sprechende Fehlermeldung kommen?
