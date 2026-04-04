import React from 'react';
import { Text, View } from 'react-native';

import { ProgressBar } from '../ui/ProgressBar';

interface OnboardingProgressProps {
  currentStep: number; // 1-based
  totalSteps: number;
}

export function OnboardingProgress({ currentStep, totalSteps }: OnboardingProgressProps) {
  const fraction = currentStep / totalSteps;

  return (
    <View className="gap-1.5">
      <View className="flex-row justify-between">
        <Text className="text-xs text-gray-400 font-medium">
          Step {currentStep} of {totalSteps}
        </Text>
        <Text className="text-xs text-gray-400">
          {Math.round(fraction * 100)}%
        </Text>
      </View>
      <ProgressBar value={fraction} height={6} animated />
    </View>
  );
}
