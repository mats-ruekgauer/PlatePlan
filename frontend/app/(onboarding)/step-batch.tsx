import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { OnboardingProgress } from '../../components/onboarding/OnboardingProgress';
import { Button } from '../../components/ui/Button';
import { useOnboardingStore } from '../../stores/onboardingStore';

const BATCH_OPTIONS: {
  days: 1 | 2 | 3;
  label: string;
  description: string;
  emoji: string;
}[] = [
  {
    days: 1,
    label: 'Cook fresh daily',
    description: 'New recipe every day — maximum variety.',
    emoji: '🍳',
  },
  {
    days: 2,
    label: 'Cook for 2 days',
    description: 'Each recipe makes 2 portions — cook every other day.',
    emoji: '📦',
  },
  {
    days: 3,
    label: 'Cook for 3 days',
    description: 'Each recipe makes 3 portions — less time in the kitchen.',
    emoji: '🏗️',
  },
];

export default function StepBatch() {
  const { batchCookDays, setBatchCookDays } = useOnboardingStore();

  return (
    <ScrollView
      className="flex-1 bg-[#F8F9FA]"
      contentContainerClassName="px-5 pt-14 pb-8 gap-6"
    >
      <OnboardingProgress currentStep={4} totalSteps={7} />

      <View className="gap-1">
        <Text className="text-3xl font-bold text-[#1A1A2E]">Batch cooking</Text>
        <Text className="text-base text-[#6B7280]">
          How often do you want to cook? We'll scale recipes and group meals accordingly.
        </Text>
      </View>

      <View className="gap-3">
        {BATCH_OPTIONS.map((opt) => {
          const selected = batchCookDays === opt.days;
          return (
            <Pressable
              key={opt.days}
              onPress={() => setBatchCookDays(opt.days)}
              className={[
                'flex-row items-center gap-4 p-4 rounded-2xl border-2',
                selected
                  ? 'border-[#2D6A4F] bg-[#D8F3DC]'
                  : 'border-transparent bg-white',
              ].join(' ')}
              style={
                selected
                  ? {}
                  : {
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.06,
                      shadowRadius: 4,
                    }
              }
            >
              <Text className="text-3xl">{opt.emoji}</Text>
              <View className="flex-1">
                <Text
                  className={`text-base font-semibold ${
                    selected ? 'text-[#2D6A4F]' : 'text-[#1A1A2E]'
                  }`}
                >
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

      <Button
        label="Continue"
        onPress={() => router.push('/(onboarding)/step-pantry')}
      />
    </ScrollView>
  );
}
