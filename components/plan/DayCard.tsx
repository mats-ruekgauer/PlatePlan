import React from 'react';
import { Text, View } from 'react-native';

import { MealSlot } from './MealSlot';
import { MealSlotSkeleton } from '../ui/Skeleton';
import type { HydratedMeal } from '../../types';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface DayCardProps {
  dayOfWeek: number; // 0=Monday
  meals: HydratedMeal[];
  isToday?: boolean;
  onLongPressMeal?: (meal: HydratedMeal) => void;
  loading?: boolean;
}

export function DayCard({
  dayOfWeek,
  meals,
  isToday = false,
  onLongPressMeal,
  loading = false,
}: DayCardProps) {
  const dayName = DAY_NAMES[dayOfWeek] ?? `Day ${dayOfWeek}`;

  // Show feedback badge on meals whose mealtime has passed today
  function shouldShowFeedbackBadge(meal: HydratedMeal): boolean {
    if (!isToday) return false;
    const now = new Date();
    if (meal.mealSlot === 'dinner' && now.getHours() >= 19) return true;
    if (meal.mealSlot === 'lunch' && now.getHours() >= 14) return true;
    if (meal.mealSlot === 'breakfast' && now.getHours() >= 10) return true;
    return false;
  }

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
            <Text className="text-xs font-semibold text-[#2D6A4F]">Today</Text>
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
              showFeedbackBadge={shouldShowFeedbackBadge(meal)}
              onLongPress={() => onLongPressMeal?.(meal)}
            />
          ))
        ) : (
          <View className="bg-white rounded-2xl p-4 border border-dashed border-gray-200">
            <Text className="text-sm text-[#9CA3AF] text-center">No meals planned</Text>
          </View>
        )}
      </View>
    </View>
  );
}
