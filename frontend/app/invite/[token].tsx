// app/invite/[token].tsx
// Handles plateplan://invite/<token> deep links.
// Shows a confirmation screen before joining the household.

import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

import { Button } from '../../components/ui/Button';
import { useJoinHousehold } from '../../hooks/useHousehold';
import { callAPI } from '../../lib/api';
import type { PlanGenerationResult } from '../../types';

function getThisMonday(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split('T')[0];
}

export default function InviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const joinHousehold = useJoinHousehold();

  async function handleJoin() {
    if (!token) return;
    const result = await joinHousehold.mutateAsync(token);

    // Generate plan for this household (non-fatal if fails)
    try {
      const planResult = await callAPI<PlanGenerationResult>('/api/plan/generate', {
        weekStart: getThisMonday(),
        householdId: result.householdId,
      });
      if (planResult?.planId) {
        await callAPI('/api/shopping/generate', { planId: planResult.planId }).catch(() => null);
      }
    } catch {
      // Non-fatal: user can regenerate from the household screen
    }

    router.replace('/(tabs)');
  }

  const isLoading = joinHousehold.isPending;
  const isError = joinHousehold.isError;

  return (
    <View className="flex-1 bg-[#F8F9FA] px-5">
      {/* Back button */}
      <TouchableOpacity
        onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
        className="self-start pt-14 pb-4"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text className="text-[#2D6A4F] text-base font-medium">← Back</Text>
      </TouchableOpacity>

      <View className="flex-1 items-center justify-center gap-6">
      <Text className="text-5xl">🏠</Text>
      <Text className="text-2xl font-bold text-[#1A1A2E] text-center">
        You've been invited!
      </Text>
      <Text className="text-base text-[#6B7280] text-center">
        Join this household to share a meal plan.
      </Text>

      {isError && (
        <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 w-full">
          <Text className="text-sm text-red-600 text-center">
            {joinHousehold.error instanceof Error
              ? joinHousehold.error.message
              : 'Something went wrong. The invite may have expired.'}
          </Text>
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator size="large" color="#2D6A4F" />
      ) : (
        <View className="w-full gap-3">
          <Button label="Join household" onPress={handleJoin} />
        </View>
      )}
      </View>
    </View>
  );
}
