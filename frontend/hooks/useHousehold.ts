import React from 'react';
import { Share } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { callAPI } from '../lib/api';
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
  const result = await callAPI<{ households: Household[] }>('/api/households/mine', {});
  return result.households ?? [];
}

async function fetchHouseholdMembers(householdId: string): Promise<HouseholdMember[]> {
  const result = await callAPI<{ members: HouseholdMember[] }>(
    `/api/households/${householdId}/members`,
    {},
  );
  return result.members ?? [];
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
      callAPI<{ householdId: string; inviteLink: string }>('/api/households', params),
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
      callAPI<{ householdId: string; householdName: string }>('/api/households/join', { token }),
    onSuccess: (data) => {
      setActiveHouseholdId(data.householdId);
      setPendingInviteToken(null);
      queryClient.invalidateQueries({ queryKey: householdKeys.mine() });
    },
  });
}

/** Regenerates an invite link for a household (invalidates old) and opens the share sheet. */
export function useShareInvite() {
  return useMutation({
    mutationFn: async (householdId: string) => {
      const result = await callAPI<{ inviteLink: string; expiresAt: string }>(
        `/api/households/${householdId}/invite`,
        {},
      );
      await Share.share({
        message: `Join my household on PlatePlan! ${result.inviteLink}`,
        url: result.inviteLink,
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
