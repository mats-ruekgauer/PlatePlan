import React from 'react';
import { Text, View } from 'react-native';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  /** Render a small dot before the label */
  dot?: boolean;
}

const variantClasses: Record<BadgeVariant, { container: string; text: string; dot: string }> = {
  default: {
    container: 'bg-[#D8F3DC]',
    text: 'text-[#2D6A4F]',
    dot: 'bg-[#2D6A4F]',
  },
  success: {
    container: 'bg-green-100',
    text: 'text-green-700',
    dot: 'bg-green-600',
  },
  warning: {
    container: 'bg-amber-100',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
  },
  danger: {
    container: 'bg-red-100',
    text: 'text-red-600',
    dot: 'bg-red-500',
  },
  info: {
    container: 'bg-blue-100',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
  },
  muted: {
    container: 'bg-gray-100',
    text: 'text-gray-500',
    dot: 'bg-gray-400',
  },
};

export function Badge({ label, variant = 'default', dot = false }: BadgeProps) {
  const v = variantClasses[variant];

  return (
    <View className={`flex-row items-center self-start px-2 py-0.5 rounded-full ${v.container}`}>
      {dot && <View className={`w-1.5 h-1.5 rounded-full mr-1 ${v.dot}`} />}
      <Text className={`text-xs font-medium ${v.text}`}>{label}</Text>
    </View>
  );
}
