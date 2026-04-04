import React, { useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { DayCard } from '../../components/plan/DayCard';
import { MealSwapper } from '../../components/plan/MealSwapper';
import { DayCardSkeleton } from '../../components/ui/Skeleton';
import { useHydratedActivePlan, useGeneratePlan } from '../../hooks/usePlan';
import type { HydratedMeal } from '../../types';

function getThisMonday(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split('T')[0];
}

function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart);
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  return `${fmt(start)} — ${fmt(end)}`;
}

function todayDayOfWeek(): number {
  // Returns 0=Monday … 6=Sunday
  const jsDay = new Date().getDay(); // 0=Sun
  return jsDay === 0 ? 6 : jsDay - 1;
}

export default function ThisWeekScreen() {
  const { data: plan, isLoading, refetch, isRefetching } = useHydratedActivePlan();
  const generatePlan = useGeneratePlan();
  const [swappingMeal, setSwappingMeal] = useState<HydratedMeal | null>(null);

  const todayIndex = todayDayOfWeek();

  function handleRegenerate() {
    Alert.alert(
      'Regenerate plan',
      'This will replace your current week\'s meals with a new AI-generated plan. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          style: 'destructive',
          onPress: () => generatePlan.mutate(getThisMonday()),
        },
      ],
    );
  }

  return (
    <View className="flex-1 bg-[#F8F9FA]">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pt-14 pb-8 gap-5"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#2D6A4F" />
        }
      >
        {/* Header */}
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold text-[#1A1A2E]">This Week</Text>
            {plan && (
              <Text className="text-sm text-[#6B7280]">
                {formatWeekRange(plan.weekStart)}
              </Text>
            )}
          </View>
          <TouchableOpacity
            onPress={handleRegenerate}
            disabled={generatePlan.isPending}
            className="px-4 py-2 rounded-xl bg-[#D8F3DC] active:opacity-70"
          >
            <Text className="text-sm font-semibold text-[#2D6A4F]">
              {generatePlan.isPending ? 'Generating…' : 'Regenerate'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Generation error */}
        {generatePlan.isError && (
          <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <Text className="text-sm text-red-600">
              Failed to generate plan. Please try again.
            </Text>
          </View>
        )}

        {/* Day cards */}
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <DayCardSkeleton key={i} />
          ))
        ) : plan ? (
          plan.days.map(({ dayOfWeek, meals }) => (
            <DayCard
              key={dayOfWeek}
              dayOfWeek={dayOfWeek}
              meals={meals}
              isToday={dayOfWeek === todayIndex}
              onLongPressMeal={(meal) => setSwappingMeal(meal)}
            />
          ))
        ) : (
          <EmptyState onGenerate={() => generatePlan.mutate(getThisMonday())} />
        )}
      </ScrollView>

      {/* Meal swap bottom sheet */}
      <MealSwapper
        meal={swappingMeal}
        onClose={() => setSwappingMeal(null)}
      />
    </View>
  );
}

function EmptyState({ onGenerate }: { onGenerate: () => void }) {
  return (
    <View className="flex-1 items-center justify-center gap-4 py-16">
      <Text className="text-5xl">🍽️</Text>
      <Text className="text-xl font-bold text-[#1A1A2E]">No plan yet</Text>
      <Text className="text-sm text-[#6B7280] text-center px-8">
        Tap below to generate your first weekly meal plan.
      </Text>
      <TouchableOpacity
        onPress={onGenerate}
        className="px-6 py-3 rounded-xl bg-[#2D6A4F]"
      >
        <Text className="text-white font-semibold">Generate plan</Text>
      </TouchableOpacity>
    </View>
  );
}
