import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { mapProfile, mapUserPreferences, supabase } from '../lib/supabase';
import { callAPI } from '../lib/api';
import type { Profile, UserPreferences } from '../types';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const profileKeys = {
  all: ['profile'] as const,
  profile: () => [...profileKeys.all, 'me'] as const,
  preferences: () => [...profileKeys.all, 'preferences'] as const,
};

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchProfile(): Promise<Profile | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (error) throw error;
  return {
    ...mapProfile(data),
    email: session.user.email ?? null,
  };
}

async function fetchPreferences(): Promise<UserPreferences | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (error) throw error;
  return data ? mapUserPreferences(data) : null;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useProfile() {
  return useQuery({
    queryKey: profileKeys.profile(),
    queryFn: fetchProfile,
    staleTime: 1000 * 60 * 15, // 15 min
  });
}

export function usePreferences() {
  return useQuery({
    queryKey: profileKeys.preferences(),
    queryFn: fetchPreferences,
    staleTime: 1000 * 60 * 15,
  });
}

/** Updates the user's display name. */
export function useUpdateDisplayName() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (displayName: string) =>
      callAPI<{ success: boolean }>('/api/profile/update-display-name', { displayName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.profile() });
    },
  });
}

/** Partially updates user preferences. Accepts any subset of UserPreferences fields. */
export function useUpdatePreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Partial<{
      calorieTarget: number | null;
      proteinTargetG: number | null;
      weightKg: number | null;
      heightCm: number | null;
      age: number | null;
      dietaryRestrictions: string[];
      dislikedIngredients: string[];
      likedCuisines: string[];
      unmanagedSlotCalories: Record<string, number>;
      maxCookTimeMinutes: number;
      pantryStaples: string[];
      preferredLanguage: 'en' | 'de';
    }>) =>
      callAPI<{ success: boolean }>('/api/profile/update-preferences', updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.preferences() });
    },
  });
}

/** Returns the current auth session — useful for auth-gated screens. */
export function useSession() {
  return useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return session;
    },
    staleTime: 1000 * 60, // 1 min
  });
}
