// Stub Supabase env vars so lib/supabase.ts can be imported in tests
// without a real .env file present.
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
