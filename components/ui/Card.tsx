import React from 'react';
import { View, type ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  /** Extra Tailwind classes to merge in */
  className?: string;
  /** Reduce padding for compact contexts */
  compact?: boolean;
}

/**
 * Base surface card: white, rounded-2xl, iOS shadow.
 * All other card-like components in the app should build on this.
 */
export function Card({ children, className = '', compact = false, style, ...rest }: CardProps) {
  return (
    <View
      {...rest}
      style={[
        {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.07,
          shadowRadius: 6,
        },
        style,
      ]}
      className={[
        'bg-white rounded-2xl',
        compact ? 'p-3' : 'p-4',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </View>
  );
}
