import { router } from 'expo-router';
import React from 'react';
import {
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { usePreferences, useProfile } from '../../hooks/useProfile';
import { useGeneratePlan } from '../../hooks/usePlan';
import { signOut } from '../../lib/supabase';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getThisMonday(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split('T')[0];
}

export default function ProfileScreen() {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: prefs, isLoading: prefsLoading } = usePreferences();
  const generatePlan = useGeneratePlan();

  const isLoading = profileLoading || prefsLoading;

  function handleRegeneratePlan() {
    Alert.alert(
      'Regenerate plan',
      "This will replace all of this week's meals. Continue?",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          style: 'destructive',
          onPress: () =>
            generatePlan.mutate(getThisMonday(), {
              onSuccess: () => router.replace('/(tabs)'),
            }),
        },
      ],
    );
  }

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/welcome');
        },
      },
    ]);
  }

  return (
    <ScrollView
      className="flex-1 bg-[#F8F9FA]"
      contentContainerClassName="px-4 pt-14 pb-10 gap-5"
    >
      <Text className="text-2xl font-bold text-[#1A1A2E]">Profile</Text>

      {/* Display name */}
      {isLoading ? (
        <Skeleton height={20} width="40%" />
      ) : (
        <Text className="text-base text-[#6B7280]">
          {profile?.displayName ?? 'Your account'}
        </Text>
      )}

      {/* Summary cards */}
      <SectionHeader title="Nutrition targets" />
      {isLoading ? (
        <Skeleton height={80} borderRadius={16} />
      ) : (
        <Card className="gap-3">
          <SummaryRow
            label="Daily calories"
            value={prefs?.calorieTarget ? `${prefs.calorieTarget} kcal` : 'Not set'}
          />
          <SummaryRow
            label="Daily protein"
            value={prefs?.proteinTargetG ? `${prefs.proteinTargetG} g` : 'Not set'}
          />
          <EditLink label="Edit goals" onPress={() => router.push('/(onboarding)/step-goals')} />
        </Card>
      )}

      <SectionHeader title="Meal planning" />
      {isLoading ? (
        <Skeleton height={120} borderRadius={16} />
      ) : (
        <Card className="gap-3">
          <SummaryRow
            label="Managed meals"
            value={
              prefs?.managedMealSlots?.length
                ? prefs.managedMealSlots.join(', ')
                : 'None'
            }
          />
          <SummaryRow
            label="Batch cooking"
            value={
              prefs?.batchCookDays === 1
                ? 'Cook fresh daily'
                : `Cook for ${prefs?.batchCookDays ?? 1} days`
            }
          />
          <SummaryRow
            label="Max cook time"
            value={
              prefs?.maxCookTimeMinutes
                ? `${prefs.maxCookTimeMinutes} min`
                : 'Not set'
            }
          />
          <EditLink
            label="Edit meal slots"
            onPress={() => router.push('/(onboarding)/step-meal-slots')}
          />
        </Card>
      )}

      <SectionHeader title="Food preferences" />
      {isLoading ? (
        <Skeleton height={100} borderRadius={16} />
      ) : (
        <Card className="gap-3">
          <View>
            <Text className="text-xs text-[#6B7280] mb-1.5">Dietary restrictions</Text>
            <View className="flex-row flex-wrap gap-1.5">
              {prefs?.dietaryRestrictions?.length ? (
                prefs.dietaryRestrictions.map((r) => (
                  <Badge key={r} label={r.replace(/_/g, ' ')} variant="default" />
                ))
              ) : (
                <Text className="text-sm text-[#9CA3AF]">None</Text>
              )}
            </View>
          </View>
          <View>
            <Text className="text-xs text-[#6B7280] mb-1.5">Liked cuisines</Text>
            <View className="flex-row flex-wrap gap-1.5">
              {prefs?.likedCuisines?.length ? (
                prefs.likedCuisines.map((c) => (
                  <Badge key={c} label={c} variant="info" />
                ))
              ) : (
                <Text className="text-sm text-[#9CA3AF]">None selected</Text>
              )}
            </View>
          </View>
          <EditLink
            label="Edit preferences"
            onPress={() => router.push('/(onboarding)/step-preferences')}
          />
        </Card>
      )}

      <SectionHeader title="Shopping" />
      {isLoading ? (
        <Skeleton height={60} borderRadius={16} />
      ) : (
        <Card className="gap-3">
          <SummaryRow
            label="Shopping days"
            value={
              prefs?.shoppingDays?.length
                ? prefs.shoppingDays
                    .slice()
                    .sort()
                    .map((d) => DAY_NAMES[d])
                    .join(', ')
                : 'Not set'
            }
          />
          <EditLink
            label="Edit shopping days"
            onPress={() => router.push('/(onboarding)/step-shopping-days')}
          />
        </Card>
      )}

      {/* Actions */}
      <SectionHeader title="Actions" />
      <Card className="gap-2">
        <TouchableOpacity
          onPress={handleRegeneratePlan}
          disabled={generatePlan.isPending}
          className="flex-row items-center justify-between py-2 active:opacity-70"
        >
          <Text className="text-sm font-semibold text-[#2D6A4F]">
            {generatePlan.isPending ? 'Regenerating…' : 'Regenerate this week\'s plan'}
          </Text>
          <Text className="text-[#9CA3AF]">›</Text>
        </TouchableOpacity>
        <View className="h-px bg-gray-100" />
        <TouchableOpacity
          onPress={handleSignOut}
          className="flex-row items-center justify-between py-2 active:opacity-70"
        >
          <Text className="text-sm font-semibold text-[#DC2626]">Sign out</Text>
          <Text className="text-[#9CA3AF]">›</Text>
        </TouchableOpacity>
      </Card>
    </ScrollView>
  );
}

// ─── Small helper components ──────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <Text className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-widest mt-1">
      {title}
    </Text>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-sm text-[#6B7280]">{label}</Text>
      <Text className="text-sm font-semibold text-[#1A1A2E] flex-shrink text-right ml-4" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function EditLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} className="self-start active:opacity-70">
      <Text className="text-xs font-semibold text-[#2D6A4F]">{label} →</Text>
    </TouchableOpacity>
  );
}
