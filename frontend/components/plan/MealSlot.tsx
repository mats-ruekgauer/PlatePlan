import { router } from 'expo-router';
import React from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { getMealSlotLabel, getMealStatusLabel, useI18n } from '../../lib/i18n';
import { Badge } from '../ui/Badge';
import type { HydratedMeal, MealStatus } from '../../types';

const STATUS_CYCLE: MealStatus[] = ['recommended', 'planned', 'prepared', 'cooked', 'rated'];

const STATUS_BUTTON_STYLES: Record<MealStatus, { container: string; title: string; detail: string }> = {
  recommended: {
    container: 'bg-[#F0FDF4] border-[#86EFAC]',
    title: 'text-[#166534]',
    detail: 'text-[#15803D]',
  },
  planned: {
    container: 'bg-[#EFF6FF] border-[#BFDBFE]',
    title: 'text-[#1D4ED8]',
    detail: 'text-[#2563EB]',
  },
  prepared: {
    container: 'bg-[#FFFBEB] border-[#FCD34D]',
    title: 'text-[#B45309]',
    detail: 'text-[#D97706]',
  },
  cooked: {
    container: 'bg-[#ECFDF5] border-[#6EE7B7]',
    title: 'text-[#047857]',
    detail: 'text-[#059669]',
  },
  rated: {
    container: 'bg-[#F5F3FF] border-[#C4B5FD]',
    title: 'text-[#6D28D9]',
    detail: 'text-[#7C3AED]',
  },
  skipped: {
    container: 'bg-[#F3F4F6] border-[#D1D5DB]',
    title: 'text-[#4B5563]',
    detail: 'text-[#6B7280]',
  },
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
  const { language, t } = useI18n();
  const { recipe } = meal;
  const kcal = recipe.caloriesPerServing;
  const protein = recipe.proteinPerServingG;
  const cookTime = recipe.cookTimeMinutes;
  const isSkipped = meal.status === 'skipped';
  const statusStyle = STATUS_BUTTON_STYLES[meal.status] ?? STATUS_BUTTON_STYLES.recommended;
  const currentStatusLabel = getMealStatusLabel(language, meal.status);
  const nextStatus = getNextStatus(meal.status);
  const nextStatusLabel = nextStatus ? getMealStatusLabel(language, nextStatus) : null;
  const primaryActionLabel =
    meal.status === 'skipped'
      ? t('meal.undo_skip')
      : meal.status === 'recommended'
      ? t('meal.approve')
      : nextStatusLabel ?? t('meal.skip');

  function handleStatusAction() {
    const actions = [];

    if (meal.status === 'skipped') {
      actions.push({
        text: t('meal.undo_skip'),
        onPress: () => onSkip?.(meal),
      });
    } else {
      if (meal.status === 'recommended') {
        actions.push({
          text: t('meal.approve'),
          onPress: () => onApprove?.(meal),
        });
      } else if (nextStatus && onStatusChange) {
        actions.push({
          text: nextStatusLabel!,
          onPress: () => onStatusChange(meal, nextStatus),
        });
      }

      if (onSkip) {
        actions.push({
          text: t('meal.skip'),
          style: 'destructive' as const,
          onPress: () => onSkip(meal),
        });
      }
    }

    actions.push({ text: t('common.cancel'), style: 'cancel' as const });

    Alert.alert(recipe.title, currentStatusLabel, actions);
  }

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
            {getMealSlotLabel(language, meal.mealSlot)}
          </Text>
          {meal.batchGroup != null && (
            <Text className="text-xs font-semibold text-[#2D6A4F]">
              {t('meal.batch')}
            </Text>
          )}
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
              <MacroPill color="#3B82F6" label={`${protein}g ${t('meal.protein')}`} />
            )}
            {cookTime != null && (
              <Badge label={`${cookTime} ${t('common.minutes_short')}`} variant="muted" />
            )}
            {recipe.estimatedPriceEur != null && (
              <MacroPill color="#059669" label={`€${recipe.estimatedPriceEur.toFixed(2)}`} />
            )}
            {meal.chosenRecipeId && (
              <MacroPill color="#2563EB" label={t('meal.swapped')} />
            )}
          </View>
        )}

        {/* Action buttons */}
        <View className="flex-row gap-2 mt-1">
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              handleStatusAction();
            }}
            className={`flex-1 px-3 py-2 rounded-xl border ${statusStyle.container}`}
          >
            <Text className={`text-xs font-semibold uppercase tracking-wide ${statusStyle.title}`}>
              {currentStatusLabel}
            </Text>
            <Text className={`text-sm font-semibold ${statusStyle.detail}`}>
              {primaryActionLabel}
            </Text>
          </Pressable>
          {onRegenerate && (
            <Pressable
              onPress={(e) => { e.stopPropagation?.(); onRegenerate(meal); }}
              className="px-4 flex-row items-center justify-center gap-1 py-1.5 rounded-xl bg-blue-50 border border-blue-200"
            >
              <Text className="text-xs font-semibold text-blue-600">↻ {t('meal.different')}</Text>
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

function getNextStatus(status: MealStatus): MealStatus | null {
  const currentIndex = STATUS_CYCLE.indexOf(status);
  if (currentIndex === -1 || currentIndex === STATUS_CYCLE.length - 1) {
    return null;
  }

  return STATUS_CYCLE[currentIndex + 1];
}
