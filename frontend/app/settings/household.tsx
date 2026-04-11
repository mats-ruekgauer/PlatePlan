import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '../../components/ui/Button';
import { useUpdateHousehold, useMyHouseholds } from '../../hooks/useHousehold';
import { useHouseholdStore } from '../../stores/householdStore';
import type { MealSlot } from '../../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_MEAL_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];

const SLOT_META: Record<MealSlot, { label: string; emoji: string }> = {
  breakfast: { label: 'Breakfast', emoji: '🌅' },
  lunch:     { label: 'Lunch',     emoji: '☀️' },
  dinner:    { label: 'Dinner',    emoji: '🌙' },
  snack:     { label: 'Snack',     emoji: '🍎' },
};

const BATCH_OPTIONS: { days: 1 | 2 | 3; label: string; description: string; emoji: string }[] = [
  { days: 1, label: 'Cook fresh daily',  description: 'New recipe every day — maximum variety.',            emoji: '🍳' },
  { days: 2, label: 'Cook for 2 days',   description: 'Each recipe makes 2 portions — cook every other day.', emoji: '📦' },
  { days: 3, label: 'Cook for 3 days',   description: 'Each recipe makes 3 portions — less time in the kitchen.', emoji: '🏗️' },
];

const DAYS: { label: string; short: string; value: number }[] = [
  { label: 'Monday',    short: 'Mon', value: 1 },
  { label: 'Tuesday',   short: 'Tue', value: 2 },
  { label: 'Wednesday', short: 'Wed', value: 3 },
  { label: 'Thursday',  short: 'Thu', value: 4 },
  { label: 'Friday',    short: 'Fri', value: 5 },
  { label: 'Saturday',  short: 'Sat', value: 6 },
  { label: 'Sunday',    short: 'Sun', value: 0 },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HouseholdSettings() {
  const activeHouseholdId = useHouseholdStore((s) => s.activeHouseholdId);
  const { data: households = [] } = useMyHouseholds();
  const updateHousehold = useUpdateHousehold();

  const activeHousehold = households.find((h) => h.id === activeHouseholdId);

  const [managedMealSlots, setManagedMealSlots] = useState<MealSlot[]>([]);
  const [batchCookDays, setBatchCookDays] = useState<1 | 2 | 3>(1);
  const [shoppingDays, setShoppingDays] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  // Populate local state from active household on mount
  useEffect(() => {
    if (!activeHousehold) return;
    setManagedMealSlots((activeHousehold.managedMealSlots ?? []) as MealSlot[]);
    setBatchCookDays((activeHousehold.batchCookDays ?? 1) as 1 | 2 | 3);
    setShoppingDays(activeHousehold.shoppingDays ?? []);
  }, [activeHousehold?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleSlot(slot: MealSlot) {
    setManagedMealSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot],
    );
  }

  function toggleDay(value: number) {
    setShoppingDays((prev) =>
      prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value],
    );
  }

  async function handleSave() {
    if (!activeHouseholdId) return;
    if (managedMealSlots.length === 0) {
      Alert.alert('Required', 'Please select at least one meal slot to plan.');
      return;
    }
    if (shoppingDays.length === 0) {
      Alert.alert('Required', 'Please select at least one shopping day.');
      return;
    }
    setSaving(true);
    try {
      await updateHousehold.mutateAsync({
        householdId: activeHouseholdId,
        updates: { managedMealSlots, batchCookDays, shoppingDays },
      });
      router.back();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-[#F8F9FA]"
      contentContainerClassName="px-5 pt-14 pb-8 gap-6"
    >
      {/* Header */}
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-white border border-gray-200 items-center justify-center"
        >
          <Text className="text-lg">←</Text>
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-bold text-[#1A1A2E]">Household planning</Text>
          <Text className="text-sm text-[#6B7280]">Shared settings for your household</Text>
        </View>
      </View>

      {/* Meal slots */}
      <View className="gap-3">
        <Text className="text-base font-semibold text-[#1A1A2E]">Which meals to plan?</Text>
        <Text className="text-sm text-[#6B7280] -mt-1">
          We'll generate recipes for the selected slots.
        </Text>
        {ALL_MEAL_SLOTS.map((slot) => {
          const meta = SLOT_META[slot];
          const selected = managedMealSlots.includes(slot);
          return (
            <Pressable
              key={slot}
              onPress={() => toggleSlot(slot)}
              className={[
                'flex-row items-center gap-3 px-4 py-4 rounded-2xl',
                selected ? 'bg-[#D8F3DC]' : 'bg-white border border-gray-200',
              ].join(' ')}
            >
              <Text className="text-2xl">{meta.emoji}</Text>
              <Text
                className={`flex-1 text-base font-semibold ${selected ? 'text-[#2D6A4F]' : 'text-[#1A1A2E]'}`}
              >
                {meta.label}
              </Text>
              <View
                className={[
                  'w-12 h-6 rounded-full justify-center px-0.5',
                  selected ? 'bg-[#2D6A4F]' : 'bg-gray-300',
                ].join(' ')}
              >
                <View
                  className={['w-5 h-5 rounded-full bg-white', selected ? 'ml-auto' : ''].join(' ')}
                />
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Batch cooking */}
      <View className="gap-3">
        <Text className="text-base font-semibold text-[#1A1A2E]">Batch cooking</Text>
        <Text className="text-sm text-[#6B7280] -mt-1">
          How often do you want to cook?
        </Text>
        {BATCH_OPTIONS.map((opt) => {
          const selected = batchCookDays === opt.days;
          return (
            <Pressable
              key={opt.days}
              onPress={() => setBatchCookDays(opt.days)}
              className={[
                'flex-row items-center gap-4 p-4 rounded-2xl border-2',
                selected ? 'border-[#2D6A4F] bg-[#D8F3DC]' : 'border-transparent bg-white',
              ].join(' ')}
            >
              <Text className="text-3xl">{opt.emoji}</Text>
              <View className="flex-1">
                <Text className={`text-base font-semibold ${selected ? 'text-[#2D6A4F]' : 'text-[#1A1A2E]'}`}>
                  {opt.label}
                </Text>
                <Text className="text-sm text-[#6B7280] mt-0.5">{opt.description}</Text>
              </View>
              {selected && (
                <View className="w-6 h-6 rounded-full bg-[#2D6A4F] items-center justify-center">
                  <Text className="text-white text-xs font-bold">✓</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Shopping days */}
      <View className="gap-3">
        <Text className="text-base font-semibold text-[#1A1A2E]">Shopping days</Text>
        <Text className="text-sm text-[#6B7280] -mt-1">
          When do you usually go grocery shopping?
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {DAYS.map((day) => {
            const selected = shoppingDays.includes(day.value);
            return (
              <Pressable
                key={day.value}
                onPress={() => toggleDay(day.value)}
                className={[
                  'px-4 py-3 rounded-xl border',
                  selected ? 'bg-[#2D6A4F] border-[#2D6A4F]' : 'bg-white border-gray-200',
                ].join(' ')}
              >
                <Text className={`text-sm font-semibold ${selected ? 'text-white' : 'text-[#1A1A2E]'}`}>
                  {day.short}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {saving ? (
        <View className="h-12 items-center justify-center">
          <ActivityIndicator color="#2D6A4F" />
        </View>
      ) : (
        <Button label="Save" onPress={handleSave} />
      )}
    </ScrollView>
  );
}
