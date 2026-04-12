import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { callAPI } from '../lib/api';
import { mapHousehold, mapHouseholdMember, supabase } from '../lib/supabase';
import { useHouseholdStore } from '../stores/householdStore';
import type { Household, HouseholdMember } from '../types';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const householdKeys = {
  all: ['households'] as const,
  mine: () => [...householdKeys.all, 'mine'] as const,
  members: (id: string) => [...householdKeys.all, id, 'members'] as const,
};

// ─── Fetch helpers ────────────────────────────────────────────────────────────
// Reads go directly to Supabase (RLS + anon key) so Realtime subscriptions work.
// Writes go through FastAPI (see mutations below).

async function fetchMyHouseholds(): Promise<Household[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: memberships, error: mErr } = await (supabase as any)
    .from('household_members')
    .select('household_id')
    .eq('user_id', session.user.id);
  if (mErr) throw mErr;

  const ids = ((memberships ?? []) as { household_id: string }[]).map((m) => m.household_id);
  if (!ids.length) return [];

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
    .select('*, profiles(*)')
    .eq('household_id', householdId)
    .order('joined_at', { ascending: true });
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => mapHouseholdMember(row));
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** All households the current user belongs to. */
export function useMyHouseholds() {
  const activeHouseholdId = useHouseholdStore((s) => s.activeHouseholdId);
  const setActiveHouseholdId = useHouseholdStore((s) => s.setActiveHouseholdId);

  const query = useQuery({
    queryKey: householdKeys.mine(),
    queryFn: fetchMyHouseholds,
    staleTime: 0,
  });

  React.useEffect(() => {
    if (!query.isSuccess) return;

    const households = query.data ?? [];
    if (households.length === 0) {
      if (activeHouseholdId !== null) setActiveHouseholdId(null);
      return;
    }

    const activeStillExists = activeHouseholdId
      ? households.some((household) => household.id === activeHouseholdId)
      : false;

    if (!activeStillExists) {
      setActiveHouseholdId(households[0].id);
    }
  }, [activeHouseholdId, query.data, query.isSuccess, setActiveHouseholdId]);

  return query;
}

/** Members of a specific household. */
export function useHouseholdMembers(householdId: string | undefined) {
  return useQuery({
    queryKey: householdKeys.members(householdId ?? ''),
    queryFn: () => fetchHouseholdMembers(householdId!),
    enabled: !!householdId,
    staleTime: 0,
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
      callAPI<{ householdId: string; shortCode: string; expiresAt: string }>('/api/households', params),
    onSuccess: (data) => {
      setActiveHouseholdId(data.householdId);
      queryClient.invalidateQueries({ queryKey: householdKeys.mine() });
    },
  });
}

/** Joins a household via invite token or short code and sets it as active. */
export function useJoinHousehold() {
  const queryClient = useQueryClient();
  const setActiveHouseholdId = useHouseholdStore((s) => s.setActiveHouseholdId);
  const setPendingInviteToken = useHouseholdStore((s) => s.setPendingInviteToken);

  return useMutation({
    mutationFn: (params: { token?: string; shortCode?: string }) =>
      callAPI<{ householdId: string; householdName: string }>('/api/households/join', params),
    onSuccess: (data) => {
      setActiveHouseholdId(data.householdId);
      setPendingInviteToken(null);
      queryClient.invalidateQueries({ queryKey: householdKeys.mine() });
    },
  });
}

/** Returns the current valid invite (shortCode + expiresAt) without rotating. Creates one if none exists. */
export function useCurrentInvite(householdId: string | undefined) {
  return useQuery({
    queryKey: [...householdKeys.all, householdId, 'current-invite'] as const,
    queryFn: () =>
      callAPI<{ shortCode: string; expiresAt: string }>(
        `/api/households/${householdId}/current-invite`,
        {},
      ),
    enabled: !!householdId,
    staleTime: 30_000, // re-check every 30s so expiry stays fresh
  });
}

/** Rotates the invite (generates a fresh shortCode, invalidates old). Use for "Neuen Code generieren". */
export function useShareInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (householdId: string) =>
      callAPI<{ inviteLink: string; shortCode: string; expiresAt: string }>(
        `/api/households/${householdId}/invite`,
        {},
      ),
    onSuccess: (_data, householdId) => {
      queryClient.invalidateQueries({
        queryKey: [...householdKeys.all, householdId, 'current-invite'],
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
    }) =>
      callAPI<{ household: Household }>(`/api/households/${householdId}/update`, updates),
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
    mutationFn: async (householdId: string) =>
      callAPI<{ ok: boolean }>(`/api/households/${householdId}/leave`, {}),
    onSuccess: (_data, householdId) => {
      if (activeHouseholdId === householdId) {
        setActiveHouseholdId(null);
      }
      queryClient.invalidateQueries({ queryKey: householdKeys.mine() });
    },
  });
}
