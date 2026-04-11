import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getCurrentUserId, mapUserFavorite, supabase } from '../lib/supabase';
import type { UserFavorite } from '../types';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const favoriteKeys = {
  all: ['favorites'] as const,
  list: () => [...favoriteKeys.all, 'list'] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** Fetches all favorites for the current user, hydrated with recipe data. */
export function useFavorites() {
  return useQuery({
    queryKey: favoriteKeys.list(),
    queryFn: async () => {
      const userId = await getCurrentUserId();
      const { data, error } = await supabase
        .from('user_favorites')
        .select('*, recipes(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data ?? []).map((row: any) => mapUserFavorite(row)) as UserFavorite[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

/** Returns whether a given recipeId is favorited by the current user. */
export function useIsFavorite(recipeId: string | null | undefined) {
  const { data: favorites = [] } = useFavorites();
  return favorites.some((f) => f.recipeId === recipeId);
}

/** Toggles a recipe in/out of favorites. */
export function useToggleFavorite() {
  const queryClient = useQueryClient();
  const { data: favorites = [] } = useFavorites();

  return useMutation({
    mutationFn: async (recipeId: string) => {
      const userId = await getCurrentUserId();
      const existing = favorites.find((f) => f.recipeId === recipeId);

      if (existing) {
        const { error } = await supabase
          .from('user_favorites')
          .delete()
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_favorites')
          .insert({ user_id: userId, recipe_id: recipeId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: favoriteKeys.all });
    },
  });
}

/** Adds a custom (non-recipe) favorite by name. */
export function useAddCustomFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ customName, notes }: { customName: string; notes?: string }) => {
      const userId = await getCurrentUserId();
      const { error } = await supabase.from('user_favorites').insert({
        user_id: userId,
        custom_name: customName,
        notes: notes ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: favoriteKeys.all });
    },
  });
}

/** Removes a favorite by its ID. */
export function useRemoveFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (favoriteId: string) => {
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('id', favoriteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: favoriteKeys.all });
    },
  });
}
