import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { ShoppingItem } from './ShoppingItem';
import {
  useGenerateShoppingList,
  useShoppingList,
  useToggleShoppingItem,
} from '../../hooks/useShoppingList';
import { getShoppingCategoryLabel, useI18n } from '../../lib/i18n';
import type { ShoppingItem as ShoppingItemType } from '../../types';

const CATEGORY_ORDER = ['produce', 'meat', 'dairy', 'pantry', 'spice', 'other'];

function normaliseCat(cat?: string): string {
  return cat ?? 'other';
}

interface ShoppingSectionProps {
  planId?: string;
  variant?: 'embedded' | 'screen';
}

export function ShoppingSection({
  planId,
  variant = 'embedded',
}: ShoppingSectionProps) {
  const { t, language } = useI18n();
  const { data: list, isLoading } = useShoppingList(planId);
  const generateList = useGenerateShoppingList();
  const toggleItem = useToggleShoppingItem();

  const grouped = useMemo(() => {
    if (!list) return [];

    const map = new Map<string, ShoppingItemType[]>();
    for (const item of list.items) {
      const category = normaliseCat(item.category);
      const existing = map.get(category) ?? [];
      existing.push(item);
      map.set(category, existing);
    }

    return CATEGORY_ORDER
      .filter((category) => map.has(category))
      .map((category) => ({ category, items: map.get(category)! }));
  }, [list]);

  const checkedCount = list?.items.filter((item) => item.checked).length ?? 0;
  const totalCount = list?.items.length ?? 0;
  const allDone = totalCount > 0 && checkedCount === totalCount;
  const isEmbedded = variant === 'embedded';

  if (!planId) {
    if (isEmbedded) return null;

    return (
      <View className="flex-1 bg-[#F8F9FA] items-center justify-center px-8 gap-4">
        <Text className="text-4xl">🍽️</Text>
        <Text className="text-lg font-bold text-[#1A1A2E] text-center">
          {t('shopping.no_meal_plan_yet')}
        </Text>
        <Text className="text-sm text-[#6B7280] text-center">
          {t('shopping.generate_plan_first')}
        </Text>
      </View>
    );
  }

  if (isLoading) {
    if (isEmbedded) {
      return (
        <SectionCard className="items-center py-8">
          <ActivityIndicator color="#2D6A4F" />
        </SectionCard>
      );
    }

    return (
      <View className="flex-1 bg-[#F8F9FA] items-center justify-center">
        <ActivityIndicator color="#2D6A4F" />
      </View>
    );
  }

  const content = !list ? (
    <SectionCard className="items-center py-8 px-5 gap-3">
      <Text className="text-3xl">🛒</Text>
      <Text className="text-base font-semibold text-[#1A1A2E] text-center">
        {t('shopping.no_list_yet')}
      </Text>
      <Text className="text-sm text-[#6B7280] text-center">
        {t('shopping.generate_from_plan')}
      </Text>
      <TouchableOpacity
        onPress={() => generateList.mutate(planId)}
        disabled={generateList.isPending}
        className="px-4 py-2 rounded-xl bg-[#2D6A4F] active:opacity-70"
      >
        <Text className="text-white font-semibold">
          {generateList.isPending ? t('common.generating') : t('shopping.generate_list')}
        </Text>
      </TouchableOpacity>
      {generateList.isError && (
        <Text className="text-sm text-red-500 text-center">
          {t('auth.please_try_again')}
        </Text>
      )}
    </SectionCard>
  ) : (
    <View className="gap-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-xl font-bold text-[#1A1A2E]">{t('tabs.shopping')}</Text>
          <Text className="text-sm text-[#6B7280]">
            {allDone
              ? t('shopping.all_done')
              : t('shopping.items_progress', { checked: checkedCount, total: totalCount })}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => generateList.mutate(planId)}
          disabled={generateList.isPending}
          className="px-4 py-2 rounded-xl bg-[#D8F3DC] active:opacity-70"
        >
          <Text className="text-sm font-semibold text-[#2D6A4F]">
            {generateList.isPending ? t('shopping.refreshing') : t('common.refresh')}
          </Text>
        </TouchableOpacity>
      </View>

      {allDone && (
        <View className="bg-[#D8F3DC] border border-[#52B788] rounded-xl px-4 py-3">
          <Text className="text-sm font-semibold text-[#2D6A4F] text-center">
            🎉 {t('shopping.banner_done')}
          </Text>
        </View>
      )}

      {grouped.map(({ category, items }) => (
        <View key={category} className="gap-2">
          <Text className="text-sm font-bold text-[#6B7280] uppercase tracking-wide">
            {getShoppingCategoryLabel(language, category)}
          </Text>
          <SectionCard className="overflow-hidden">
            {items.map((item, index) => (
              <View key={`${item.name}-${item.unit}-${index}`}>
                {index > 0 && <View className="h-px bg-gray-100 mx-4" />}
                <ShoppingItem
                  item={item}
                  onToggle={() =>
                    toggleItem.mutate({
                      listId: list.id,
                      planId,
                      itemName: item.name,
                      unit: item.unit,
                    })
                  }
                />
              </View>
            ))}
          </SectionCard>
        </View>
      ))}
    </View>
  );

  if (isEmbedded) {
    return content;
  }

  return (
    <View className="flex-1 bg-[#F8F9FA]">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pt-14 pb-8 gap-5"
      >
        {content}
      </ScrollView>
    </View>
  );
}

function SectionCard({
  children,
  className = '',
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <View
      className={`bg-white rounded-2xl ${className}`.trim()}
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      }}
    >
      {children}
    </View>
  );
}
