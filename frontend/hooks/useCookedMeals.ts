import { useQuery } from '@tanstack/react-query';

import {
  getCurrentUserId,
  mapRecipe,
  supabase,
  type Database,
} from '../lib/supabase';
import type { MealSlot, MealStatus, Recipe } from '../types';

export interface CookedMealEntry {
  plannedMealId: string;
  recipe: Recipe;
  weekStart: string;
  weekLabel: string;
  createdAt: string;
  mealSlot: MealSlot;
  status: MealStatus;
}

export const recipeKeys = {
  all: ['recipes'] as const,
  manual: () => [...recipeKeys.all, 'manual'] as const,
  cooked: () => [...recipeKeys.all, 'cooked'] as const,
};

export function toWeekLabel(weekStart: string): string {
  const date = new Date(`${weekStart}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return weekStart;
  }

  const utcDate = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const isoDay = (utcDate.getUTCDay() + 6) % 7;
  utcDate.setUTCDate(utcDate.getUTCDate() - isoDay + 3);

  const isoYear = utcDate.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
  const firstIsoDay = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstIsoDay + 3);

  const weekNumber =
    1 + Math.round((utcDate.getTime() - firstThursday.getTime()) / 604800000);

  return `KW ${weekNumber} · ${isoYear}`;
}

export function useCookedMeals() {
  return useQuery({
    queryKey: recipeKeys.cooked(),
    queryFn: async (): Promise<CookedMealEntry[]> => {
      const userId = await getCurrentUserId();

      // meal_plans has no user_id — look up via household membership
      const { data: memberships, error: memberErr } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', userId);

      if (memberErr) throw memberErr;
      const householdIds = (memberships ?? []).map((m) => m.household_id);
      if (!householdIds.length) return [];

      const { data: plans, error: plansError } = await supabase
        .from('meal_plans')
        .select('id, week_start')
        .in('household_id', householdIds);

      if (plansError) throw plansError;
      const planRows =
        (plans ?? []) as Array<
          Pick<Database['public']['Tables']['meal_plans']['Row'], 'id' | 'week_start'>
        >;
      if (!planRows.length) return [];

      const weekStartByPlanId = new Map<string, string>();
      for (const plan of planRows) {
        weekStartByPlanId.set(plan.id, plan.week_start);
      }

      const { data: rows, error } = await supabase
        .from('planned_meals')
        .select(`
          *,
          recipe:recipes!planned_meals_recipe_id_fkey (*),
          chosenRecipe:recipes!planned_meals_chosen_recipe_id_fkey (*)
        `)
        .in(
          'plan_id',
          planRows.map((plan) => plan.id),
        )
        .in('status', ['cooked', 'prepared'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (rows ?? []).flatMap((row: any) => {
        const recipeRow = row.chosen_recipe_id ? row.chosenRecipe ?? row.recipe : row.recipe;
        const weekStart = weekStartByPlanId.get(row.plan_id);

        if (!recipeRow || !weekStart) {
          return [];
        }

        return [
          {
            plannedMealId: row.id,
            recipe: mapRecipe(recipeRow),
            weekStart,
            weekLabel: toWeekLabel(weekStart),
            createdAt: row.created_at,
            mealSlot: row.meal_slot as MealSlot,
            status: row.status as MealStatus,
          },
        ];
      });
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useManualRecipes() {
  return useQuery({
    queryKey: recipeKeys.manual(),
    queryFn: async (): Promise<Recipe[]> => {
      const userId = await getCurrentUserId();
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('user_id', userId)
        .eq('source', 'manual')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []).map(mapRecipe);
    },
    staleTime: 1000 * 60 * 5,
  });
}
