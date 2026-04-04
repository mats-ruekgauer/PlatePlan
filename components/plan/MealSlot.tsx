import { router } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { Badge } from '../ui/Badge';
import type { HydratedMeal } from '../../types';

interface MealSlotProps {
  meal: HydratedMeal;
  onLongPress?: () => void;
  showFeedbackBadge?: boolean;
}

export function MealSlot({ meal, onLongPress, showFeedbackBadge = false }: MealSlotProps) {
  const { recipe } = meal;
  const kcal = recipe.caloriesPerServing;
  const protein = recipe.proteinPerServingG;
  const cookTime = recipe.cookTimeMinutes;

  return (
    <Pressable
      onPress={() => router.push(`/meal/${meal.id}`)}
      onLongPress={onLongPress}
      delayLongPress={400}
      className="active:opacity-75"
    >
      <View
        className="bg-white rounded-2xl p-4 gap-2"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 4,
        }}
      >
        {/* Slot label + feedback badge */}
        <View className="flex-row items-center justify-between">
          <Text className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide">
            {meal.mealSlot}
          </Text>
          {showFeedbackBadge && (
            <Badge label="Rate it" variant="warning" dot />
          )}
        </View>

        {/* Recipe title */}
        <Text className="text-base font-semibold text-[#1A1A2E]" numberOfLines={2}>
          {recipe.title}
        </Text>

        {/* Meta row: macros + cook time + batch */}
        <View className="flex-row items-center gap-2 flex-wrap">
          {kcal != null && (
            <MacroPill color="#F59E0B" label={`${kcal} kcal`} />
          )}
          {protein != null && (
            <MacroPill color="#3B82F6" label={`${protein}g protein`} />
          )}
          {cookTime != null && (
            <Badge label={`${cookTime} min`} variant="muted" />
          )}
          {meal.batchGroup != null && (
            <Badge label="Batch" variant="info" dot />
          )}
          {meal.chosenRecipeId && (
            <Badge label="Swapped" variant="success" dot />
          )}
        </View>
      </View>
    </Pressable>
  );
}

function MacroPill({ color, label }: { color: string; label: string }) {
  return (
    <View
      className="px-2 py-0.5 rounded-full"
      style={{ backgroundColor: `${color}18` }} // ~10% opacity tint
    >
      <Text className="text-xs font-semibold" style={{ color }}>
        {label}
      </Text>
    </View>
  );
}
