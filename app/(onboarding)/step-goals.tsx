import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { MacroCalculator } from '../../components/onboarding/MacroCalculator';
import { OnboardingProgress } from '../../components/onboarding/OnboardingProgress';
import { Button } from '../../components/ui/Button';
import {
  calculateTdee,
  useOnboardingStore,
  type TdeeInput,
} from '../../stores/onboardingStore';
import type { ActivityLevel, Sex } from '../../types';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const calculateSchema = z.object({
  weightKg: z.coerce.number().min(30).max(300),
  heightCm: z.coerce.number().min(100).max(250),
  age: z.coerce.number().min(16).max(100),
  sex: z.enum(['male', 'female', 'other']),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']),
});

const manualSchema = z.object({
  calorieTarget: z.coerce.number().min(1200).max(6000),
  proteinTargetG: z.coerce.number().min(30).max(400),
});

type CalculateForm = z.infer<typeof calculateSchema>;
type ManualForm = z.infer<typeof manualSchema>;

// ─── Constants ────────────────────────────────────────────────────────────────

const SEX_OPTIONS: { label: string; value: Sex }[] = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
];

const ACTIVITY_OPTIONS: { label: string; value: ActivityLevel; description: string }[] = [
  { label: 'Sedentary', value: 'sedentary', description: 'Little/no exercise' },
  { label: 'Light', value: 'light', description: '1–3 days/week' },
  { label: 'Moderate', value: 'moderate', description: '3–5 days/week' },
  { label: 'Active', value: 'active', description: '6–7 days/week' },
  { label: 'Very active', value: 'very_active', description: 'Physical job + exercise' },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function StepGoals() {
  const store = useOnboardingStore();

  const calculateForm = useForm<CalculateForm>({
    resolver: zodResolver(calculateSchema),
    defaultValues: {
      weightKg: store.weightKg ?? undefined,
      heightCm: store.heightCm ?? undefined,
      age: store.age ?? undefined,
      sex: store.sex ?? 'male',
      activityLevel: store.activityLevel ?? 'moderate',
    },
  });

  const manualForm = useForm<ManualForm>({
    resolver: zodResolver(manualSchema),
    defaultValues: {
      calorieTarget: store.calorieTarget ?? undefined,
      proteinTargetG: store.proteinTargetG ?? undefined,
    },
  });

  const watchedCalcValues = calculateForm.watch();
  const isCalcValid = calculateForm.formState.isValid;

  // Derived TDEE for preview — only compute when form is fully valid
  const tdeeInput: TdeeInput | null =
    isCalcValid && store.goalsMode === 'calculate'
      ? {
          weightKg: watchedCalcValues.weightKg,
          heightCm: watchedCalcValues.heightCm,
          age: watchedCalcValues.age,
          sex: watchedCalcValues.sex as Sex,
          activityLevel: watchedCalcValues.activityLevel as ActivityLevel,
        }
      : null;

  // Keep store in sync with form as user types
  useEffect(() => {
    if (!isCalcValid || store.goalsMode !== 'calculate') return;
    const { weightKg, heightCm, age, sex, activityLevel } = watchedCalcValues;
    store.setBodyData({ weightKg, heightCm, age, sex: sex as Sex, activityLevel: activityLevel as ActivityLevel });
    const result = calculateTdee({ weightKg, heightCm, age, sex: sex as Sex, activityLevel: activityLevel as ActivityLevel });
    store.setCalculatedTargets(result.calorieTarget, result.proteinTargetG);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(watchedCalcValues), isCalcValid]);

  function onContinue() {
    if (store.goalsMode === 'manual') {
      manualForm.handleSubmit((data) => {
        store.setManualTargets(data.calorieTarget, data.proteinTargetG);
        router.push('/(onboarding)/step-preferences');
      })();
    } else {
      calculateForm.handleSubmit(() => {
        router.push('/(onboarding)/step-preferences');
      })();
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <ScrollView
        className="flex-1 bg-[#F8F9FA]"
        contentContainerClassName="px-5 pt-14 pb-8 gap-6"
        keyboardShouldPersistTaps="handled"
      >
        <OnboardingProgress currentStep={1} totalSteps={7} />

        <View className="gap-1">
          <Text className="text-3xl font-bold text-[#1A1A2E]">Set your goals</Text>
          <Text className="text-base text-[#6B7280]">
            We use this to calculate how many calories your meals should contain.
          </Text>
        </View>

        {/* Mode toggle */}
        <View className="flex-row bg-gray-200 rounded-xl p-1 gap-1">
          {(['calculate', 'manual'] as const).map((mode) => (
            <Pressable
              key={mode}
              onPress={() => store.setGoalsMode(mode)}
              className={[
                'flex-1 py-2 rounded-lg items-center',
                store.goalsMode === mode ? 'bg-white shadow-sm' : '',
              ].join(' ')}
            >
              <Text
                className={`text-sm font-medium ${
                  store.goalsMode === mode ? 'text-[#2D6A4F]' : 'text-gray-500'
                }`}
              >
                {mode === 'calculate' ? 'Calculate for me' : 'I know my targets'}
              </Text>
            </Pressable>
          ))}
        </View>

        {store.goalsMode === 'calculate' ? (
          <CalculateSection form={calculateForm} tdeeInput={tdeeInput} />
        ) : (
          <ManualSection form={manualForm} />
        )}

        <Button label="Continue" onPress={onContinue} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Calculate sub-form ───────────────────────────────────────────────────────

function CalculateSection({
  form,
  tdeeInput,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: ReturnType<typeof useForm<CalculateForm>>;
  tdeeInput: TdeeInput | null;
}) {
  const { control, formState: { errors } } = form;

  return (
    <View className="gap-4">
      <View className="flex-row gap-3">
        <View className="flex-1 gap-1">
          <Text className="text-sm font-medium text-[#1A1A2E]">Weight (kg)</Text>
          <Controller
            control={control}
            name="weightKg"
            render={({ field: { onChange, value } }) => (
              <TextInput
                className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-[#1A1A2E]"
                keyboardType="decimal-pad"
                placeholder="70"
                value={value?.toString() ?? ''}
                onChangeText={onChange}
              />
            )}
          />
          {errors.weightKg && <Text className="text-xs text-red-500">{errors.weightKg.message}</Text>}
        </View>
        <View className="flex-1 gap-1">
          <Text className="text-sm font-medium text-[#1A1A2E]">Height (cm)</Text>
          <Controller
            control={control}
            name="heightCm"
            render={({ field: { onChange, value } }) => (
              <TextInput
                className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-[#1A1A2E]"
                keyboardType="number-pad"
                placeholder="175"
                value={value?.toString() ?? ''}
                onChangeText={onChange}
              />
            )}
          />
          {errors.heightCm && <Text className="text-xs text-red-500">{errors.heightCm.message}</Text>}
        </View>
      </View>

      <View className="gap-1">
        <Text className="text-sm font-medium text-[#1A1A2E]">Age</Text>
        <Controller
          control={control}
          name="age"
          render={({ field: { onChange, value } }) => (
            <TextInput
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-[#1A1A2E]"
              keyboardType="number-pad"
              placeholder="30"
              value={value?.toString() ?? ''}
              onChangeText={onChange}
            />
          )}
        />
        {errors.age && <Text className="text-xs text-red-500">{errors.age.message}</Text>}
      </View>

      <View className="gap-1">
        <Text className="text-sm font-medium text-[#1A1A2E]">Biological sex</Text>
        <Controller
          control={control}
          name="sex"
          render={({ field: { onChange, value } }) => (
            <View className="flex-row gap-2">
              {SEX_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => onChange(opt.value)}
                  className={[
                    'flex-1 py-2.5 rounded-xl border items-center',
                    value === opt.value
                      ? 'border-[#2D6A4F] bg-[#D8F3DC]'
                      : 'border-gray-200 bg-white',
                  ].join(' ')}
                >
                  <Text
                    className={`text-sm font-medium ${
                      value === opt.value ? 'text-[#2D6A4F]' : 'text-gray-500'
                    }`}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        />
      </View>

      <View className="gap-1">
        <Text className="text-sm font-medium text-[#1A1A2E]">Activity level</Text>
        <Controller
          control={control}
          name="activityLevel"
          render={({ field: { onChange, value } }) => (
            <View className="gap-2">
              {ACTIVITY_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => onChange(opt.value)}
                  className={[
                    'flex-row items-center justify-between px-4 py-3 rounded-xl border',
                    value === opt.value
                      ? 'border-[#2D6A4F] bg-[#D8F3DC]'
                      : 'border-gray-200 bg-white',
                  ].join(' ')}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      value === opt.value ? 'text-[#2D6A4F]' : 'text-[#1A1A2E]'
                    }`}
                  >
                    {opt.label}
                  </Text>
                  <Text className="text-xs text-gray-400">{opt.description}</Text>
                </Pressable>
              ))}
            </View>
          )}
        />
      </View>

      {tdeeInput && <MacroCalculator input={tdeeInput} />}
    </View>
  );
}

// ─── Manual sub-form ──────────────────────────────────────────────────────────

function ManualSection({ form }: { form: ReturnType<typeof useForm<ManualForm>> }) {
  const { control, formState: { errors } } = form;

  return (
    <View className="gap-4">
      <View className="gap-1">
        <Text className="text-sm font-medium text-[#1A1A2E]">Daily calorie target (kcal)</Text>
        <Controller
          control={control}
          name="calorieTarget"
          render={({ field: { onChange, value } }) => (
            <TextInput
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-[#1A1A2E]"
              keyboardType="number-pad"
              placeholder="2000"
              value={value?.toString() ?? ''}
              onChangeText={onChange}
            />
          )}
        />
        {errors.calorieTarget && (
          <Text className="text-xs text-red-500">{errors.calorieTarget.message}</Text>
        )}
      </View>

      <View className="gap-1">
        <Text className="text-sm font-medium text-[#1A1A2E]">Daily protein target (g)</Text>
        <Controller
          control={control}
          name="proteinTargetG"
          render={({ field: { onChange, value } }) => (
            <TextInput
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-[#1A1A2E]"
              keyboardType="number-pad"
              placeholder="150"
              value={value?.toString() ?? ''}
              onChangeText={onChange}
            />
          )}
        />
        {errors.proteinTargetG && (
          <Text className="text-xs text-red-500">{errors.proteinTargetG.message}</Text>
        )}
      </View>
    </View>
  );
}
