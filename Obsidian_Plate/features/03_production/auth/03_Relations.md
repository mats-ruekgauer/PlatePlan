## Prerequisites
Features this feature depends on:
- Keine — Auth ist das Fundament

## Builds on this feature
Features that should come later and build on this one:
- [[onboarding]]
- [[meal-plan-generation]]
- [[household]]

## Related UI / pages / components
- `app/(auth)/welcome.tsx`
- `app/(auth)/sign-in.tsx`
- `app/(auth)/sign-up.tsx`
- `app/_layout.tsx` (Auth-Guard)

## Shared data / logic
- Supabase Session wird von allen Features genutzt
- JWT wird an FastAPI Backend weitergegeben

## Impact if changed
- Alle Features die Auth voraussetzen würden brechen
