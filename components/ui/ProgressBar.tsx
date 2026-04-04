import React from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

interface Segment {
  /** 0–1 fraction of the total bar */
  fraction: number;
  color: string;
}

interface ProgressBarProps {
  /** Pass a single `value` (0–1) for a simple single-color bar */
  value?: number;
  color?: string;
  /** Or pass multiple segments for a stacked macro bar */
  segments?: Segment[];
  height?: number;
  animated?: boolean;
}

/**
 * Dual-mode progress bar:
 * - Single value: simple filled bar (e.g., onboarding step progress)
 * - Segments: stacked macro bar (kcal / protein / carbs / fat)
 */
export function ProgressBar({
  value,
  color = '#2D6A4F',
  segments,
  height = 8,
  animated = true,
}: ProgressBarProps) {
  if (segments) {
    return (
      <View
        className="w-full flex-row overflow-hidden rounded-full"
        style={{ height }}
      >
        {segments.map((seg, i) => (
          <SegmentBar key={i} segment={seg} animated={animated} />
        ))}
        {/* Remaining empty space */}
        <View className="flex-1 bg-gray-100" />
      </View>
    );
  }

  const clamped = Math.min(1, Math.max(0, value ?? 0));
  return (
    <View
      className="w-full bg-gray-100 overflow-hidden rounded-full"
      style={{ height }}
    >
      <SingleBar fraction={clamped} color={color} animated={animated} />
    </View>
  );
}

// ─── Internal animated pieces ─────────────────────────────────────────────────

function SingleBar({
  fraction,
  color,
  animated: shouldAnimate,
}: {
  fraction: number;
  color: string;
  animated: boolean;
}) {
  const progress = useSharedValue(shouldAnimate ? 0 : fraction);

  React.useEffect(() => {
    progress.value = withTiming(fraction, { duration: 600 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fraction]);

  const animStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <Animated.View
      style={[animStyle, { backgroundColor: color, height: '100%', borderRadius: 999 }]}
    />
  );
}

function SegmentBar({
  segment,
  animated: shouldAnimate,
}: {
  segment: Segment;
  animated: boolean;
}) {
  const progress = useSharedValue(shouldAnimate ? 0 : segment.fraction);

  React.useEffect(() => {
    progress.value = withTiming(segment.fraction, { duration: 600 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segment.fraction]);

  const animStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <Animated.View
      style={[animStyle, { backgroundColor: segment.color, height: '100%' }]}
    />
  );
}
