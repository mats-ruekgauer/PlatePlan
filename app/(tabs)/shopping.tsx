import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { ShoppingItem } from '../../components/shopping/ShoppingItem';
import { useActivePlan } from '../../hooks/usePlan';
import {
  useGenerateShoppingList,
  useShoppingList,
  useToggleShoppingItem,
} from '../../hooks/useShoppingList';
import type { ShoppingItem as ShoppingItemType } from '../../types';

const CATEGORY_ORDER = ['produce', 'meat', 'dairy', 'pantry', 'spice', 'other'];
const CATEGORY_LABELS: Record<string, string> = {
  produce: '🥦 Produce',
  meat: '🥩 Meat & Fish',
  dairy: '🥛 Dairy',
  pantry: '🫙 Pantry',
  spice: '🧂 Spices',
  other: '📦 Other',
};

function normaliseCat(cat?: string): string {
  if (!cat) return 'other';
  return cat;
}

export default function ShoppingScreen() {
  const { data: activePlan } = useActivePlan();
  const { data: list, isLoading } = useShoppingList(activePlan?.id ?? null);
  const generateList = useGenerateShoppingList();
  const toggleItem = useToggleShoppingItem();

  const grouped = useMemo(() => {
    if (!list) return [];
    const map = new Map<string, ShoppingItemType[]>();
    for (const item of list.items) {
      const cat = normaliseCat(item.category);
      const existing = map.get(cat) ?? [];
      existing.push(item);
      map.set(cat, existing);
    }
    return CATEGORY_ORDER
      .filter((cat) => map.has(cat))
      .map((cat) => ({ cat, items: map.get(cat)! }));
  }, [list]);

  const checkedCount = list?.items.filter((i) => i.checked).length ?? 0;
  const totalCount = list?.items.length ?? 0;
  const allDone = totalCount > 0 && checkedCount === totalCount;

  // ── No active plan ────────────────────────────────────────────────────────
  if (!activePlan) {
    return (
      <View className="flex-1 bg-[#F8F9FA] items-center justify-center px-8 gap-4">
        <Text className="text-4xl">🍽️</Text>
        <Text className="text-lg font-bold text-[#1A1A2E] text-center">No meal plan yet</Text>
        <Text className="text-sm text-[#6B7280] text-center">
          Generate a meal plan first, then your shopping list will appear here.
        </Text>
      </View>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View className="flex-1 bg-[#F8F9FA] items-center justify-center">
        <ActivityIndicator color="#2D6A4F" />
      </View>
    );
  }

  // ── No list yet ───────────────────────────────────────────────────────────
  if (!list) {
    return (
      <View className="flex-1 bg-[#F8F9FA] items-center justify-center px-8 gap-4">
        <Text className="text-4xl">🛒</Text>
        <Text className="text-lg font-bold text-[#1A1A2E] text-center">No shopping list yet</Text>
        <Text className="text-sm text-[#6B7280] text-center">
          Generate a list from your current meal plan.
        </Text>
        <TouchableOpacity
          onPress={() => generateList.mutate(activePlan.id)}
          disabled={generateList.isPending}
          className="px-6 py-3 rounded-xl bg-[#2D6A4F] active:opacity-70"
        >
          <Text className="text-white font-semibold">
            {generateList.isPending ? 'Generating…' : 'Generate shopping list'}
          </Text>
        </TouchableOpacity>
        {generateList.isError && (
          <Text className="text-sm text-red-500 text-center">
            Something went wrong. Please try again.
          </Text>
        )}
      </View>
    );
  }

  // ── Shopping list ─────────────────────────────────────────────────────────
  return (
    <View className="flex-1 bg-[#F8F9FA]">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pt-14 pb-8 gap-5"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold text-[#1A1A2E]">Shopping</Text>
            <Text className="text-sm text-[#6B7280]">
              {allDone ? 'All done! ✓' : `${checkedCount} of ${totalCount} items`}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => generateList.mutate(activePlan.id)}
            disabled={generateList.isPending}
            className="px-4 py-2 rounded-xl bg-[#D8F3DC] active:opacity-70"
          >
            <Text className="text-sm font-semibold text-[#2D6A4F]">
              {generateList.isPending ? 'Refreshing…' : 'Refresh'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* All done banner */}
        {allDone && (
          <View className="bg-[#D8F3DC] border border-[#52B788] rounded-xl px-4 py-3">
            <Text className="text-sm font-semibold text-[#2D6A4F] text-center">
              🎉 You have everything you need!
            </Text>
          </View>
        )}

        {/* Grouped items */}
        {grouped.map(({ cat, items }) => (
          <View key={cat} className="gap-2">
            <Text className="text-sm font-bold text-[#6B7280] uppercase tracking-wide">
              {CATEGORY_LABELS[cat] ?? cat}
            </Text>
            <View
              className="bg-white rounded-2xl overflow-hidden"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
              }}
            >
              {items.map((item, idx) => (
                <View key={`${item.name}-${idx}`}>
                  {idx > 0 && <View className="h-px bg-gray-100 mx-4" />}
                  <ShoppingItem
                    item={item}
                    onToggle={() =>
                      toggleItem.mutate({ listId: list.id, itemName: item.name })
                    }
                  />
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
