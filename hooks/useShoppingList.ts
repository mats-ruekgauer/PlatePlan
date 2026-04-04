import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { invokeFunction, mapShoppingList, supabase } from '../lib/supabase';
import type { GroupedShoppingList, ShoppingItem, ShoppingList } from '../types';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const shoppingKeys = {
  all: ['shopping'] as const,
  byPlan: (planId: string) => [...shoppingKeys.all, planId] as const,
};

// ─── Fetch helper ─────────────────────────────────────────────────────────────

async function fetchShoppingListForPlan(planId: string): Promise<ShoppingList | null> {
  const { data, error } = await supabase
    .from('shopping_lists')
    .select('*')
    .eq('plan_id', planId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ? mapShoppingList(data) : null;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** Returns the persisted shopping list for a given plan. */
export function useShoppingList(planId: string | undefined) {
  return useQuery({
    queryKey: shoppingKeys.byPlan(planId ?? ''),
    queryFn: () => fetchShoppingListForPlan(planId!),
    enabled: !!planId,
    staleTime: 1000 * 60 * 10, // 10 min — list changes only on regeneration or check-off
  });
}

/** Generates (or re-generates) the shopping list for a plan via Edge Function. */
export function useGenerateShoppingList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (planId: string) =>
      invokeFunction<{ planId: string }, { listId: string; grouped: GroupedShoppingList[]; allItems: ShoppingItem[] }>(
        'generate-shopping-list',
        { planId },
      ),
    onSuccess: (_data, planId) => {
      queryClient.invalidateQueries({ queryKey: shoppingKeys.byPlan(planId) });
    },
  });
}

/** Toggles the `checked` state of a shopping item and persists the full items array. */
export function useToggleShoppingItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      listId,
      planId,
      itemName,
      unit,
    }: {
      listId: string;
      planId: string;
      itemName: string;
      unit: string;
    }) => {
      // Read current list from cache first to avoid an extra DB round-trip
      const cached = queryClient.getQueryData<ShoppingList>(shoppingKeys.byPlan(planId));

      const currentItems: ShoppingItem[] = cached?.items ?? [];
      const updated = currentItems.map((item) =>
        item.name === itemName && item.unit === unit
          ? { ...item, checked: !item.checked }
          : item,
      );

      const { error } = await supabase
        .from('shopping_lists')
        .update({ items: updated })
        .eq('id', listId);
      if (error) throw error;

      return updated;
    },
    // Optimistic update — flip the item immediately in the cache
    onMutate: async ({ planId, itemName, unit }) => {
      await queryClient.cancelQueries({ queryKey: shoppingKeys.byPlan(planId) });
      const previous = queryClient.getQueryData<ShoppingList>(shoppingKeys.byPlan(planId));

      queryClient.setQueryData<ShoppingList>(shoppingKeys.byPlan(planId), (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((item) =>
            item.name === itemName && item.unit === unit
              ? { ...item, checked: !item.checked }
              : item,
          ),
        };
      });

      return { previous };
    },
    onError: (_err, { planId }, context) => {
      // Roll back on error
      if (context?.previous) {
        queryClient.setQueryData(shoppingKeys.byPlan(planId), context.previous);
      }
    },
    onSettled: (_data, _err, { planId }) => {
      queryClient.invalidateQueries({ queryKey: shoppingKeys.byPlan(planId) });
    },
  });
}

/** Marks the list as exported (sets exported_at timestamp). */
export function useMarkListExported() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listId, planId }: { listId: string; planId: string }) => {
      const { error } = await supabase
        .from('shopping_lists')
        .update({ exported_at: new Date().toISOString() })
        .eq('id', listId);
      if (error) throw error;
    },
    onSuccess: (_data, { planId }) => {
      queryClient.invalidateQueries({ queryKey: shoppingKeys.byPlan(planId) });
    },
  });
}
