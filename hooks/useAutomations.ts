import * as SMS from 'expo-sms';
import { Linking } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getCurrentUserId, mapAutomation, supabase } from '../lib/supabase';
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
    mutationFn: async ({
      type,
      enabled,
      config,
    }: {
      type: AutomationType;
      enabled: boolean;
      config: AutomationConfig;
    }) => {
      const userId = await getCurrentUserId();

      // Check if one already exists for this type
      const { data: existing } = await supabase
        .from('automations')
        .select('id')
        .eq('user_id', userId)
        .eq('type', type)
        .maybeSingle();

      if (existing?.id) {
        const { error } = await supabase
          .from('automations')
          .update({ enabled, config: config as Record<string, unknown> })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('automations').insert({
          user_id: userId,
          type,
          enabled,
          config: config as Record<string, unknown>,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationKeys.all });
    },
  });
}

/** Deletes an automation by ID. */
export function useDeleteAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (automationId: string) => {
      const { error } = await supabase
        .from('automations')
        .delete()
        .eq('id', automationId);
      if (error) throw error;
    },
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

      // Load the shopping list for this plan
      const { data: listRow } = await supabase
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
