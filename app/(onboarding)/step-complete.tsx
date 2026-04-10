import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { Button } from '../../components/ui/Button';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { requestNotificationPermission } from '../../lib/notifications';
import { supabase } from '../../lib/supabase';
import { useOnboardingStore } from '../../stores/onboardingStore';

type Step = 'idle' | 'saving' | 'scheduling' | 'done' | 'error';

const STEP_LABELS: Record<Step, string> = {
  idle: 'Setting up...',
  saving: 'Saving your preferences...',
  scheduling: 'Scheduling reminders...',
  done: 'All done!',
  error: 'Something went wrong.',
};

const STEP_PROGRESS: Record<Step, number> = {
  idle: 0,
  saving: 0.4,
  scheduling: 0.8,
  done: 1,
  error: 0,
};

export default function StepComplete() {
  const store = useOnboardingStore();
  const [currentStep, setCurrentStep] = useState<Step>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run() {
    try {
      setCurrentStep('saving');
      await savePreferences();

      setCurrentStep('scheduling');
      await requestNotificationPermission().catch(() => null);

      setCurrentStep('done');

      await delay(600);
      router.replace('/(onboarding)/step-household');
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: unknown }).message)
          : String(err);
      console.error('[step-complete] error:', message, err);
      setErrorMessage(message);
      setCurrentStep('error');
    }
  }

  async function savePreferences() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');
    const userId = session.user.id;

    const { error } = await supabase.from('user_preferences').upsert({
      user_id: userId,
      calorie_target: store.calorieTarget,
      protein_target_g: store.proteinTargetG,
      weight_kg: store.weightKg,
      height_cm: store.heightCm,
      age: store.age,
      sex: store.sex,
      activity_level: store.activityLevel,
      dietary_restrictions: store.dietaryRestrictions,
      liked_ingredients: store.likedIngredients,
      disliked_ingredients: store.dislikedIngredients,
      liked_cuisines: store.likedCuisines,
      seasonality_importance: store.seasonalityImportance,
      managed_meal_slots: store.managedMealSlots,
      unmanaged_slot_calories: store.unmanagedSlotCalories,
      batch_cook_days: store.batchCookDays,
      max_cook_time_minutes: 45,
      shopping_days: store.shoppingDays,
      pantry_staples: store.pantryStaples,
    }, { onConflict: 'user_id' });
    if (error) throw new Error(`Save preferences failed: ${error.message} (code: ${error.code})`);
  }

  const isDone = currentStep === 'done';
  const isError = currentStep === 'error';
  const isLoading = !isDone && !isError;

  return (
    <ScrollView
      className="flex-1 bg-[#F8F9FA]"
      contentContainerClassName="flex-1 px-5 pt-14 pb-8 justify-center gap-8"
    >
      <View className="items-center gap-3">
        <Text className="text-5xl">{isDone ? '✅' : isError ? '😕' : '⏳'}</Text>
        <Text className="text-2xl font-bold text-[#1A1A2E] text-center">
          {isDone
            ? 'Preferences saved!'
            : isError
            ? 'Something went wrong'
            : 'Saving your preferences'}
        </Text>
        {!isError && (
          <Text className="text-base text-[#6B7280] text-center">
            {isDone
              ? "Now let's set up your household."
              : 'This only takes a moment...'}
          </Text>
        )}
      </View>

      {isLoading && (
        <View className="gap-4">
          <ProgressBar value={STEP_PROGRESS[currentStep]} height={10} animated />
          <View className="flex-row items-center justify-center gap-3">
            <ActivityIndicator size="small" color="#2D6A4F" />
            <Text className="text-sm text-[#6B7280]">{STEP_LABELS[currentStep]}</Text>
          </View>
        </View>
      )}

      {isDone && (
        <View className="gap-4">
          <ProgressBar value={1} height={10} animated />
          <Text className="text-sm text-center text-[#2D6A4F] font-medium">
            {STEP_LABELS.done}
          </Text>
        </View>
      )}

      {isError && (
        <View className="gap-4">
          <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <Text className="text-sm text-red-600">{errorMessage}</Text>
          </View>
          <Button
            label="Try again"
            onPress={() => {
              hasStarted.current = false;
              setCurrentStep('idle');
              setErrorMessage(null);
              run();
            }}
          />
        </View>
      )}
    </ScrollView>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
