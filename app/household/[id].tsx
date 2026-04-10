// app/household/[id].tsx
// Household detail screen: shows members, invite link button, leave option.

import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { Button } from '../../components/ui/Button';
import {
  useHouseholdMembers,
  useLeaveHousehold,
  useMyHouseholds,
  useShareInvite,
} from '../../hooks/useHousehold';
import { useHouseholdStore } from '../../stores/householdStore';

export default function HouseholdDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const activeHouseholdId = useHouseholdStore((s) => s.activeHouseholdId);
  const setActiveHouseholdId = useHouseholdStore((s) => s.setActiveHouseholdId);

  const { data: households } = useMyHouseholds();
  const { data: members, isLoading: membersLoading } = useHouseholdMembers(id);
  const shareInvite = useShareInvite();
  const leaveHousehold = useLeaveHousehold();

  const household = households?.find((h) => h.id === id);
  const isActive = activeHouseholdId === id;

  function handleSetActive() {
    if (id) setActiveHouseholdId(id);
  }

  function handleShareInvite() {
    if (!id) return;
    shareInvite.mutate(id);
  }

  function handleLeave() {
    Alert.alert(
      'Leave household',
      `Are you sure you want to leave "${household?.name ?? 'this household'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;
            await leaveHousehold.mutateAsync(id);
            router.back();
          },
        },
      ],
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-[#F8F9FA]"
      contentContainerClassName="px-5 pt-14 pb-8 gap-6"
    >
      {/* Header */}
      <View className="flex-row items-center gap-3">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Text className="text-base text-[#2D6A4F]">← Back</Text>
        </TouchableOpacity>
      </View>

      <View className="gap-1">
        <Text className="text-2xl font-bold text-[#1A1A2E]">
          {household?.name ?? 'Household'}
        </Text>
        {isActive && (
          <Text className="text-sm text-[#2D6A4F] font-medium">Active household</Text>
        )}
      </View>

      {/* Set as active */}
      {!isActive && (
        <Button label="Switch to this household" onPress={handleSetActive} />
      )}

      {/* Members */}
      <View className="gap-3">
        <Text className="text-base font-semibold text-[#1A1A2E]">Members</Text>
        {membersLoading ? (
          <ActivityIndicator color="#2D6A4F" />
        ) : (
          <View className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
            {(members ?? []).map((member, idx) => (
              <View
                key={member.id}
                className={`px-4 py-3 flex-row items-center justify-between${
                  idx > 0 ? ' border-t border-[#E5E7EB]' : ''
                }`}
              >
                <Text className="text-base text-[#1A1A2E]">
                  {member.displayName ?? 'Member'}
                </Text>
                <Text className="text-sm text-[#6B7280] capitalize">{member.role}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Invite */}
      <View className="gap-2">
        <Button
          label={shareInvite.isPending ? 'Generating link…' : 'Invite someone'}
          variant="outline"
          onPress={handleShareInvite}
        />
      </View>

      {/* Leave */}
      <View className="mt-4">
        <TouchableOpacity
          onPress={handleLeave}
          disabled={leaveHousehold.isPending}
          className="py-3 items-center"
        >
          <Text className="text-base text-red-500 font-medium">
            {leaveHousehold.isPending ? 'Leaving…' : 'Leave household'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
