## Final behavior
Neuer Nutzer durchläuft einmalig 7 Schritte. State wird in AsyncStorage persistiert. Nach Abschluss wird `onboarding_completed` gesetzt.

## Frontend implementation
- `app/(onboarding)/` — 7 Step-Screens
- `stores/onboardingStore.ts` — Zustand + AsyncStorage Persistenz
- `_layout.tsx` — prüft `onboarding_completed` und routet entsprechend

## Database / state changes
- `user_preferences` Tabelle: Goals, Diäten, Meal Slots, Shopping Days, Batch Cooking, Pantry

## Notes for future maintenance
- Resume mid-flow funktioniert via AsyncStorage Persistenz
- Onboarding-Status wird in Supabase gespeichert, nicht nur lokal
