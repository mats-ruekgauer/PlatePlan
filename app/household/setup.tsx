import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from '../../components/ui/Button';
import { invokeFunction } from '../../lib/supabase';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { useHouseholdStore } from '../../stores/householdStore';
import type { PlanGenerationResult } from '../../types';

type Mode = 'choose' | 'create' | 'join';

/** Returns the ISO date string for the most recent Monday. */
function getThisMonday(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split('T')[0];
}

export default function StepHousehold() {
  const store = useOnboardingStore();
  const setActiveHouseholdId = useHouseholdStore((s) => s.setActiveHouseholdId);

  const [mode, setMode] = useState<Mode>('choose');
  const [householdName, setHouseholdName] = useState('My Household');
  const [inviteToken, setInviteToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');

  async function handleCreate() {
    if (!householdName.trim()) {
      Alert.alert('Name required', 'Please enter a name for your household.');
      return;
    }
    setLoading(true);
    try {
      setStatusText('Creating household...');
      const result = await invokeFunction<
        { name: string; managedMealSlots: string[]; shoppingDays: number[]; batchCookDays: number },
        { householdId: string }
      >('create-household', {
        name: householdName.trim(),
        managedMealSlots: store.managedMealSlots,
        shoppingDays: store.shoppingDays,
        batchCookDays: store.batchCookDays,
      });

      setActiveHouseholdId(result.householdId);

      setStatusText('Generating your first meal plan...');
      const planResult = await invokeFunction<
        { weekStart: string; householdId: string },
        PlanGenerationResult
      >('generate-plan', {
        weekStart: getThisMonday(),
        householdId: result.householdId,
      });

      if (planResult?.planId) {
        setStatusText('Building your shopping list...');
        await invokeFunction<{ planId: string }, unknown>(
          'generate-shopping-list',
          { planId: planResult.planId },
        ).catch(() => null);
      }

      setStatusText('Done!');
      await delay(400);
      store.reset();
      router.replace('/(tabs)');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!inviteToken.trim()) {
      Alert.alert('Token required', 'Please paste your invite link or code.');
      return;
    }
    setLoading(true);
    try {
      // Support both full deep links and raw tokens
      const token = inviteToken.trim().replace(/^.*plateplan:\/\/invite\//i, '');

      setStatusText('Joining household...');
      const result = await invokeFunction<
        { token: string },
        { householdId: string; householdName: string }
      >('join-household', { token });

      setActiveHouseholdId(result.householdId);

      setStatusText('Generating your first meal plan...');
      const planResult = await invokeFunction<
        { weekStart: string; householdId: string },
        PlanGenerationResult
      >('generate-plan', {
        weekStart: getThisMonday(),
        householdId: result.householdId,
      });

      if (planResult?.planId) {
        setStatusText('Building your shopping list...');
        await invokeFunction<{ planId: string }, unknown>(
          'generate-shopping-list',
          { planId: planResult.planId },
        ).catch(() => null);
      }

      setStatusText('Done!');
      await delay(400);
      store.reset();
      router.replace('/(tabs)');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View className="flex-1 bg-[#F8F9FA] items-center justify-center gap-4 px-5">
        <ActivityIndicator size="large" color="#2D6A4F" />
        <Text className="text-base text-[#6B7280] text-center">{statusText}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-[#F8F9FA]"
      contentContainerClassName="px-5 pt-14 pb-8 gap-8"
    >
      {/* Header */}
      <View className="gap-2">
        <Text className="text-3xl font-bold text-[#1A1A2E]">Set up your household</Text>
        <Text className="text-base text-[#6B7280]">
          Meal plans are shared with your household. Create one or join an existing one.
        </Text>
      </View>

      {mode === 'choose' && (
        <View className="gap-4">
          <Button
            label="Create a new household"
            onPress={() => setMode('create')}
          />
          <Button
            label="Join with an invite link"
            variant="secondary"
            onPress={() => setMode('join')}
          />
        </View>
      )}

      {mode === 'create' && (
        <View className="gap-6">
          <View className="gap-2">
            <Text className="text-sm font-medium text-[#1A1A2E]">Household name</Text>
            <TextInput
              className="bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 text-base text-[#1A1A2E]"
              value={householdName}
              onChangeText={setHouseholdName}
              placeholder="e.g. Our Home"
              autoFocus
              maxLength={50}
            />
          </View>
          <Button label="Create & generate plan" onPress={handleCreate} />
          <Button
            label="Back"
            variant="secondary"
            onPress={() => setMode('choose')}
          />
        </View>
      )}

      {mode === 'join' && (
        <View className="gap-6">
          <View className="gap-2">
            <Text className="text-sm font-medium text-[#1A1A2E]">Invite link or code</Text>
            <TextInput
              className="bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 text-base text-[#1A1A2E]"
              value={inviteToken}
              onChangeText={setInviteToken}
              placeholder="Paste invite link here"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
          </View>
          <Button label="Join & generate plan" onPress={handleJoin} />
          <Button
            label="Back"
            variant="secondary"
            onPress={() => setMode('choose')}
          />
        </View>
      )}
    </ScrollView>
  );
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
