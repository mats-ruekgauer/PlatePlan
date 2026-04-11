import React from 'react';
import { Text, View } from 'react-native';

import { ShoppingItem } from './ShoppingItem';
import type { GroupedShoppingList } from '../../types';

interface ShoppingListProps {
  groups: GroupedShoppingList[];
  listId: string;
  planId: string;
  onToggleItem: (itemName: string, unit: string) => void;
}

export function ShoppingList({ groups, onToggleItem }: ShoppingListProps) {
  if (groups.length === 0) {
    return (
      <View className="items-center py-12 gap-2">
        <Text className="text-4xl">🛒</Text>
        <Text className="text-base font-semibold text-[#1A1A2E]">List is empty</Text>
        <Text className="text-sm text-[#6B7280] text-center">
          Generate a plan first to build your shopping list.
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-6">
      {groups.map((group) => (
        <ShoppingGroup
          key={group.shoppingDate}
          group={group}
          onToggleItem={onToggleItem}
        />
      ))}
    </View>
  );
}

function ShoppingGroup({
  group,
  onToggleItem,
}: {
  group: GroupedShoppingList;
  onToggleItem: (itemName: string, unit: string) => void;
}) {
  const totalItems = group.categories.reduce((sum, c) => sum + c.items.length, 0);
  const checkedItems = group.categories.reduce(
    (sum, c) => sum + c.items.filter((i) => i.checked).length,
    0,
  );
  const allDone = totalItems > 0 && checkedItems === totalItems;

  return (
    <View className="gap-3">
      {/* Group header */}
      <View className="flex-row items-center justify-between">
        <Text className="text-base font-bold text-[#1A1A2E]">{group.label}</Text>
        <Text className="text-xs text-[#6B7280]">
          {checkedItems}/{totalItems}
          {allDone ? ' ✓' : ''}
        </Text>
      </View>

      {/* Categories */}
      <View
        className="bg-white rounded-2xl overflow-hidden"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 4,
        }}
      >
        {group.categories.map((cat, catIdx) => (
          <View key={cat.category}>
            {catIdx > 0 && <View className="h-px bg-gray-100 mx-4" />}

            {/* Category label */}
            <View className="px-4 pt-3 pb-1">
              <Text className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide">
                {cat.category}
              </Text>
            </View>

            {/* Items */}
            <View className="px-4">
              {cat.items.map((item, itemIdx) => (
                <View key={`${item.name}-${item.unit}`}>
                  {itemIdx > 0 && <View className="h-px bg-gray-50" />}
                  <ShoppingItem
                    item={item}
                    onToggle={() => onToggleItem(item.name, item.unit)}
                  />
                </View>
              ))}
            </View>
            <View className="h-2" />
          </View>
        ))}
      </View>
    </View>
  );
}
