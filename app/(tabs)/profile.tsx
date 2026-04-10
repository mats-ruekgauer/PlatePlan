import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { useMyHouseholds, useShareInvite } from '../../hooks/useHousehold';
import { usePreferences, useProfile } from '../../hooks/useProfile';
import { useGeneratePlan } from '../../hooks/usePlan';
import { useGenerateShoppingList } from '../../hooks/useShoppingList';
import { useHouseholdStore } from '../../stores/householdStore';
import { useFavorites, useAddCustomFavorite, useRemoveFavorite } from '../../hooks/useFavorites';
import { useAutomations, useUpsertAutomation } from '../../hooks/useAutomations';
import { signOut } from '../../lib/supabase';
import type { SmsShareConfig } from '../../types';

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
  const { data: favorites = [], isLoading: favLoading } = useFavorites();
  const { data: automations = [] } = useAutomations();
  const { data: households = [], isLoading: householdsLoading } = useMyHouseholds();
  const generatePlan = useGeneratePlan();
  const generateList = useGenerateShoppingList();
  const addCustomFavorite = useAddCustomFavorite();
  const removeFavorite = useRemoveFavorite();
  const upsertAutomation = useUpsertAutomation();
  const shareInvite = useShareInvite();
  const activeHouseholdId = useHouseholdStore((s) => s.activeHouseholdId);
  const setActiveHouseholdId = useHouseholdStore((s) => s.setActiveHouseholdId);

  const [addFavModalVisible, setAddFavModalVisible] = useState(false);
  const [newFavName, setNewFavName] = useState('');
  const [smsContact, setSmsContact] = useState('');
  const [smsNumber, setSmsNumber] = useState('');

  const isLoading = profileLoading || prefsLoading;

  const remindersAuto = automations.find((a) => a.type === 'reminders_export');
  const smsAuto = automations.find((a) => a.type === 'sms_share');

  // Seed SMS fields from stored config
  React.useEffect(() => {
    if (smsAuto) {
      const cfg = smsAuto.config as SmsShareConfig;
      setSmsContact(cfg.contactName ?? '');
      setSmsNumber(cfg.contactNumber ?? '');
    }
  }, [smsAuto]);

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
              onSuccess: (result) => {
                if (result?.planId) generateList.mutate(result.planId);
                router.replace('/(tabs)');
              },
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

  function handleAddFavorite() {
    const name = newFavName.trim();
    if (!name) return;
    addCustomFavorite.mutate({ customName: name });
    setNewFavName('');
    setAddFavModalVisible(false);
  }

  function toggleReminders(enabled: boolean) {
    upsertAutomation.mutate({
      type: 'reminders_export',
      enabled,
      config: { trigger: 'on_plan_generated' },
    });
  }

  function toggleSms(enabled: boolean) {
    upsertAutomation.mutate({
      type: 'sms_share',
      enabled,
      config: { trigger: 'on_plan_generated', contactName: smsContact, contactNumber: smsNumber },
    });
  }

  function saveSmsConfig() {
    upsertAutomation.mutate({
      type: 'sms_share',
      enabled: smsAuto?.enabled ?? false,
      config: { trigger: 'on_plan_generated', contactName: smsContact, contactNumber: smsNumber },
    });
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
            onPress={() => router.push('/settings/preferences')}
          />
        </Card>
      )}

      {/* Favourite Dishes */}
      <SectionHeader title="Favourite dishes" />
      {favLoading ? (
        <Skeleton height={80} borderRadius={16} />
      ) : (
        <Card className="gap-3">
          {favorites.length === 0 ? (
            <Text className="text-sm text-[#9CA3AF]">No favourites yet.</Text>
          ) : (
            <View className="gap-2">
              {favorites.map((fav) => (
                <View key={fav.id} className="flex-row items-center justify-between">
                  <Text className="text-sm text-[#1A1A2E] flex-1" numberOfLines={1}>
                    {fav.recipe?.title ?? fav.customName ?? 'Unknown'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => removeFavorite.mutate(fav.id)}
                    hitSlop={8}
                    className="ml-3"
                  >
                    <Text className="text-xs text-red-400">✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          <TouchableOpacity
            onPress={() => setAddFavModalVisible(true)}
            className="self-start active:opacity-70"
          >
            <Text className="text-xs font-semibold text-[#2D6A4F]">+ Add manually</Text>
          </TouchableOpacity>
        </Card>
      )}

      {/* Automations */}
      <SectionHeader title="Automations" />
      <Card className="gap-4">
        {/* Reminders export */}
        <View className="gap-1">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-3">
              <Text className="text-sm font-semibold text-[#1A1A2E]">
                Apple Reminders
              </Text>
              <Text className="text-xs text-[#6B7280]">
                Export shopping list when plan is generated
              </Text>
            </View>
            <Switch
              value={remindersAuto?.enabled ?? false}
              onValueChange={toggleReminders}
              trackColor={{ true: '#2D6A4F' }}
            />
          </View>
        </View>

        <View className="h-px bg-gray-100" />

        {/* SMS share */}
        <View className="gap-2">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-3">
              <Text className="text-sm font-semibold text-[#1A1A2E]">Send via SMS</Text>
              <Text className="text-xs text-[#6B7280]">
                Share shopping list when plan is generated
              </Text>
            </View>
            <Switch
              value={smsAuto?.enabled ?? false}
              onValueChange={toggleSms}
              trackColor={{ true: '#2D6A4F' }}
            />
          </View>
          {(smsAuto?.enabled) && (
            <View className="gap-2 pt-1">
              <TextInput
                className="rounded-xl border border-gray-200 bg-[#F8F9FA] px-4 py-3 text-sm text-[#1A1A2E]"
                placeholder="Contact name"
                value={smsContact}
                onChangeText={setSmsContact}
                onEndEditing={saveSmsConfig}
              />
              <TextInput
                className="rounded-xl border border-gray-200 bg-[#F8F9FA] px-4 py-3 text-sm text-[#1A1A2E]"
                placeholder="Phone number (e.g. +49123456789)"
                value={smsNumber}
                onChangeText={setSmsNumber}
                keyboardType="phone-pad"
                onEndEditing={saveSmsConfig}
              />
            </View>
          )}
        </View>
      </Card>

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

      {/* Households */}
      <SectionHeader title="Households" />
      {householdsLoading ? (
        <Skeleton height={80} borderRadius={16} />
      ) : (
        <Card className="gap-2">
          {households.map((hh, idx) => (
            <View key={hh.id}>
              {idx > 0 && <View className="h-px bg-gray-100" />}
              <TouchableOpacity
                onPress={() => router.push(`/household/${hh.id}`)}
                className="flex-row items-center justify-between py-2 active:opacity-70"
              >
                <View className="flex-row items-center gap-2 flex-1">
                  <Text className="text-sm font-semibold text-[#1A1A2E]" numberOfLines={1}>
                    {hh.name}
                  </Text>
                  {hh.id === activeHouseholdId && (
                    <Text className="text-xs text-[#2D6A4F] font-medium">Active</Text>
                  )}
                </View>
                <View className="flex-row items-center gap-3">
                  {hh.id !== activeHouseholdId && (
                    <TouchableOpacity
                      onPress={() => setActiveHouseholdId(hh.id)}
                      className="px-2 py-1 rounded-lg bg-[#D8F3DC]"
                    >
                      <Text className="text-xs text-[#2D6A4F] font-semibold">Switch</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => shareInvite.mutate(hh.id)}
                    className="px-2 py-1 rounded-lg border border-[#E5E7EB]"
                  >
                    <Text className="text-xs text-[#6B7280]">Invite</Text>
                  </TouchableOpacity>
                  <Text className="text-[#9CA3AF]">›</Text>
                </View>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            onPress={() => router.push('/household/setup')}
            className="pt-1 active:opacity-70"
          >
            <Text className="text-xs font-semibold text-[#2D6A4F]">+ New household</Text>
          </TouchableOpacity>
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
            {generatePlan.isPending ? 'Regenerating…' : "Regenerate this week's plan"}
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

      {/* Add favourite modal */}
      <Modal
        visible={addFavModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddFavModalVisible(false)}
      >
        <View className="flex-1 bg-black/40 items-center justify-center px-8">
          <View className="bg-white rounded-2xl p-6 w-full gap-4">
            <Text className="text-base font-bold text-[#1A1A2E]">Add favourite dish</Text>
            <TextInput
              className="rounded-xl border border-gray-200 px-4 py-3 text-sm text-[#1A1A2E]"
              placeholder="Dish name..."
              value={newFavName}
              onChangeText={setNewFavName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleAddFavorite}
            />
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setAddFavModalVisible(false)}
                className="flex-1 py-3 rounded-xl border border-gray-200 items-center"
              >
                <Text className="text-sm font-semibold text-[#6B7280]">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddFavorite}
                className="flex-1 py-3 rounded-xl bg-[#2D6A4F] items-center"
              >
                <Text className="text-sm font-semibold text-white">Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
