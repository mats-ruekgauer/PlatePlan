import React from 'react';
import { Text, View } from 'react-native';

import { Skeleton } from '../ui/Skeleton';
import { useIngredientPricing } from '../../hooks/useIngredientPricing';
import type { Ingredient } from '../../types';

type PriceLabels = {
  title: string;
  subtitle: string;
  total: string;
  matched: string;
  unmatched: string;
  noMatchesTitle: string;
  noMatchesBody: string;
  noPrice: string;
  basedOn: string;
};

export function IngredientPriceBreakdown({
  ingredients,
  labels,
}: {
  ingredients: Ingredient[];
  labels: PriceLabels;
}) {
  const { breakdown, isLoading } = useIngredientPricing(ingredients);

  if (!ingredients.length) {
    return null;
  }

  return (
    <View className="gap-3">
      <View className="gap-1">
        <Text className="text-lg font-bold text-[#1A1A2E]">{labels.title}</Text>
        <Text className="text-sm text-[#6B7280]">{labels.subtitle}</Text>
      </View>

      {isLoading ? (
        <View className="gap-2">
          <Skeleton height={76} borderRadius={18} />
          <Skeleton height={56} borderRadius={18} />
        </View>
      ) : breakdown.matchedCount === 0 ? (
        <View className="rounded-2xl bg-white px-4 py-5 gap-1.5">
          <Text className="text-sm font-semibold text-[#1A1A2E]">{labels.noMatchesTitle}</Text>
          <Text className="text-sm leading-5 text-[#6B7280]">{labels.noMatchesBody}</Text>
        </View>
      ) : (
        <>
          <View className="rounded-2xl bg-[#ECFDF5] px-4 py-4 flex-row items-center justify-between">
            <View className="gap-1">
              <Text className="text-xs font-semibold uppercase tracking-wide text-[#059669]">
                {labels.total}
              </Text>
              <Text className="text-2xl font-bold text-[#065F46]">
                €{breakdown.totalMatchedPriceEur.toFixed(2)}
              </Text>
            </View>
            <View className="items-end gap-1">
              <Text className="text-xs text-[#047857]">
                {breakdown.matchedCount} {labels.matched}
              </Text>
              <Text className="text-xs text-[#6B7280]">
                {breakdown.unmatchedCount} {labels.unmatched}
              </Text>
            </View>
          </View>

          <View
            className="bg-white rounded-2xl overflow-hidden"
            style={{
              shadowColor: '#000',
              shadowOpacity: 0.06,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 1 },
            }}
          >
            {breakdown.rows.map((row, index) => (
              <View key={`${row.ingredient.name}-${index}`}>
                {index > 0 && <View className="h-px bg-gray-100 mx-4" />}
                <View className="px-4 py-3 flex-row items-center justify-between gap-3">
                  <View className="flex-1 gap-0.5">
                    <Text className="text-sm font-medium text-[#1A1A2E] capitalize">
                      {row.ingredient.name}
                    </Text>
                    <Text className="text-xs text-[#6B7280]">
                      {formatIngredientAmount(row.ingredient)}
                    </Text>
                    {row.matchedReceiptItem ? (
                      <Text className="text-xs text-[#9CA3AF]">
                        {labels.basedOn} {row.matchedReceiptItem.itemName}
                      </Text>
                    ) : null}
                  </View>

                  <Text
                    className={`text-sm font-semibold ${
                      row.priceEur != null ? 'text-[#059669]' : 'text-[#9CA3AF]'
                    }`}
                  >
                    {row.priceEur != null ? `€${row.priceEur.toFixed(2)}` : labels.noPrice}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

function formatIngredientAmount(ingredient: Ingredient) {
  const amount =
    ingredient.amount % 1 === 0 ? ingredient.amount.toString() : ingredient.amount.toFixed(1);
  return `${amount} ${ingredient.unit}`;
}
