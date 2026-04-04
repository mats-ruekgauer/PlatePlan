import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { Badge } from '../../components/ui/Badge';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Skeleton } from '../../components/ui/Skeleton';
import { mapRecipe, supabase } from '../../lib/supabase';
import { shareRecipe } from '../../lib/sharing';
import { colors } from '../../constants/theme';
import type { Recipe } from '../../types';

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: recipe, isLoading } = useQuery({
    queryKey: ['recipe', id],
    queryFn: async (): Promise<Recipe | null> => {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data ? mapRecipe(data) : null;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 10,
  });

  if (isLoading) {
    return <RecipeSkeleton />;
  }

  if (!recipe) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F8F9FA] gap-3">
        <Text className="text-4xl">😕</Text>
        <Text className="text-base font-semibold text-[#1A1A2E]">Recipe not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-sm text-[#2D6A4F] font-medium">Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const kcal = recipe.caloriesPerServing ?? 0;
  const p = recipe.proteinPerServingG ?? 0;
  const c = recipe.carbsPerServingG ?? 0;
  const f = recipe.fatPerServingG ?? 0;
  const totalKcalFromMacros = p * 4 + c * 4 + f * 9 || 1;

  return (
    <ScrollView
      className="flex-1 bg-[#F8F9FA]"
      contentContainerClassName="pb-12"
    >
      {/* Header */}
      <View className="px-4 pt-14 pb-4 gap-3">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-9 h-9 rounded-xl bg-white items-center justify-center active:opacity-70"
            style={{ shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } }}
          >
            <Text className="text-lg">‹</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => shareRecipe(recipe)}
            className="flex-row items-center gap-1.5 px-3 py-2 rounded-xl bg-[#D8F3DC] active:opacity-70"
          >
            <Text className="text-sm">📤</Text>
            <Text className="text-sm font-semibold text-[#2D6A4F]">Share</Text>
          </TouchableOpacity>
        </View>

        <Text className="text-2xl font-bold text-[#1A1A2E]">{recipe.title}</Text>

        {recipe.description && (
          <Text className="text-base text-[#6B7280] leading-5">{recipe.description}</Text>
        )}

        {/* Macro bar */}
        <View className="gap-2">
          <View className="flex-row justify-between">
            <MacroLabel color={colors.calorie} label="Calories" value={`${kcal}`} unit="kcal" />
            <MacroLabel color={colors.protein} label="Protein" value={`${p}`} unit="g" />
            <MacroLabel color={colors.carbs} label="Carbs" value={`${c}`} unit="g" />
            <MacroLabel color={colors.fat} label="Fat" value={`${f}`} unit="g" />
          </View>
          <ProgressBar
            segments={[
              { fraction: (p * 4) / totalKcalFromMacros, color: colors.protein },
              { fraction: (c * 4) / totalKcalFromMacros, color: colors.carbs },
              { fraction: (f * 9) / totalKcalFromMacros, color: colors.fat },
            ]}
            height={8}
            animated
          />
        </View>

        {/* Meta */}
        <View className="flex-row flex-wrap gap-2">
          {recipe.cookTimeMinutes != null && (
            <Badge label={`⏱ ${recipe.cookTimeMinutes} min`} variant="muted" />
          )}
          {recipe.servings > 1 && (
            <Badge label={`${recipe.servings} servings`} variant="muted" />
          )}
          {recipe.cuisine && (
            <Badge label={recipe.cuisine} variant="muted" />
          )}
          {recipe.isSeasonal && (
            <Badge label={`${recipe.season} seasonal`} variant="success" dot />
          )}
          {recipe.tags.map((tag) => (
            <Badge key={tag} label={tag} variant="muted" />
          ))}
        </View>
      </View>

      <SectionDivider />

      {/* Ingredients */}
      <View className="px-4 py-5 gap-3">
        <Text className="text-lg font-bold text-[#1A1A2E]">
          Ingredients
          {recipe.servings > 1 && (
            <Text className="text-sm font-normal text-[#6B7280]">
              {' '}(for {recipe.servings})
            </Text>
          )}
        </Text>
        <View
          className="bg-white rounded-2xl overflow-hidden"
          style={{ shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }}
        >
          {recipe.ingredients.map((ing, idx) => (
            <View key={`${ing.name}-${idx}`}>
              {idx > 0 && <View className="h-px bg-gray-100 mx-4" />}
              <View className="flex-row items-center justify-between px-4 py-3">
                <View className="flex-1 gap-0.5">
                  <Text className="text-sm font-medium text-[#1A1A2E] capitalize">
                    {ing.name}
                  </Text>
                  {ing.category && (
                    <Text className="text-xs text-[#9CA3AF] capitalize">{ing.category}</Text>
                  )}
                </View>
                <Text className="text-sm text-[#6B7280] ml-3">
                  {ing.amount % 1 === 0 ? ing.amount : ing.amount.toFixed(1)} {ing.unit}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <SectionDivider />

      {/* Instructions */}
      <View className="px-4 py-5 gap-3">
        <Text className="text-lg font-bold text-[#1A1A2E]">Instructions</Text>
        <View className="gap-3">
          {recipe.steps.map((step, idx) => (
            <View
              key={idx}
              className="flex-row gap-3 bg-white rounded-2xl p-4"
              style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } }}
            >
              <View className="w-7 h-7 rounded-full bg-[#2D6A4F] items-center justify-center flex-shrink-0 mt-0.5">
                <Text className="text-xs font-bold text-white">{idx + 1}</Text>
              </View>
              <Text className="text-sm text-[#1A1A2E] flex-1 leading-5">{step}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Footer: link back to plan */}
      <View className="px-4 pt-2">
        <TouchableOpacity
          onPress={() => router.replace('/(tabs)')}
          className="items-center py-3"
        >
          <Text className="text-sm text-[#2D6A4F] font-medium">← Back to this week's plan</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function MacroLabel({
  color,
  label,
  value,
  unit,
}: {
  color: string;
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <View className="items-center gap-0.5">
      <Text className="text-xs text-[#9CA3AF]">{label}</Text>
      <Text className="text-base font-bold" style={{ color }}>
        {value}
        <Text className="text-xs font-normal text-[#9CA3AF]"> {unit}</Text>
      </Text>
    </View>
  );
}

function SectionDivider() {
  return <View className="h-2 bg-[#F8F9FA]" />;
}

function RecipeSkeleton() {
  return (
    <View className="flex-1 bg-[#F8F9FA] px-4 pt-14 gap-4">
      <Skeleton width={80} height={36} borderRadius={10} />
      <Skeleton width="75%" height={28} borderRadius={8} />
      <Skeleton width="100%" height={16} borderRadius={6} />
      <Skeleton width="100%" height={60} borderRadius={12} />
      <Skeleton width="100%" height={140} borderRadius={16} />
      <Skeleton width="100%" height={220} borderRadius={16} />
    </View>
  );
}
