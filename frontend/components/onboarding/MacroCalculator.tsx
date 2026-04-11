import React from 'react';
import { Text, View } from 'react-native';

import { colors } from '../../constants/theme';
import { calculateTdee, type TdeeInput } from '../../stores/onboardingStore';
import { ProgressBar } from '../ui/ProgressBar';

interface MacroCalculatorProps {
  input: TdeeInput;
}

/**
 * Displays the calculated TDEE breakdown for the Goals step.
 * Pure display component — the parent stores the result via setCalculatedTargets.
 */
export function MacroCalculator({ input }: MacroCalculatorProps) {
  const result = calculateTdee(input);

  return (
    <View className="bg-[#D8F3DC] rounded-2xl p-4 gap-3">
      <Text className="text-[#1A1A2E] font-semibold text-base">Your estimated targets</Text>

      <Row label="Basal metabolic rate (BMR)" value={`${result.bmr} kcal`} />
      <Row label="Total daily energy (TDEE)" value={`${result.tdee} kcal`} />

      <View className="h-px bg-[#52B788] opacity-30" />

      <View className="gap-1">
        <Row
          label="Daily calorie target"
          value={`${result.calorieTarget} kcal`}
          highlight
        />
        <Text className="text-xs text-[#2D6A4F] opacity-70">
          TDEE minus 300 kcal mild deficit
        </Text>
      </View>

      <Row label="Protein target" value={`${result.proteinTargetG} g/day`} highlight />

      {/* Visual macro proportion preview */}
      <View className="gap-1 mt-1">
        <Text className="text-xs text-[#2D6A4F] font-medium">Approx. macro split</Text>
        <ProgressBar
          segments={[
            { fraction: 0.3, color: colors.protein },
            { fraction: 0.45, color: colors.carbs },
            { fraction: 0.25, color: colors.fat },
          ]}
          height={10}
          animated
        />
        <View className="flex-row gap-3 mt-0.5">
          <Legend color={colors.protein} label="Protein 30%" />
          <Legend color={colors.carbs} label="Carbs 45%" />
          <Legend color={colors.fat} label="Fat 25%" />
        </View>
      </View>
    </View>
  );
}

function Row({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View className="flex-row justify-between items-center">
      <Text className={`text-sm ${highlight ? 'text-[#1A1A2E] font-semibold' : 'text-[#6B7280]'}`}>
        {label}
      </Text>
      <Text className={`text-sm ${highlight ? 'text-[#2D6A4F] font-bold' : 'text-[#1A1A2E]'}`}>
        {value}
      </Text>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1">
      <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: color }} />
      <Text className="text-xs text-[#6B7280]">{label}</Text>
    </View>
  );
}
