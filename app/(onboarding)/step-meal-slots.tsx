import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { OnboardingProgress } from '../../components/onboarding/OnboardingProgress';
import { Button } from '../../components/ui/Button';
import { ALL_MEAL_SLOTS, useOnboardingStore } from '../../stores/onboardingStore';
import type { MealSlot } from '../../types';

const SLOT_META: Record<MealSlot, { label: string; emoji: string; description: string }> = {
  breakfast: { label: 'Breakfast', emoji: '🌅', description: 'Morning meal' },
  lunch: { label: 'Lunch', emoji: '☀️', description: 'Midday meal' },
  dinner: { label: 'Dinner', emoji: '🌙', description: 'Evening meal' },
  snack: { label: 'Snack', emoji: '🍎', description: 'Between meals' },
};

export default function StepMealSlots() {
  const store = useOnboardingStore();

  const canContinue = store.managedMealSlots.length > 0;

  return (
    <ScrollView
      className="flex-1 bg-[#F8F9FA]"
      contentContainerClassName="px-5 pt-14 pb-8 gap-6"
    >
      <OnboardingProgress currentStep={3} totalSteps={7} />

      <View className="gap-1">
        <Text className="text-3xl font-bold text-[#1A1A2E]">Which meals to plan?</Text>
        <Text className="text-base text-[#6B7280]">
          We'll generate recipes for toggled-on meals. For others, tell us roughly how many calories you consume so we can hit your daily target.
        </Text>
      </View>

      <View className="gap-3">
        {ALL_MEAL_SLOTS.map((slot) => {
          const meta = SLOT_META[slot];
          const isManaged = store.managedMealSlots.includes(slot);

          return (
            <View
              key={slot}
              className="bg-white rounded-2xl overflow-hidden"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.06,
                shadowRadius: 4,
              }}
            >
              <Pressable
                onPress={() => store.toggleManagedMealSlot(slot)}
                className={[
                  'flex-row items-center px-4 py-4 gap-3',
                  isManaged ? 'bg-[#D8F3DC]' : '',
                ].join(' ')}
              >
                <Text className="text-2xl">{meta.emoji}</Text>
                <View className="flex-1">
                  <Text
                    className={`text-base font-semibold ${
                      isManaged ? 'text-[#2D6A4F]' : 'text-[#1A1A2E]'
                    }`}
                  >
                    {meta.label}
                  </Text>
                  <Text className="text-xs text-[#6B7280]">{meta.description}</Text>
                </View>
                {/* Toggle indicator */}
                <View
                  className={[
                    'w-12 h-6 rounded-full justify-center px-0.5',
                    isManaged ? 'bg-[#2D6A4F]' : 'bg-gray-300',
                  ].join(' ')}
                >
                  <View
                    className={[
                      'w-5 h-5 rounded-full bg-white',
                      isManaged ? 'ml-auto' : '',
                    ].join(' ')}
                    style={{
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.15,
                      shadowRadius: 2,
                    }}
                  />
                </View>
              </Pressable>

              {/* Unmanaged calorie input — shown when slot is NOT managed */}
              {!isManaged && (
                <View className="px-4 pb-4 pt-2 gap-1">
                  <Text className="text-xs text-[#6B7280]">
                    How many calories do you typically consume at {meta.label.toLowerCase()}?
                  </Text>
                  <View className="flex-row items-center gap-2">
                    <TextInput
                      className="flex-1 rounded-xl border border-gray-200 bg-[#F8F9FA] px-3 py-2 text-[#1A1A2E]"
                      keyboardType="number-pad"
                      placeholder="e.g. 400"
                      value={
                        store.unmanagedSlotCalories[slot]?.toString() ?? ''
                      }
                      onChangeText={(text) => {
                        const num = parseInt(text, 10);
                        if (!isNaN(num)) store.setUnmanagedSlotCalories(slot, num);
                      }}
                    />
                    <Text className="text-sm text-[#6B7280]">kcal</Text>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {!canContinue && (
        <Text className="text-sm text-center text-red-500">
          Please select at least one meal to plan.
        </Text>
      )}

      <Button
        label="Continue"
        disabled={!canContinue}
        onPress={() => router.push('/(onboarding)/step-batch')}
      />
    </ScrollView>
  );
}
