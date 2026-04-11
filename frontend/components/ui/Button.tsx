import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  type PressableProps,
} from 'react-native';

import { colors } from '../../constants/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, { container: string; text: string }> = {
  primary: {
    container: 'bg-[#2D6A4F] rounded-xl active:opacity-80',
    text: 'text-white font-semibold',
  },
  secondary: {
    container: 'bg-[#D8F3DC] rounded-xl active:opacity-80',
    text: 'text-[#2D6A4F] font-semibold',
  },
  ghost: {
    container: 'bg-transparent rounded-xl active:opacity-60',
    text: 'text-[#2D6A4F] font-semibold',
  },
  danger: {
    container: 'bg-[#DC2626] rounded-xl active:opacity-80',
    text: 'text-white font-semibold',
  },
};

const sizeClasses: Record<Size, { container: string; text: string }> = {
  sm: { container: 'h-9 px-4', text: 'text-sm' },
  md: { container: 'h-11 px-5', text: 'text-base' },
  lg: { container: 'h-[52px] px-6', text: 'text-lg' },
};

export function Button({
  label,
  variant = 'primary',
  size = 'lg',
  loading = false,
  fullWidth = true,
  disabled,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const v = variantClasses[variant];
  const s = sizeClasses[size];

  return (
    <Pressable
      {...rest}
      disabled={isDisabled}
      className={[
        'flex-row items-center justify-center',
        v.container,
        s.container,
        fullWidth ? 'w-full' : 'self-start',
        isDisabled ? 'opacity-50' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'danger' ? '#fff' : colors.primary}
        />
      ) : (
        <Text className={[v.text, s.text].join(' ')}>{label}</Text>
      )}
    </Pressable>
  );
}
