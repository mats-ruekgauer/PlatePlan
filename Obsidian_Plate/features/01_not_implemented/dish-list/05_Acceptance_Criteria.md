
- [ ] Dish List Screen vorhanden (zugänglich vom Meal Plan oder Tab)
- [ ] Gerichte per Freitext hinzufügen
- [ ] Gerichte aus bestehenden Rezepten wählen
- [ ] Dish List in Plan-Generierung als Constraint eingebaut
- [ ] Gericht nach Einplanung als "done" markieren oder entfernen
- [ ] Leerer State mit CTA

## Notes
Kein neues DB-Schema nötig — kann als JSONB-Feld in `user_preferences` oder eigene Tabelle.
Backend: Dish List in `/api/plan/generate` Prompt als "Pflicht-Gerichte diese Woche" einbauen.
