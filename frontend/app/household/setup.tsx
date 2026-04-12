import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Button } from '../../components/ui/Button';
import { householdKeys } from '../../hooks/useHousehold';
import { callAPI } from '../../lib/api';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { useHouseholdStore } from '../../stores/householdStore';

type Mode = 'choose' | 'create' | 'join';

export default function StepHousehold() {
  const store = useOnboardingStore();
  const setActiveHouseholdId = useHouseholdStore((s) => s.setActiveHouseholdId);
  const queryClient = useQueryClient();
  const { source } = useLocalSearchParams<{ source?: 'onboarding' | 'profile' }>();

  const [mode, setMode] = useState<Mode>('choose');
  const [householdName, setHouseholdName] = useState('My Household');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');

  function leaveSetup() {
    if (source === 'profile') {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/profile');
      }
      return;
    }

    router.replace('/(tabs)');
  }

  async function handleCreate() {
    if (!householdName.trim()) {
      Alert.alert('Name required', 'Please enter a name for your household.');
      return;
    }
    setLoading(true);
    try {
      setStatusText('Creating household...');
      const result = await callAPI<{ householdId: string; inviteLink: string }>(
        '/api/households',
        {
          name: householdName.trim(),
          managedMealSlots: store.managedMealSlots,
          shoppingDays: store.shoppingDays,
          batchCookDays: store.batchCookDays,
        },
      );

      setActiveHouseholdId(result.householdId);
      await queryClient.invalidateQueries({ queryKey: householdKeys.mine() });
      store.reset();
      leaveSetup();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    const raw = inviteCode.trim();
    if (!raw) {
      Alert.alert('Code required', 'Please paste your invite link or enter a code.');
      return;
    }
    setLoading(true);
    try {
      // Strip the deep-link prefix if the user pasted the full link
      const token = raw.replace(/^.*plateplan:\/\/invite\//i, '');

      setStatusText('Joining household...');
      const result = await callAPI<{ householdId: string; householdName: string }>(
        '/api/households/join',
        { token },
      );

      setActiveHouseholdId(result.householdId);
      await queryClient.invalidateQueries({ queryKey: householdKeys.mine() });
      store.reset();
      leaveSetup();
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
      {/* Back button — exits to previous screen or mode */}
      <TouchableOpacity
        onPress={() => {
          if (mode !== 'choose') {
            setMode('choose');
          } else {
            leaveSetup();
          }
        }}
        className="self-start"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text className="text-[#2D6A4F] text-base font-medium">← Back</Text>
      </TouchableOpacity>

      {mode === 'choose' && (
        <>
          <View className="gap-2">
            <Text className="text-3xl font-bold text-[#1A1A2E]">Set up your household</Text>
            <Text className="text-base text-[#6B7280]">
              Meal plans are shared with your household. Create one or join an existing one.
            </Text>
          </View>
          <View className="gap-4">
            <Button label="Create a new household" onPress={() => setMode('create')} />
            <Button
              label="Join with a code or link"
              variant="secondary"
              onPress={() => setMode('join')}
            />
          </View>
        </>
      )}

      {mode === 'create' && (
        <>
          <View className="gap-2">
            <Text className="text-3xl font-bold text-[#1A1A2E]">Create your household</Text>
            <Text className="text-base text-[#6B7280]">
              Give your household a name to get started.
            </Text>
          </View>
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
            <Button label="Create household" onPress={handleCreate} />
          </View>
        </>
      )}

      {mode === 'join' && (
        <>
          <View className="gap-2">
            <Text className="text-3xl font-bold text-[#1A1A2E]">Join a household</Text>
            <Text className="text-base text-[#6B7280]">
              Paste the invite link or enter the code you received.
            </Text>
          </View>
          <View className="gap-6">
            <View className="gap-2">
              <Text className="text-sm font-medium text-[#1A1A2E]">Invite link or code</Text>
              <TextInput
                className="bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 text-base text-[#1A1A2E]"
                value={inviteCode}
                onChangeText={setInviteCode}
                placeholder="Paste link or enter code"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />
            </View>
            <Button label="Join household" onPress={handleJoin} />
          </View>
        </>
      )}
    </ScrollView>
  );
}
