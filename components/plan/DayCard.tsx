import React from 'react';
import { Text, View } from 'react-native';

import { useI18n, getWeekdayName } from '../../lib/i18n';
import { MealSlot } from './MealSlot';
import { MealSlotSkeleton } from '../ui/Skeleton';
import type { HydratedMeal, MealStatus } from '../../types';

interface DayCardProps {
  dayOfWeek: number; // 0=Monday
  meals: HydratedMeal[];
  isToday?: boolean;
  onLongPressMeal?: (meal: HydratedMeal) => void;
  onStatusChange?: (meal: HydratedMeal, newStatus: MealStatus) => void;
  onApprove?: (meal: HydratedMeal) => void;
  onSkip?: (meal: HydratedMeal) => void;
  onRegenerate?: (meal: HydratedMeal) => void;
  loading?: boolean;
}

export function DayCard({
  dayOfWeek,
  meals,
  isToday = false,
  onLongPressMeal,
  onStatusChange,
  onApprove,
  onSkip,
  onRegenerate,
  loading = false,
}: DayCardProps) {
  const { language, t } = useI18n();
  const dayName = getWeekdayName(language, dayOfWeek, 'long');

  return (
    <View className="gap-2">
      {/* Day header */}
      <View className="flex-row items-center gap-2">
        <Text
          className={`text-sm font-bold ${
            isToday ? 'text-[#2D6A4F]' : 'text-[#6B7280]'
          }`}
        >
          {dayName}
        </Text>
        {isToday && (
          <View className="px-2 py-0.5 rounded-full bg-[#D8F3DC]">
            <Text className="text-xs font-semibold text-[#2D6A4F]">{t('day.today')}</Text>
          </View>
        )}
      </View>

      {/* Meals */}
      <View className="gap-2">
        {loading ? (
          <MealSlotSkeleton />
        ) : meals.length > 0 ? (
          meals.map((meal) => (
            <MealSlot
              key={meal.id}
              meal={meal}
              onLongPress={() => onLongPressMeal?.(meal)}
              onStatusChange={onStatusChange}
              onApprove={onApprove}
              onSkip={onSkip}
              onRegenerate={onRegenerate}
            />
          ))
        ) : (
          <View className="bg-white rounded-2xl p-4 border border-dashed border-gray-200">
            <Text className="text-sm text-[#9CA3AF] text-center">{t('day.no_meals_planned')}</Text>
          </View>
        )}
      </View>
    </View>
  );
}
