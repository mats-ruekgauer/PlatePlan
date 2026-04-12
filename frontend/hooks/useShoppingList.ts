import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { mapShoppingList, supabase } from '../lib/supabase';
// supabase is used for reads only (shopping lists)
import { callAPI } from '../lib/api';
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
      callAPI<{ listId: string; grouped: GroupedShoppingList[]; allItems: ShoppingItem[] }>(
        '/api/shopping/generate',
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
    mutationFn: ({
      listId,
      planId,
      itemName,
      unit,
    }: {
      listId: string;
      planId: string;
      itemName: string;
      unit: string;
    }) =>
      callAPI<{ items: ShoppingItem[] }>('/api/shopping/toggle-item', {
        listId,
        planId,
        itemName,
        unit,
      }),
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
    mutationFn: ({ listId }: { listId: string; planId: string }) =>
      callAPI<{ exportedAt: string }>('/api/shopping/mark-exported', { listId }),
    onSuccess: (_data, { planId }) => {
      queryClient.invalidateQueries({ queryKey: shoppingKeys.byPlan(planId) });
    },
  });
}
