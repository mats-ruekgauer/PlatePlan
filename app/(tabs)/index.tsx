import React, { useState } from 'react';
import {
  Alert,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { DayCard } from '../../components/plan/DayCard';
import { MealSwapper } from '../../components/plan/MealSwapper';
import { DayCardSkeleton } from '../../components/ui/Skeleton';
import {
  useGeneratePlan,
  usePlanForWeek,
  useRegenerateMeal,
  useUpdateMealStatus,
} from '../../hooks/usePlan';
import { useGenerateShoppingList } from '../../hooks/useShoppingList';
import type { HydratedMeal, MealStatus } from '../../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getThisMonday(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split('T')[0];
}

function shiftWeek(weekStart: string, delta: -1 | 1): string {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + delta * 7);
  return d.toISOString().split('T')[0];
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
  const jsDay = new Date().getDay(); // 0=Sun
  return jsDay === 0 ? 6 : jsDay - 1;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MealPlanScreen() {
  const [viewingWeekStart, setViewingWeekStart] = useState(getThisMonday());
  const [atTop, setAtTop] = useState(true);
  const [atBottom, setAtBottom] = useState(false);
  const [swappingMeal, setSwappingMeal] = useState<HydratedMeal | null>(null);

  const { data: plan, isLoading, refetch, isRefetching } = usePlanForWeek(viewingWeekStart);
  const generatePlan = useGeneratePlan();
  const generateList = useGenerateShoppingList();
  const updateStatus = useUpdateMealStatus();
  const regenerateMeal = useRegenerateMeal();

  const todayIndex = todayDayOfWeek();
  const isCurrentWeek = viewingWeekStart === getThisMonday();
  const nextWeekStart = shiftWeek(viewingWeekStart, 1);
  const prevWeekStart = shiftWeek(viewingWeekStart, -1);

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const y = e.nativeEvent.contentOffset.y;
    const contentH = e.nativeEvent.contentSize.height;
    const viewH = e.nativeEvent.layoutMeasurement.height;
    setAtTop(y < 40);
    setAtBottom(y + viewH >= contentH - 40);
  }

  function handleRegenerate() {
    Alert.alert(
      'Regenerate plan',
      "This will replace this week's meals with a new AI-generated plan. Continue?",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          style: 'destructive',
          onPress: () =>
            generatePlan.mutate(viewingWeekStart, {
              onSuccess: (result) => {
                if (result?.planId) generateList.mutate(result.planId);
              },
            }),
        },
      ],
    );
  }

  function handleStatusChange(meal: HydratedMeal, newStatus: MealStatus) {
    updateStatus.mutate({ plannedMealId: meal.id, status: newStatus });
  }

  function handleApprove(meal: HydratedMeal) {
    updateStatus.mutate({ plannedMealId: meal.id, status: 'planned' });
  }

  function handleSkip(meal: HydratedMeal) {
    const newStatus = meal.status === 'skipped' ? 'recommended' : 'skipped';
    updateStatus.mutate({ plannedMealId: meal.id, status: newStatus });
  }

  function handleRegenerateMeal(meal: HydratedMeal) {
    regenerateMeal.mutate(meal.id);
  }

  function handlePlanNextWeek() {
    generatePlan.mutate(nextWeekStart, {
      onSuccess: (result) => {
        if (result?.planId) generateList.mutate(result.planId);
        setViewingWeekStart(nextWeekStart);
      },
    });
  }

  return (
    <View className="flex-1 bg-[#F8F9FA]">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pt-14 pb-8 gap-5"
        scrollEventThrottle={100}
        onScroll={handleScroll}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#2D6A4F" />
        }
      >
        {/* Previous week button — shown when scrolled to top */}
        {atTop && (
          <TouchableOpacity
            onPress={() => setViewingWeekStart(prevWeekStart)}
            className="items-center py-2"
          >
            <Text className="text-sm font-semibold text-[#2D6A4F]">← Previous week</Text>
          </TouchableOpacity>
        )}

        {/* Header */}
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-2xl font-bold text-[#1A1A2E]">Meal Plan</Text>
              {!isCurrentWeek && (
                <TouchableOpacity onPress={() => setViewingWeekStart(getThisMonday())}>
                  <Text className="text-sm font-semibold text-[#2D6A4F]">← Today</Text>
                </TouchableOpacity>
              )}
            </View>
            {plan && (
              <Text className="text-sm text-[#6B7280]">
                {formatWeekRange(plan.weekStart)}
              </Text>
            )}
            {!plan && !isLoading && (
              <Text className="text-sm text-[#6B7280]">
                {formatWeekRange(viewingWeekStart)}
              </Text>
            )}
          </View>
          {plan && (
            <TouchableOpacity
              onPress={handleRegenerate}
              disabled={generatePlan.isPending}
              className="px-4 py-2 rounded-xl bg-[#D8F3DC] active:opacity-70"
            >
              <Text className="text-sm font-semibold text-[#2D6A4F]">
                {generatePlan.isPending ? 'Generating…' : 'Regenerate'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Generation / regeneration error */}
        {(generatePlan.isError || regenerateMeal.isError) && (
          <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <Text className="text-sm text-red-600">
              {regenerateMeal.isError
                ? 'Failed to regenerate meal. Please try again.'
                : 'Failed to generate plan. Please try again.'}
            </Text>
          </View>
        )}

        {/* Regenerating single meal indicator */}
        {regenerateMeal.isPending && (
          <View className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
            <Text className="text-sm text-blue-600">Finding a different meal…</Text>
          </View>
        )}

        {/* Day cards */}
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <DayCardSkeleton key={i} />)
        ) : plan ? (
          plan.days.map(({ dayOfWeek, meals }) => (
            <DayCard
              key={dayOfWeek}
              dayOfWeek={dayOfWeek}
              meals={meals}
              isToday={isCurrentWeek && dayOfWeek === todayIndex}
              onLongPressMeal={(meal) => setSwappingMeal(meal)}
              onStatusChange={handleStatusChange}
              onApprove={handleApprove}
              onSkip={handleSkip}
              onRegenerate={handleRegenerateMeal}
            />
          ))
        ) : (
          <EmptyState
            onGenerate={() =>
              generatePlan.mutate(viewingWeekStart, {
                onSuccess: (result) => {
                  if (result?.planId) generateList.mutate(result.planId);
                },
              })
            }
            isGenerating={generatePlan.isPending}
          />
        )}

        {/* Next week button — shown when scrolled to bottom */}
        {atBottom && (
          <TouchableOpacity
            onPress={plan ? () => setViewingWeekStart(nextWeekStart) : handlePlanNextWeek}
            disabled={generatePlan.isPending}
            className="items-center py-3 rounded-xl bg-[#D8F3DC] active:opacity-70"
          >
            <Text className="text-sm font-semibold text-[#2D6A4F]">
              {generatePlan.isPending
                ? 'Generating…'
                : plan
                ? 'Next week →'
                : 'Plan next week →'}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Meal swap bottom sheet */}
      <MealSwapper meal={swappingMeal} onClose={() => setSwappingMeal(null)} />
    </View>
  );
}

function EmptyState({
  onGenerate,
  isGenerating,
}: {
  onGenerate: () => void;
  isGenerating: boolean;
}) {
  return (
    <View className="flex-1 items-center justify-center gap-4 py-16">
      <Text className="text-5xl">🍽️</Text>
      <Text className="text-xl font-bold text-[#1A1A2E]">No plan yet</Text>
      <Text className="text-sm text-[#6B7280] text-center px-8">
        Tap below to generate a weekly meal plan.
      </Text>
      <TouchableOpacity
        onPress={onGenerate}
        disabled={isGenerating}
        className="px-6 py-3 rounded-xl bg-[#2D6A4F] active:opacity-70"
      >
        <Text className="text-white font-semibold">
          {isGenerating ? 'Generating…' : 'Generate plan'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
