## Final behavior
Nutzer bewertet Mahlzeiten. Negative Bewertungen blacklisten automatisch Hauptzutaten für zukünftige Plans.

## Backend implementation
- `POST /api/feedback` — speichert Feedback + triggert Auto-Blacklist Logik

## Database / state changes
- `meal_feedback` Tabelle: Rating, Notes, Timestamp
- Auto-Blacklist: Zutaten werden zu `user_preferences.blacklisted_ingredients` hinzugefügt

## Notes for future maintenance
- Blacklist wird bei nächster Plan-Generierung in DeepSeek-Prompt eingebaut
- Feedback ist Household-Member spezifisch, nicht Household-weit
