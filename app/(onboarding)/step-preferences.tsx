import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { OnboardingProgress } from '../../components/onboarding/OnboardingProgress';
import { Button } from '../../components/ui/Button';
import { useOnboardingStore } from '../../stores/onboardingStore';
import type { DietaryRestriction } from '../../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const DIETARY_OPTIONS: { label: string; value: DietaryRestriction; emoji: string }[] = [
  { label: 'Vegetarian', value: 'vegetarian', emoji: '🥦' },
  { label: 'Vegan', value: 'vegan', emoji: '🌱' },
  { label: 'Gluten-free', value: 'gluten_free', emoji: '🌾' },
  { label: 'Lactose-free', value: 'lactose_free', emoji: '🥛' },
  { label: 'Nut-free', value: 'nut_free', emoji: '🥜' },
  { label: 'Halal', value: 'halal', emoji: '☪️' },
  { label: 'Kosher', value: 'kosher', emoji: '✡️' },
];

const CUISINE_OPTIONS = [
  { label: 'Italian', emoji: '🍝' },
  { label: 'Asian', emoji: '🍜' },
  { label: 'Mediterranean', emoji: '🫒' },
  { label: 'Mexican', emoji: '🌮' },
  { label: 'German', emoji: '🥨' },
  { label: 'Middle Eastern', emoji: '🧆' },
  { label: 'American', emoji: '🍔' },
];

const COOK_TIME_STEPS = [15, 20, 30, 45, 60, 90, 120];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function StepPreferences() {
  const store = useOnboardingStore();
  const [ingredientInput, setIngredientInput] = useState('');

  function addIngredient() {
    const trimmed = ingredientInput.trim();
    if (!trimmed) return;
    store.addDislikedIngredient(trimmed);
    setIngredientInput('');
  }

  const cookTimeIndex = COOK_TIME_STEPS.indexOf(store.maxCookTimeMinutes);
  const safeIndex = cookTimeIndex === -1 ? 3 : cookTimeIndex; // default to 45 min index

  function formatCookTime(minutes: number) {
    if (minutes < 60) return `${minutes} min`;
    return `${minutes / 60} hr`;
  }

  return (
    <ScrollView
      className="flex-1 bg-[#F8F9FA]"
      contentContainerClassName="px-5 pt-14 pb-8 gap-6"
    >
      <OnboardingProgress currentStep={2} totalSteps={7} />

      <View className="gap-1">
        <Text className="text-3xl font-bold text-[#1A1A2E]">Your preferences</Text>
        <Text className="text-base text-[#6B7280]">
          Tell us what you eat and how you like to cook.
        </Text>
      </View>

      {/* Dietary restrictions */}
      <View className="gap-3">
        <Text className="text-base font-semibold text-[#1A1A2E]">Dietary restrictions</Text>
        <View className="flex-row flex-wrap gap-2">
          {DIETARY_OPTIONS.map((opt) => {
            const selected = store.dietaryRestrictions.includes(opt.value);
            return (
              <Pressable
                key={opt.value}
                onPress={() => store.toggleDietaryRestriction(opt.value)}
                className={[
                  'flex-row items-center gap-1.5 px-3 py-2 rounded-full border',
                  selected ? 'border-[#2D6A4F] bg-[#D8F3DC]' : 'border-gray-200 bg-white',
                ].join(' ')}
              >
                <Text>{opt.emoji}</Text>
                <Text
                  className={`text-sm font-medium ${
                    selected ? 'text-[#2D6A4F]' : 'text-[#1A1A2E]'
                  }`}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Disliked ingredients */}
      <View className="gap-3">
        <Text className="text-base font-semibold text-[#1A1A2E]">Disliked ingredients</Text>
        <View className="flex-row gap-2">
          <TextInput
            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-[#1A1A2E]"
            placeholder="e.g. mushrooms, olives..."
            value={ingredientInput}
            onChangeText={setIngredientInput}
            onSubmitEditing={addIngredient}
            returnKeyType="done"
          />
          <Pressable
            onPress={addIngredient}
            className="h-12 w-12 rounded-xl bg-[#2D6A4F] items-center justify-center"
          >
            <Text className="text-white text-xl font-bold">+</Text>
          </Pressable>
        </View>
        {store.dislikedIngredients.length > 0 && (
          <View className="flex-row flex-wrap gap-2">
            {store.dislikedIngredients.map((item) => (
              <Pressable
                key={item}
                onPress={() => store.removeDislikedIngredient(item)}
                className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-100 border border-red-200"
              >
                <Text className="text-sm text-red-600 font-medium">{item}</Text>
                <Text className="text-xs text-red-400">✕</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* Liked cuisines */}
      <View className="gap-3">
        <Text className="text-base font-semibold text-[#1A1A2E]">Favourite cuisines</Text>
        <Text className="text-sm text-[#6B7280] -mt-1">
          Select any you enjoy — we'll prioritise these.
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {CUISINE_OPTIONS.map((opt) => {
            const selected = store.likedCuisines.includes(opt.label);
            return (
              <Pressable
                key={opt.label}
                onPress={() => store.toggleLikedCuisine(opt.label)}
                className={[
                  'flex-row items-center gap-1.5 px-3 py-2 rounded-full border',
                  selected ? 'border-[#2D6A4F] bg-[#D8F3DC]' : 'border-gray-200 bg-white',
                ].join(' ')}
              >
                <Text>{opt.emoji}</Text>
                <Text
                  className={`text-sm font-medium ${
                    selected ? 'text-[#2D6A4F]' : 'text-[#1A1A2E]'
                  }`}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Max cook time slider */}
      <View className="gap-3">
        <View className="flex-row justify-between items-baseline">
          <Text className="text-base font-semibold text-[#1A1A2E]">Max cook time</Text>
          <Text className="text-[#2D6A4F] font-bold text-lg">
            {formatCookTime(store.maxCookTimeMinutes)}
          </Text>
        </View>
        {/* Segmented step picker — simpler than a native slider for MVP */}
        <View className="flex-row gap-1">
          {COOK_TIME_STEPS.map((step, idx) => (
            <Pressable
              key={step}
              onPress={() => store.setMaxCookTimeMinutes(step)}
              className={[
                'flex-1 py-2 rounded-lg items-center',
                idx === safeIndex
                  ? 'bg-[#2D6A4F]'
                  : idx < safeIndex
                  ? 'bg-[#52B788]'
                  : 'bg-gray-200',
              ].join(' ')}
            >
              <Text
                className={`text-xs font-semibold ${
                  idx <= safeIndex ? 'text-white' : 'text-gray-400'
                }`}
              >
                {formatCookTime(step)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Button label="Continue" onPress={() => router.push('/(onboarding)/step-meal-slots')} />
    </ScrollView>
  );
}
