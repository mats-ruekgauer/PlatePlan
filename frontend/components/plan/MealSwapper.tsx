import React from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';

import { Button } from '../ui/Button';
import { useSwapMeal } from '../../hooks/usePlan';
import { useUiStore } from '../../stores/uiStore';
import type { HydratedMeal } from '../../types';

interface MealSwapperProps {
  meal: HydratedMeal | null;
  onClose: () => void;
}

export function MealSwapper({ meal, onClose }: MealSwapperProps) {
  const swapMeal = useSwapMeal();

  if (!meal) return null;

  const { recipe, alternativeRecipe } = meal;
  const hasAlternative = !!alternativeRecipe;

  async function handleSwap(recipeId: string) {
    await swapMeal.mutateAsync({ plannedMealId: meal!.id, chosenRecipeId: recipeId });
    onClose();
  }

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/40 justify-end" onPress={onClose}>
        <Pressable
          className="bg-white rounded-t-3xl p-6 gap-5"
          onPress={(e) => e.stopPropagation()}
        >
          {/* Handle */}
          <View className="w-10 h-1 rounded-full bg-gray-300 self-center" />

          <Text className="text-xl font-bold text-[#1A1A2E]">Swap meal</Text>

          {hasAlternative ? (
            <View className="gap-3">
              <RecipeOption
                label="Option A"
                recipe={recipe}
                isSelected={!meal.chosenRecipeId || meal.chosenRecipeId === recipe.id}
                onSelect={() => handleSwap(recipe.id)}
                loading={swapMeal.isPending}
              />
              <RecipeOption
                label="Option B"
                recipe={alternativeRecipe!}
                isSelected={meal.chosenRecipeId === alternativeRecipe!.id}
                onSelect={() => handleSwap(alternativeRecipe!.id)}
                loading={swapMeal.isPending}
              />
            </View>
          ) : (
            <View className="items-center py-6">
              <Text className="text-[#6B7280] text-sm text-center">
                No alternative recipe available for this slot.
              </Text>
            </View>
          )}

          {swapMeal.isError && (
            <Text className="text-sm text-red-500 text-center">
              Failed to swap — please try again.
            </Text>
          )}

          <Button label="Cancel" variant="ghost" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function RecipeOption({
  label,
  recipe,
  isSelected,
  onSelect,
  loading,
}: {
  label: string;
  recipe: { id: string; title: string; caloriesPerServing: number | null; cookTimeMinutes: number | null; cuisine: string | null };
  isSelected: boolean;
  onSelect: () => void;
  loading: boolean;
}) {
  return (
    <Pressable
      onPress={onSelect}
      disabled={loading}
      className={[
        'p-4 rounded-2xl border-2 gap-1',
        isSelected ? 'border-[#2D6A4F] bg-[#D8F3DC]' : 'border-gray-200 bg-white',
      ].join(' ')}
    >
      <View className="flex-row items-start justify-between gap-2">
        <View className="flex-1 gap-0.5">
          <Text className="text-xs font-semibold text-[#9CA3AF] uppercase">{label}</Text>
          <Text className={`text-base font-semibold ${isSelected ? 'text-[#2D6A4F]' : 'text-[#1A1A2E]'}`}>
            {recipe.title}
          </Text>
        </View>
        {loading ? (
          <ActivityIndicator size="small" color="#2D6A4F" />
        ) : isSelected ? (
          <View className="w-6 h-6 rounded-full bg-[#2D6A4F] items-center justify-center">
            <Text className="text-white text-xs font-bold">✓</Text>
          </View>
        ) : null}
      </View>
      <View className="flex-row gap-3">
        {recipe.caloriesPerServing != null && (
          <Text className="text-xs text-[#6B7280]">{recipe.caloriesPerServing} kcal</Text>
        )}
        {recipe.cookTimeMinutes != null && (
          <Text className="text-xs text-[#6B7280]">{recipe.cookTimeMinutes} min</Text>
        )}
        {recipe.cuisine && (
          <Text className="text-xs text-[#6B7280]">{recipe.cuisine}</Text>
        )}
      </View>
    </Pressable>
  );
}
