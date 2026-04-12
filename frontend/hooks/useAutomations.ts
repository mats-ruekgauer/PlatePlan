import * as SMS from 'expo-sms';
import { Linking } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getCurrentUserId, mapAutomation, supabase } from '../lib/supabase';
// supabase is used for reads only (automations, shopping list items for execution)
import { callAPI } from '../lib/api';
import type { Automation, AutomationConfig, AutomationType, ShoppingItem } from '../types';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const automationKeys = {
  all: ['automations'] as const,
  list: () => [...automationKeys.all, 'list'] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** Fetches all automations configured by the current user. */
export function useAutomations() {
  return useQuery({
    queryKey: automationKeys.list(),
    queryFn: async () => {
      const userId = await getCurrentUserId();
      const { data, error } = await supabase
        .from('automations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data ?? []).map(mapAutomation) as Automation[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

/** Creates or updates an automation (upserts by user_id + type). */
export function useUpsertAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      type,
      enabled,
      config,
    }: {
      type: AutomationType;
      enabled: boolean;
      config: AutomationConfig;
    }) =>
      callAPI<{ success: boolean; action: string }>('/api/automations/upsert', {
        type,
        enabled,
        config,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationKeys.all });
    },
  });
}

/** Deletes an automation by ID. */
export function useDeleteAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (automationId: string) =>
      callAPI<{ success: boolean }>('/api/automations/delete', { automationId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationKeys.all });
    },
  });
}

// ─── Execution helpers ────────────────────────────────────────────────────────

function formatShoppingList(items: ShoppingItem[]): string {
  const unchecked = items.filter((i) => !i.checked);
  const lines = unchecked.map((i) => `• ${i.amount} ${i.unit} ${i.name}`);
  return `Shopping list:\n${lines.join('\n')}`;
}

async function runRemindersExport(items: ShoppingItem[]) {
  const text = encodeURIComponent(formatShoppingList(items));
  const url = `x-apple-reminderkit://reminders/new?title=${encodeURIComponent('Shopping List')}&notes=${text}`;
  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) {
    await Linking.openURL(url);
  }
}

async function runSmsShare(items: ShoppingItem[], contactNumber: string) {
  const isAvailable = await SMS.isAvailableAsync();
  if (!isAvailable) return;
  const body = formatShoppingList(items);
  await SMS.sendSMSAsync([contactNumber], body);
}

/**
 * Runs all enabled automations for the current user.
 * Call this after every successful plan generation.
 */
export function useRunAutomations() {
  const { data: automations = [] } = useAutomations();

  return useMutation({
    mutationFn: async ({ planId }: { planId: string }) => {
      const enabled = automations.filter((a) => a.enabled);
      if (enabled.length === 0) return;

      // Load the shopping list for this plan (plan_id nullable column requires any-cast)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: listRow } = await (supabase as any)
        .from('shopping_lists')
        .select('items')
        .eq('plan_id', planId)
        .maybeSingle();

      if (!listRow?.items) return;
      const items = listRow.items as ShoppingItem[];

      for (const automation of enabled) {
        if (automation.type === 'reminders_export') {
          await runRemindersExport(items);
        } else if (automation.type === 'sms_share') {
          const cfg = automation.config as { contactNumber?: string };
          if (cfg.contactNumber) {
            await runSmsShare(items, cfg.contactNumber);
          }
        }
      }
    },
  });
}
