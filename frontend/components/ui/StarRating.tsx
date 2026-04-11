import React from 'react';
import { Pressable, View } from 'react-native';

interface StarRatingProps {
  value: number; // 0–5
  onChange?: (value: number) => void;
  size?: number;
  readonly?: boolean;
}

const STAR_COUNT = 5;

export function StarRating({
  value,
  onChange,
  size = 32,
  readonly = false,
}: StarRatingProps) {
  return (
    <View className="flex-row gap-1">
      {Array.from({ length: STAR_COUNT }, (_, i) => {
        const filled = i < value;
        return (
          <Pressable
            key={i}
            onPress={() => !readonly && onChange?.(i + 1)}
            disabled={readonly}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={`Rate ${i + 1} out of ${STAR_COUNT}`}
          >
            {/* Unicode star — avoids a vector icon dependency for MVP */}
            <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
              {/* Using a View + Text approach so NativeWind colour classes work */}
              <StarSvg filled={filled} size={size} />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Inline SVG star via react-native-svg would be ideal; using text fallback
// for MVP to avoid adding a native dependency.
function StarSvg({ filled, size }: { filled: boolean; size: number }) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  return (
    <Text
      style={{
        fontSize: size * 0.85,
        color: filled ? '#F59E0B' : '#D1D5DB',
        lineHeight: size,
      }}
    >
      {filled ? '★' : '☆'}
    </Text>
  );
}
