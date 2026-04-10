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

function AuthGuard() {
  const segments = useSegments();
  const [session, setSession] = useState<boolean | null>(null); // null = loading
  const onboardingComplete = useOnboardingStore(selectOnboardingIsComplete);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(!!data.session);
    });
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
    function handleAppStateChange(nextState: AppStateStatus) {
      if (nextState === 'active') {
        supabase.auth.startAutoRefresh();
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
        </Stack>
        <AuthGuard />
      </LanguageProvider>
    </QueryClientProvider>
  );
}
