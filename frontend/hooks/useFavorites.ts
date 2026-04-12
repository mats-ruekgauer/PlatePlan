import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getCurrentUserId, mapUserFavorite, supabase } from '../lib/supabase';
import { callAPI } from '../lib/api';
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

  return useMutation({
    mutationFn: (recipeId: string) =>
      callAPI<{ action: 'added' | 'removed' }>('/api/favorites/toggle', { recipeId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: favoriteKeys.all });
    },
  });
}

/** Adds a custom (non-recipe) favorite by name. */
export function useAddCustomFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ customName, notes }: { customName: string; notes?: string }) =>
      callAPI<{ success: boolean }>('/api/favorites/add-custom', { customName, notes: notes ?? null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: favoriteKeys.all });
    },
  });
}

/** Removes a favorite by its ID. */
export function useRemoveFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (favoriteId: string) =>
      callAPI<{ success: boolean }>('/api/favorites/remove', { favoriteId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: favoriteKeys.all });
    },
  });
}
