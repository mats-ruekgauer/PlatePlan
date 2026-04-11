import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { OnboardingProgress } from '../../components/onboarding/OnboardingProgress';
import { Button } from '../../components/ui/Button';
import { useOnboardingStore } from '../../stores/onboardingStore';

const DAYS: { label: string; short: string; value: number }[] = [
  { label: 'Monday', short: 'Mon', value: 1 },
  { label: 'Tuesday', short: 'Tue', value: 2 },
  { label: 'Wednesday', short: 'Wed', value: 3 },
  { label: 'Thursday', short: 'Thu', value: 4 },
  { label: 'Friday', short: 'Fri', value: 5 },
  { label: 'Saturday', short: 'Sat', value: 6 },
  { label: 'Sunday', short: 'Sun', value: 0 },
];

export default function StepShoppingDays() {
  const store = useOnboardingStore();
  const canContinue = store.shoppingDays.length > 0;

  return (
    <ScrollView
      className="flex-1 bg-[#F8F9FA]"
      contentContainerClassName="px-5 pt-14 pb-8 gap-6"
    >
      <OnboardingProgress currentStep={6} totalSteps={7} />

      <View className="gap-1">
        <Text className="text-3xl font-bold text-[#1A1A2E]">Shopping days</Text>
        <Text className="text-base text-[#6B7280]">
          When do you usually go grocery shopping? We'll split your shopping list to match.
        </Text>
      </View>

      {/* Day grid — 4 + 3 layout */}
      <View className="gap-3">
        <View className="flex-row gap-3">
          {DAYS.slice(0, 4).map((day) => (
            <DayButton
              key={day.value}
              day={day}
              selected={store.shoppingDays.includes(day.value)}
              onPress={() => store.toggleShoppingDay(day.value)}
            />
          ))}
        </View>
        <View className="flex-row gap-3">
          {DAYS.slice(4).map((day) => (
            <DayButton
              key={day.value}
              day={day}
              selected={store.shoppingDays.includes(day.value)}
              onPress={() => store.toggleShoppingDay(day.value)}
            />
          ))}
          {/* Spacer to keep weekend buttons same width */}
          <View className="flex-1" />
        </View>
      </View>

      {store.shoppingDays.length > 0 && (
        <View className="bg-[#D8F3DC] rounded-xl px-4 py-3">
          <Text className="text-sm text-[#2D6A4F] font-medium">
            Shopping on:{' '}
            {store.shoppingDays
              .slice()
              .sort((a, b) => {
                // Sort Mon–Sun (1–6 then 0)
                const order = [1, 2, 3, 4, 5, 6, 0];
                return order.indexOf(a) - order.indexOf(b);
              })
              .map((d) => DAYS.find((day) => day.value === d)?.label)
              .join(', ')}
          </Text>
        </View>
      )}

      {!canContinue && (
        <Text className="text-sm text-center text-red-500">
          Please select at least one shopping day.
        </Text>
      )}

      <Button
        label="Continue"
        disabled={!canContinue}
        onPress={() => router.push('/(onboarding)/step-complete')}
      />
    </ScrollView>
  );
}

function DayButton({
  day,
  selected,
  onPress,
}: {
  day: { label: string; short: string; value: number };
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={[
        'flex-1 py-4 rounded-2xl items-center justify-center gap-0.5',
        selected ? 'bg-[#2D6A4F]' : 'bg-white border border-gray-200',
      ].join(' ')}
      style={
        selected
          ? {}
          : {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
            }
      }
    >
      <Text
        className={`text-sm font-bold ${selected ? 'text-white' : 'text-[#1A1A2E]'}`}
      >
        {day.short}
      </Text>
    </Pressable>
  );
}
