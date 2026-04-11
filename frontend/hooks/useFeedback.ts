import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { mapMealFeedback, supabase } from '../lib/supabase';
import { callAPI } from '../lib/api';
import { planKeys } from './usePlan';
import { profileKeys } from './useProfile';
import type { MealFeedback } from '../types';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const feedbackKeys = {
  all: ['feedback'] as const,
  byMeal: (plannedMealId: string) => [...feedbackKeys.all, 'meal', plannedMealId] as const,
  recent: () => [...feedbackKeys.all, 'recent'] as const,
};

// ─── Input type ───────────────────────────────────────────────────────────────

export interface SubmitFeedbackInput {
  plannedMealId: string | null;
  recipeId: string;
  tasteRating: number | null;
  portionRating: number | null;
  wouldRepeat: boolean | null;
  notes: string | null;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** Returns existing feedback for a specific planned meal (if any). */
export function useMealFeedback(plannedMealId: string | undefined) {
  return useQuery({
    queryKey: feedbackKeys.byMeal(plannedMealId ?? ''),
    queryFn: async (): Promise<MealFeedback | null> => {
      const { data, error } = await supabase
        .from('meal_feedback')
        .select('*')
        .eq('planned_meal_id', plannedMealId!)
        .maybeSingle();
      if (error) throw error;
      return data ? mapMealFeedback(data) : null;
    },
    enabled: !!plannedMealId,
    staleTime: 1000 * 60 * 5,
  });
}

/** Returns the 10 most recent feedback entries — used to display history on the profile screen. */
export function useRecentFeedback(limit = 10) {
  return useQuery({
    queryKey: [...feedbackKeys.recent(), limit],
    queryFn: async (): Promise<MealFeedback[]> => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return [];

      const { data, error } = await supabase
        .from('meal_feedback')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []).map(mapMealFeedback);
    },
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Submits meal feedback via the process-feedback Edge Function.
 * On success, invalidates the plan cache (because wouldRepeat=false may affect
 * preference learning) and the feedback query for this meal.
 */
export function useSubmitFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SubmitFeedbackInput) =>
      callAPI<{ feedback: MealFeedback }>('/api/feedback', input),
    onSuccess: (_data, variables) => {
      // Refresh feedback for this specific meal
      if (variables.plannedMealId) {
        queryClient.invalidateQueries({
          queryKey: feedbackKeys.byMeal(variables.plannedMealId),
        });
      }
      // Refresh recent feedback list
      queryClient.invalidateQueries({ queryKey: feedbackKeys.recent() });

      // If wouldRepeat=false the Edge Function updated disliked_ingredients —
      // refresh preferences so the profile screen reflects the change.
      if (variables.wouldRepeat === false) {
        queryClient.invalidateQueries({ queryKey: profileKeys.preferences() });
        // Also invalidate plan data so future regenerations pick up the update
        queryClient.invalidateQueries({ queryKey: planKeys.all });
      }
    },
  });
}
