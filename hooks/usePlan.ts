import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  invokeFunction,
  mapMealPlan,
  mapPlannedMeal,
  mapRecipe,
  supabase,
} from '../lib/supabase';
import type {
  HydratedMeal,
  HydratedPlan,
  MealPlan,
  MealStatus,
  PlannedMeal,
  PlanGenerationResult,
  Recipe,
} from '../types';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const planKeys = {
  all: ['plans'] as const,
  active: () => [...planKeys.all, 'active'] as const,
  byId: (id: string) => [...planKeys.all, id] as const,
  byWeek: (weekStart: string) => [...planKeys.all, 'week', weekStart] as const,
  hydratedActive: () => [...planKeys.all, 'hydrated', 'active'] as const,
  hydratedByWeek: (weekStart: string) => [...planKeys.all, 'hydrated', weekStart] as const,
};

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchActivePlan(): Promise<MealPlan | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  const { data, error } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('status', 'active')
    .order('week_start', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ? mapMealPlan(data) : null;
}

async function fetchPlanByWeek(weekStart: string): Promise<MealPlan | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  const { data, error } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('week_start', weekStart)
    .maybeSingle();

  if (error) throw error;
  return data ? mapMealPlan(data) : null;
}

async function fetchHydratedPlan(planId: string): Promise<HydratedPlan | null> {
  // Load planned meals with both recipe and alternative recipe in one query
  const { data: rows, error } = await supabase
    .from('planned_meals')
    .select(`
      *,
      recipe:recipes!planned_meals_recipe_id_fkey (*),
      alternativeRecipe:recipes!planned_meals_alternative_recipe_id_fkey (*),
      chosenRecipe:recipes!planned_meals_chosen_recipe_id_fkey (*)
    `)
    .eq('plan_id', planId)
    .order('day_of_week', { ascending: true });

  if (error) throw error;
  if (!rows || rows.length === 0) return null;

  // Fetch the plan metadata separately
  const { data: planRow, error: planError } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('id', planId)
    .single();
  if (planError) throw planError;

  const plan = mapMealPlan(planRow);

  // Group meals by day
  const dayMap = new Map<number, HydratedMeal[]>();

  for (const row of rows) {
    const pm = mapPlannedMeal(row);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = row as any;

    const resolvedRecipe: Recipe =
      pm.chosenRecipeId && r.chosenRecipe
        ? mapRecipe(r.chosenRecipe)
        : mapRecipe(r.recipe);

    const altRecipe: Recipe | null = r.alternativeRecipe
      ? mapRecipe(r.alternativeRecipe)
      : null;

    const hydratedMeal: HydratedMeal = {
      ...pm,
      recipe: resolvedRecipe,
      alternativeRecipe: altRecipe,
    };

    const existing = dayMap.get(pm.dayOfWeek) ?? [];
    existing.push(hydratedMeal);
    dayMap.set(pm.dayOfWeek, existing);
  }

  const days = Array.from(dayMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([dayOfWeek, meals]) => ({ dayOfWeek, meals }));

  return { ...plan, days };
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** Fetches the user's current active meal plan (metadata only). */
export function useActivePlan() {
  return useQuery({
    queryKey: planKeys.active(),
    queryFn: fetchActivePlan,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Fetches the active plan fully hydrated with recipes.
 * Waits for `useActivePlan` to resolve before fetching meals.
 */
export function useHydratedActivePlan() {
  const { data: plan } = useActivePlan();

  return useQuery({
    queryKey: planKeys.hydratedActive(),
    queryFn: () => fetchHydratedPlan(plan!.id),
    enabled: !!plan?.id,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Fetches the plan for a specific week, fully hydrated.
 * Returns null if no plan exists for that week.
 */
export function usePlanForWeek(weekStart: string) {
  const planQuery = useQuery({
    queryKey: planKeys.byWeek(weekStart),
    queryFn: () => fetchPlanByWeek(weekStart),
    staleTime: 1000 * 60 * 5,
  });

  return useQuery({
    queryKey: planKeys.hydratedByWeek(weekStart),
    queryFn: () => fetchHydratedPlan(planQuery.data!.id),
    enabled: !!planQuery.data?.id,
    staleTime: 1000 * 60 * 5,
  });
}

/** Fetches a specific planned meal with its resolved recipe. */
export function usePlannedMeal(plannedMealId: string) {
  return useQuery({
    queryKey: [...planKeys.all, 'meal', plannedMealId],
    queryFn: async () => {
      const { data: row, error } = await supabase
        .from('planned_meals')
        .select(`
          *,
          recipe:recipes!planned_meals_recipe_id_fkey (*),
          alternativeRecipe:recipes!planned_meals_alternative_recipe_id_fkey (*),
          chosenRecipe:recipes!planned_meals_chosen_recipe_id_fkey (*)
        `)
        .eq('id', plannedMealId)
        .single();
      if (error) throw error;

      const pm = mapPlannedMeal(row);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = row as any;

      const resolvedRecipe: Recipe =
        pm.chosenRecipeId && r.chosenRecipe
          ? mapRecipe(r.chosenRecipe)
          : mapRecipe(r.recipe);

      return {
        ...pm,
        recipe: resolvedRecipe,
        alternativeRecipe: r.alternativeRecipe ? mapRecipe(r.alternativeRecipe) : null,
      } satisfies HydratedMeal;
    },
    enabled: !!plannedMealId,
    staleTime: 1000 * 60 * 5,
  });
}

/** Generates a new weekly plan via Edge Function. */
export function useGeneratePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (weekStart: string) =>
      invokeFunction<{ weekStart: string }, PlanGenerationResult>('generate-plan', {
        weekStart,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.all });
    },
  });
}

/** Swaps the chosen recipe for a planned meal slot. */
export function useSwapMeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      plannedMealId,
      chosenRecipeId,
    }: {
      plannedMealId: string;
      chosenRecipeId: string;
    }) => {
      const { error } = await supabase
        .from('planned_meals')
        .update({ chosen_recipe_id: chosenRecipeId })
        .eq('id', plannedMealId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.all });
    },
  });
}

/** Regenerates a single meal slot via the regenerate-meal Edge Function. */
export function useRegenerateMeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (plannedMealId: string) =>
      invokeFunction<{ plannedMealId: string }, void>('regenerate-meal', { plannedMealId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.all });
    },
  });
}

/** Updates the status of a planned meal with optimistic update. */
export function useUpdateMealStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      plannedMealId,
      status,
    }: {
      plannedMealId: string;
      status: MealStatus;
    }) => {
      const { error } = await supabase
        .from('planned_meals')
        .update({ status })
        .eq('id', plannedMealId);
      if (error) throw error;
    },
    onMutate: async ({ plannedMealId, status }) => {
      await queryClient.cancelQueries({ queryKey: planKeys.all });
      queryClient.setQueriesData<HydratedPlan>(
        { queryKey: planKeys.all },
        (old) => {
          if (!old || !old.days) return old;
          return {
            ...old,
            days: old.days.map((day) => ({
              ...day,
              meals: day.meals.map((m) =>
                m.id === plannedMealId ? { ...m, status } : m,
              ),
            })),
          };
        },
      );
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.all });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.all });
    },
  });
}
