import React from 'react';
import { Pressable, Text, View } from 'react-native';

import type { ShoppingItem as ShoppingItemType } from '../../types';

interface ShoppingItemProps {
  item: ShoppingItemType;
  onToggle: () => void;
}

export function ShoppingItem({ item, onToggle }: ShoppingItemProps) {
  const amountLabel = `${item.amount % 1 === 0 ? item.amount : item.amount.toFixed(1)} ${item.unit}`;

  return (
    <Pressable
      onPress={onToggle}
      className="flex-row items-center gap-3 py-3 active:opacity-70"
    >
      {/* Checkbox */}
      <View
        className={[
          'w-5 h-5 rounded border-2 items-center justify-center flex-shrink-0',
          item.checked ? 'bg-[#2D6A4F] border-[#2D6A4F]' : 'border-gray-300',
        ].join(' ')}
      >
        {item.checked && (
          <Text className="text-white text-xs font-bold">✓</Text>
        )}
      </View>

      {/* Item info */}
      <View className="flex-1">
        <Text
          className={`text-sm font-medium ${
            item.checked ? 'text-[#9CA3AF] line-through' : 'text-[#1A1A2E]'
          }`}
        >
          {item.name}
        </Text>
        {item.forMeals && item.forMeals.length > 0 && (
          <Text className="text-xs text-[#9CA3AF]" numberOfLines={1}>
            {item.forMeals.join(', ')}
          </Text>
        )}
      </View>

      {/* Amount */}
      <Text
        className={`text-sm ${item.checked ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}
      >
        {amountLabel}
      </Text>
    </Pressable>
  );
}
