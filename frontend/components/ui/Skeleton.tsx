import React, { useEffect } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * Shimmer skeleton for loading states.
 * Uses react-native-reanimated opacity pulse — no external shimmer library needed.
 */
export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 700 }),
        withTiming(1, { duration: 700 }),
      ),
      -1, // infinite
      false,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: '#E5E7EB',
        },
        animStyle,
        style,
      ]}
    />
  );
}

// ─── Preset composite skeletons ───────────────────────────────────────────────

/** Skeleton for a MealSlot card row */
export function MealSlotSkeleton() {
  return (
    <View className="p-4 bg-white rounded-2xl gap-2" style={{ shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }}>
      <Skeleton width="60%" height={18} borderRadius={6} />
      <Skeleton width="40%" height={13} borderRadius={6} />
      <View className="flex-row gap-2 mt-1">
        <Skeleton width={64} height={22} borderRadius={999} />
        <Skeleton width={48} height={22} borderRadius={999} />
      </View>
    </View>
  );
}

/** Skeleton for a full DayCard */
export function DayCardSkeleton() {
  return (
    <View className="gap-2">
      <Skeleton width={100} height={14} borderRadius={6} />
      <MealSlotSkeleton />
    </View>
  );
}

/** Skeleton for the shopping list */
export function ShoppingItemSkeleton() {
  return (
    <View className="flex-row items-center gap-3 py-3">
      <Skeleton width={20} height={20} borderRadius={4} />
      <View className="flex-1 gap-1">
        <Skeleton width="55%" height={14} borderRadius={6} />
        <Skeleton width="30%" height={11} borderRadius={6} />
      </View>
    </View>
  );
}
