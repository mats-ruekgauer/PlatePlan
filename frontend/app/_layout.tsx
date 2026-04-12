import '../global.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { router, Stack, useSegments } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import {
  getMealIdFromNotificationResponse,
  registerNotificationCategories,
} from '../lib/notifications';
import { LanguageProvider } from '../lib/i18n';
import { supabase } from '../lib/supabase';
import { selectOnboardingIsComplete, useOnboardingStore } from '../stores/onboardingStore';

// ─── Dev auto-login ───────────────────────────────────────────────────────────

const DEV_AUTO_LOGIN = process.env.EXPO_PUBLIC_DEV_AUTO_LOGIN === 'true';
const DEV_EMAIL = process.env.EXPO_PUBLIC_DEV_EMAIL ?? '';
const DEV_PASSWORD = process.env.EXPO_PUBLIC_DEV_PASSWORD ?? '';

async function devAutoLogin(): Promise<boolean> {
  if (!DEV_AUTO_LOGIN || !DEV_EMAIL || !DEV_PASSWORD) return false;
  const { error } = await supabase.auth.signInWithPassword({
    email: DEV_EMAIL,
    password: DEV_PASSWORD,
  });
  if (error) {
    console.warn('[DEV] Auto-login failed:', error.message);
    return false;
  }
  // Mark onboarding complete so we skip straight to the app
  useOnboardingStore.getState().markOnboardingComplete();
  console.log('[DEV] Auto-login successful →', DEV_EMAIL);
  return true;
}

// ─── React Query client ───────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5,
      placeholderData: (prev: unknown) => prev,
    },
    mutations: {
      retry: 0,
    },
  },
});

// ─── Auth + onboarding guard ──────────────────────────────────────────────────

/** Returns true if the session JWT is expired (or about to expire within 30s). */
function isSessionExpired(expiresAt: number | undefined): boolean {
  if (!expiresAt) return false;
  return expiresAt * 1000 <= Date.now() + 30_000;
}

/** Tries to refresh the session. Signs out and returns false if it fails. */
async function tryRefresh(): Promise<boolean> {
  const { error } = await supabase.auth.refreshSession();
  if (error) {
    await supabase.auth.signOut();
    return false;
  }
  return true;
}

function AuthGuard() {
  const segments = useSegments();
  const [session, setSession] = useState<boolean | null>(null); // null = loading
  const onboardingComplete = useOnboardingStore(selectOnboardingIsComplete);

  useEffect(() => {
    // ── App-Start: JWT auslesen + exp prüfen ──────────────────────────────
    (async () => {
      const { data } = await supabase.auth.getSession();
      const s = data.session;

      if (!s) {
        // Keine Session → Dev-Auto-Login versuchen, sonst Login-Screen
        if (DEV_AUTO_LOGIN) {
          const ok = await devAutoLogin();
          setSession(ok);
        } else {
          setSession(false);
        }
        return;
      }

      if (isSessionExpired(s.expires_at)) {
        // Token abgelaufen → Refresh versuchen
        const ok = await tryRefresh();
        if (!ok && DEV_AUTO_LOGIN) {
          // Refresh fehlgeschlagen, aber Dev-Mode → neu einloggen
          const loginOk = await devAutoLogin();
          setSession(loginOk);
          return;
        }
        setSession(ok);
        return;
      }

      setSession(true);
    })();

    // ── Lauscht auf Auth-Änderungen (Refresh, Sign-Out, etc.) ────────────
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(!!s);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === null) return; // still loading

    const inAuth = segments[0] === '(auth)';
    const inOnboarding = segments[0] === '(onboarding)';

    if (!session) {
      if (!inAuth) router.replace('/(auth)/welcome');
    } else if (!onboardingComplete) {
      if (!inOnboarding) router.replace('/(onboarding)/step-batch');
    } else {
      if (inAuth || inOnboarding) router.replace('/(tabs)');
    }
  }, [session, segments, onboardingComplete]);

  return null;
}

// ─── Root layout ──────────────────────────────────────────────────────────────

export default function RootLayout() {
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    registerNotificationCategories();

    notificationListener.current = Notifications.addNotificationReceivedListener(
      (_notification) => {},
    );

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const mealId = getMealIdFromNotificationResponse(response);
        if (mealId) {
          router.push(`/meal/${mealId}`);
        }
      },
    );

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  useEffect(() => {
    async function handleAppStateChange(nextState: AppStateStatus) {
      if (nextState === 'active') {
        supabase.auth.startAutoRefresh();

        // App kommt in den Vordergrund → Session nochmal prüfen
        // (Token könnte im Hintergrund abgelaufen sein)
        const { data } = await supabase.auth.getSession();
        const s = data.session;
        if (s && isSessionExpired(s.expires_at)) {
          await tryRefresh();
          // tryRefresh() signOut()s bei Fehler → onAuthStateChange feuert
        }
      } else {
        supabase.auth.stopAutoRefresh();
      }
    }

    handleAppStateChange(AppState.currentState);

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      supabase.auth.stopAutoRefresh();
      sub.remove();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="meal/[id]"
            options={{ presentation: 'card', animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="recipe/[id]"
            options={{ presentation: 'card', animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="household/[id]"
            options={{ presentation: 'card', animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="household/setup"
            options={{ presentation: 'card', animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="household/invite"
            options={{ presentation: 'card', animation: 'slide_from_right' }}
          />
          <Stack.Screen name="invite/[token]" options={{ presentation: 'modal' }} />
        </Stack>
        <AuthGuard />
      </LanguageProvider>
    </QueryClientProvider>
  );
}
