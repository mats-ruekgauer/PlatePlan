import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  invokeFunction,
  mapMealPlan,
  mapPlannedMeal,
  mapRecipe,
  supabase,
} from '../lib/supabase';
import { useHouseholdStore } from '../stores/householdStore';
import type {
  HydratedMeal,
  HydratedPlan,
  MealPlan,
  MealStatus,
  PlanGenerationResult,
  Recipe,
} from '../types';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const planKeys = {
  all: ['plans'] as const,
  byHousehold: (householdId: string) => [...planKeys.all, householdId] as const,
  active: (householdId: string) => [...planKeys.all, householdId, 'active'] as const,
  byId: (id: string) => [...planKeys.all, id] as const,
  byWeek: (householdId: string, weekStart: string) => [...planKeys.all, householdId, 'week', weekStart] as const,
  hydratedActive: (householdId: string) => [...planKeys.all, householdId, 'hydrated', 'active'] as const,
  hydratedByWeek: (householdId: string, weekStart: string) => [...planKeys.all, householdId, 'hydrated', weekStart] as const,
};

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchActivePlan(householdId: string): Promise<MealPlan | null> {
  const { data, error } = await supabase
    .from('meal_plans')
    .select('*')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .eq('household_id' as any, householdId)
    .eq('status', 'active')
    .order('week_start', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ? mapMealPlan(data) : null;
}

async function fetchPlanByWeek(householdId: string, weekStart: string): Promise<MealPlan | null> {
  const { data, error } = await supabase
    .from('meal_plans')
    .select('*')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .eq('household_id' as any, householdId)
    .eq('week_start', weekStart)
    .maybeSingle();

  if (error) throw error;
  return data ? mapMealPlan(data) : null;
}

async function fetchHydratedPlan(planId: string): Promise<HydratedPlan | null> {
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

  const { data: planRow, error: planError } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('id', planId)
    .single();
  if (planError) throw planError;

  const plan = mapMealPlan(planRow);

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

/** Fetches the active household's current meal plan (metadata only). */
export function useActivePlan() {
  const householdId = useHouseholdStore((s) => s.activeHouseholdId);

  return useQuery({
    queryKey: householdId ? planKeys.active(householdId) : planKeys.all,
    queryFn: () => fetchActivePlan(householdId!),
    enabled: !!householdId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Fetches the active plan fully hydrated with recipes.
 * Waits for `useActivePlan` to resolve before fetching meals.
 */
export function useHydratedActivePlan() {
  const householdId = useHouseholdStore((s) => s.activeHouseholdId);
  const { data: plan } = useActivePlan();

  return useQuery({
    queryKey: householdId ? planKeys.hydratedActive(householdId) : planKeys.all,
    queryFn: () => fetchHydratedPlan(plan!.id),
    enabled: !!plan?.id && !!householdId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Fetches the plan for a specific week, fully hydrated.
 * Returns null if no plan exists for that week.
 */
export function usePlanForWeek(weekStart: string) {
  const householdId = useHouseholdStore((s) => s.activeHouseholdId);

  const planQuery = useQuery({
    queryKey: householdId ? planKeys.byWeek(householdId, weekStart) : planKeys.all,
    queryFn: () => fetchPlanByWeek(householdId!, weekStart),
    enabled: !!householdId,
    staleTime: 1000 * 60 * 5,
  });

  return useQuery({
    queryKey: householdId ? planKeys.hydratedByWeek(householdId, weekStart) : planKeys.all,
    queryFn: () => fetchHydratedPlan(planQuery.data!.id),
    enabled: !!planQuery.data?.id && !!householdId,
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

/** Generates a new weekly plan for the active household via Edge Function. */
export function useGeneratePlan() {
  const queryClient = useQueryClient();
  const householdId = useHouseholdStore((s) => s.activeHouseholdId);

  return useMutation({
    mutationFn: (weekStart: string) => {
      if (!householdId) throw new Error('No active household');
      return invokeFunction<{ weekStart: string; householdId: string }, PlanGenerationResult>(
        'generate-plan',
        { weekStart, householdId },
      );
    },
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
