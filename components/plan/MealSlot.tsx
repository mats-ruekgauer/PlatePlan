import { router } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { Badge } from '../ui/Badge';
import type { HydratedMeal, MealStatus } from '../../types';

const STATUS_CYCLE: MealStatus[] = ['recommended', 'planned', 'prepared', 'cooked', 'rated'];

const STATUS_CONFIG: Record<MealStatus, { label: string; variant: 'muted' | 'info' | 'warning' | 'success' | 'default' }> = {
  recommended: { label: 'Recommended', variant: 'muted' },
  planned:     { label: 'Planned',      variant: 'info' },
  prepared:    { label: 'Prepared',     variant: 'warning' },
  cooked:      { label: 'Cooked',       variant: 'success' },
  rated:       { label: 'Rated',        variant: 'default' },
  skipped:     { label: 'Skipped',      variant: 'muted' },
};

interface MealSlotProps {
  meal: HydratedMeal;
  onLongPress?: () => void;
  onStatusChange?: (meal: HydratedMeal, newStatus: MealStatus) => void;
  onApprove?: (meal: HydratedMeal) => void;
  onSkip?: (meal: HydratedMeal) => void;
  onRegenerate?: (meal: HydratedMeal) => void;
}

export function MealSlot({
  meal,
  onLongPress,
  onStatusChange,
  onApprove,
  onSkip,
  onRegenerate,
}: MealSlotProps) {
  const { recipe } = meal;
  const kcal = recipe.caloriesPerServing;
  const protein = recipe.proteinPerServingG;
  const cookTime = recipe.cookTimeMinutes;
  const isSkipped = meal.status === 'skipped';

  function handleStatusPress() {
    if (!onStatusChange || isSkipped) return;
    const currentIndex = STATUS_CYCLE.indexOf(meal.status);
    const nextIndex = (currentIndex + 1) % STATUS_CYCLE.length;
    onStatusChange(meal, STATUS_CYCLE[nextIndex]);
  }

  const statusConfig = STATUS_CONFIG[meal.status] ?? STATUS_CONFIG.recommended;

  return (
    <Pressable
      onPress={() => !isSkipped && router.push(`/meal/${meal.id}`)}
      onLongPress={onLongPress}
      delayLongPress={400}
      className="active:opacity-75"
    >
      <View
        className={`bg-white rounded-2xl p-4 gap-2 ${isSkipped ? 'opacity-40' : ''}`}
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 4,
        }}
      >
        {/* Slot label + status badge */}
        <View className="flex-row items-center justify-between">
          <Text className={`text-xs font-semibold uppercase tracking-wide ${isSkipped ? 'text-[#9CA3AF] line-through' : 'text-[#9CA3AF]'}`}>
            {meal.mealSlot}
          </Text>
          <Pressable onPress={handleStatusPress} hitSlop={8}>
            <Badge label={statusConfig.label} variant={statusConfig.variant} />
          </Pressable>
        </View>

        {/* Recipe title */}
        <Text className={`text-base font-semibold ${isSkipped ? 'text-[#9CA3AF] line-through' : 'text-[#1A1A2E]'}`} numberOfLines={2}>
          {recipe.title}
        </Text>

        {/* Meta row: macros + cook time + price + batch */}
        {!isSkipped && (
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
            {recipe.estimatedPriceEur != null && (
              <MacroPill color="#059669" label={`€${recipe.estimatedPriceEur.toFixed(2)}`} />
            )}
            {meal.batchGroup != null && (
              <Badge label="Batch" variant="info" dot />
            )}
            {meal.chosenRecipeId && (
              <Badge label="Swapped" variant="success" dot />
            )}
          </View>
        )}

        {/* Action buttons */}
        <View className="flex-row gap-2 mt-1">
          {meal.status === 'recommended' && !isSkipped && onApprove && (
            <Pressable
              onPress={(e) => { e.stopPropagation?.(); onApprove(meal); }}
              className="flex-1 flex-row items-center justify-center gap-1 py-1.5 rounded-lg bg-[#D8F3DC] border border-[#2D6A4F]"
            >
              <Text className="text-xs font-semibold text-[#2D6A4F]">✓ Approve</Text>
            </Pressable>
          )}
          {!isSkipped && onSkip && (
            <Pressable
              onPress={(e) => { e.stopPropagation?.(); onSkip(meal); }}
              className="flex-1 flex-row items-center justify-center gap-1 py-1.5 rounded-lg bg-gray-100 border border-gray-200"
            >
              <Text className="text-xs font-semibold text-gray-500">⊘ Skip</Text>
            </Pressable>
          )}
          {isSkipped && onSkip && (
            <Pressable
              onPress={(e) => { e.stopPropagation?.(); onSkip(meal); }}
              className="flex-1 flex-row items-center justify-center gap-1 py-1.5 rounded-lg bg-gray-100 border border-gray-200"
            >
              <Text className="text-xs font-semibold text-gray-500">↩ Undo skip</Text>
            </Pressable>
          )}
          {onRegenerate && (
            <Pressable
              onPress={(e) => { e.stopPropagation?.(); onRegenerate(meal); }}
              className="flex-1 flex-row items-center justify-center gap-1 py-1.5 rounded-lg bg-blue-50 border border-blue-200"
            >
              <Text className="text-xs font-semibold text-blue-600">↻ Different</Text>
            </Pressable>
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
      style={{ backgroundColor: `${color}18` }}
    >
      <Text className="text-xs font-semibold" style={{ color }}>
        {label}
      </Text>
    </View>
  );
}
