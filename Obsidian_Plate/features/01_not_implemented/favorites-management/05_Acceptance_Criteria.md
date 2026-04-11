
- [ ] Herz-Icon auf Recipe Detail Screen vorhanden
- [ ] Favorit-Status wird persistiert (Supabase `user_favorites`)
- [ ] Favoriten-Sektion in Recipes Tab sichtbar
- [ ] Favoriten erscheinen häufiger in generierten Plans (Prompt-Anpassung)
- [ ] Favorit entfernen funktioniert
- [ ] Leerer State bei 0 Favoriten hat CTA

## Notes
`user_favorites` Tabelle existiert bereits in DB — keine Migration nötig.
Backend-Anpassung: Favoriten-Liste in `/api/plan/generate` Prompt einbauen.
