import { Share } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { invokeFunction, mapHousehold, mapHouseholdMember, supabase } from '../lib/supabase';
import { useHouseholdStore } from '../stores/householdStore';
import type { Household, HouseholdMember } from '../types';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const householdKeys = {
  all: ['households'] as const,
  mine: () => [...householdKeys.all, 'mine'] as const,
  members: (id: string) => [...householdKeys.all, id, 'members'] as const,
};

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchMyHouseholds(): Promise<Household[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];

  // Get household_ids the user belongs to
  const { data: rawMemberships, error: mErr } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', session.user.id);

  if (mErr || !rawMemberships?.length) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const memberships = rawMemberships as any[] as Array<{ household_id: string }>;
  const ids = memberships.map((m) => m.household_id);

  const { data, error } = await supabase
    .from('households')
    .select('*')
    .in('id', ids)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapHousehold);
}

async function fetchHouseholdMembers(householdId: string): Promise<HouseholdMember[]> {
  const { data, error } = await supabase
    .from('household_members')
    .select('*, profiles(display_name)')
    .eq('household_id', householdId);

  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => mapHouseholdMember(row));
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** All households the current user belongs to. */
export function useMyHouseholds() {
  return useQuery({
    queryKey: householdKeys.mine(),
    queryFn: fetchMyHouseholds,
    staleTime: 1000 * 60 * 5,
  });
}

/** Members of a specific household. */
export function useHouseholdMembers(householdId: string | undefined) {
  return useQuery({
    queryKey: householdKeys.members(householdId ?? ''),
    queryFn: () => fetchHouseholdMembers(householdId!),
    enabled: !!householdId,
    staleTime: 1000 * 60 * 5,
  });
}

/** Creates a new household via Edge Function and sets it as active. */
export function useCreateHousehold() {
  const queryClient = useQueryClient();
  const setActiveHouseholdId = useHouseholdStore((s) => s.setActiveHouseholdId);

  return useMutation({
    mutationFn: (params: {
      name: string;
      managedMealSlots: string[];
      shoppingDays: number[];
      batchCookDays: number;
    }) =>
      invokeFunction<typeof params, { householdId: string }>('create-household', params),
    onSuccess: (data) => {
      setActiveHouseholdId(data.householdId);
      queryClient.invalidateQueries({ queryKey: householdKeys.mine() });
    },
  });
}

/** Joins a household via invite token and sets it as active. */
export function useJoinHousehold() {
  const queryClient = useQueryClient();
  const setActiveHouseholdId = useHouseholdStore((s) => s.setActiveHouseholdId);
  const setPendingInviteToken = useHouseholdStore((s) => s.setPendingInviteToken);

  return useMutation({
    mutationFn: (token: string) =>
      invokeFunction<{ token: string }, { householdId: string; householdName: string }>(
        'join-household',
        { token },
      ),
    onSuccess: (data) => {
      setActiveHouseholdId(data.householdId);
      setPendingInviteToken(null);
      queryClient.invalidateQueries({ queryKey: householdKeys.mine() });
    },
  });
}

/** Generates a share link for a household and opens the native share sheet. */
export function useShareInvite() {
  return useMutation({
    mutationFn: async (householdId: string) => {
      const result = await invokeFunction<{ householdId: string }, { token: string }>(
        'create-invite',
        { householdId },
      );
      const link = `plateplan://invite/${result.token}`;
      await Share.share({
        message: `Join my household on PlatePlan! ${link}`,
        url: link,
      });
    },
  });
}

/** Updates household name and/or planning settings. */
export function useUpdateHousehold() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      householdId,
      updates,
    }: {
      householdId: string;
      updates: {
        name?: string;
        managedMealSlots?: string[];
        shoppingDays?: number[];
        batchCookDays?: number;
      };
    }) => {
      const payload: Record<string, unknown> = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.managedMealSlots !== undefined) payload.managed_meal_slots = updates.managedMealSlots;
      if (updates.shoppingDays !== undefined) payload.shopping_days = updates.shoppingDays;
      if (updates.batchCookDays !== undefined) payload.batch_cook_days = updates.batchCookDays;
      payload.updated_at = new Date().toISOString();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('households')
        .update(payload)
        .eq('id', householdId);
      if (error) throw error;
    },
    onSuccess: (_data, { householdId }) => {
      queryClient.invalidateQueries({ queryKey: householdKeys.mine() });
      queryClient.invalidateQueries({ queryKey: householdKeys.members(householdId) });
    },
  });
}

/** Removes the current user from a household. */
export function useLeaveHousehold() {
  const queryClient = useQueryClient();
  const activeHouseholdId = useHouseholdStore((s) => s.activeHouseholdId);
  const setActiveHouseholdId = useHouseholdStore((s) => s.setActiveHouseholdId);

  return useMutation({
    mutationFn: async (householdId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('household_members')
        .delete()
        .eq('household_id', householdId)
        .eq('user_id', session.user.id);
      if (error) throw error;
    },
    onSuccess: (_data, householdId) => {
      if (activeHouseholdId === householdId) {
        setActiveHouseholdId(null);
      }
      queryClient.invalidateQueries({ queryKey: householdKeys.mine() });
    },
  });
}
