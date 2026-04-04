import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { mapProfile, mapUserPreferences, supabase } from '../lib/supabase';
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
  return mapProfile(data);
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
    mutationFn: async (displayName: string) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({ display_name: displayName })
        .eq('id', session.user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.profile() });
    },
  });
}

/** Partially updates user preferences. Accepts any subset of UserPreferences fields. */
export function useUpdatePreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<{
      calorieTarget: number | null;
      proteinTargetG: number | null;
      weightKg: number | null;
      heightCm: number | null;
      age: number | null;
      dietaryRestrictions: string[];
      dislikedIngredients: string[];
      likedCuisines: string[];
      managedMealSlots: string[];
      unmanagedSlotCalories: Record<string, number>;
      batchCookDays: number;
      prefersSeasonalIngredients: boolean;
      maxCookTimeMinutes: number;
      shoppingDays: number[];
      pantryStaples: string[];
    }>) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Map camelCase → snake_case for the DB
      const dbUpdates: Record<string, unknown> = {};
      if (updates.calorieTarget !== undefined) dbUpdates.calorie_target = updates.calorieTarget;
      if (updates.proteinTargetG !== undefined) dbUpdates.protein_target_g = updates.proteinTargetG;
      if (updates.weightKg !== undefined) dbUpdates.weight_kg = updates.weightKg;
      if (updates.heightCm !== undefined) dbUpdates.height_cm = updates.heightCm;
      if (updates.age !== undefined) dbUpdates.age = updates.age;
      if (updates.dietaryRestrictions !== undefined) dbUpdates.dietary_restrictions = updates.dietaryRestrictions;
      if (updates.dislikedIngredients !== undefined) dbUpdates.disliked_ingredients = updates.dislikedIngredients;
      if (updates.likedCuisines !== undefined) dbUpdates.liked_cuisines = updates.likedCuisines;
      if (updates.managedMealSlots !== undefined) dbUpdates.managed_meal_slots = updates.managedMealSlots;
      if (updates.unmanagedSlotCalories !== undefined) dbUpdates.unmanaged_slot_calories = updates.unmanagedSlotCalories;
      if (updates.batchCookDays !== undefined) dbUpdates.batch_cook_days = updates.batchCookDays;
      if (updates.prefersSeasonalIngredients !== undefined) dbUpdates.prefers_seasonal = updates.prefersSeasonalIngredients;
      if (updates.maxCookTimeMinutes !== undefined) dbUpdates.max_cook_time_minutes = updates.maxCookTimeMinutes;
      if (updates.shoppingDays !== undefined) dbUpdates.shopping_days = updates.shoppingDays;
      if (updates.pantryStaples !== undefined) dbUpdates.pantry_staples = updates.pantryStaples;

      const { error } = await supabase
        .from('user_preferences')
        .update(dbUpdates)
        .eq('user_id', session.user.id);
      if (error) throw error;
    },
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
