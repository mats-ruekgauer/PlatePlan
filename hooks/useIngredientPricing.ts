import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import {
  getCurrentUserId,
  mapReceiptItem,
  supabase,
} from '../lib/supabase';
import type { Ingredient, ReceiptItem } from '../types';

export interface IngredientPriceRow {
  ingredient: Ingredient;
  matchedReceiptItem: ReceiptItem | null;
  priceEur: number | null;
  matchType: 'exact' | 'partial' | 'none';
}

export interface IngredientPriceBreakdown {
  rows: IngredientPriceRow[];
  totalMatchedPriceEur: number;
  matchedCount: number;
  unmatchedCount: number;
}

export const ingredientPricingKeys = {
  all: ['ingredient-pricing'] as const,
  receiptItems: () => [...ingredientPricingKeys.all, 'receipt-items'] as const,
};

export function normalizePriceMatchText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getMatchScore(ingredientName: string, receiptItemName: string): number {
  const ingredient = normalizePriceMatchText(ingredientName);
  const receipt = normalizePriceMatchText(receiptItemName);

  if (!ingredient || !receipt) return 0;
  if (ingredient === receipt) return 100;
  if (receipt.includes(ingredient) || ingredient.includes(receipt)) return 80;

  const ingredientTokens = ingredient.split(' ').filter(Boolean);
  const receiptTokens = receipt.split(' ').filter(Boolean);
  const overlap = ingredientTokens.filter((token) => receiptTokens.includes(token));

  if (overlap.length === 0) return 0;

  const coverage = overlap.length / ingredientTokens.length;
  return Math.round(coverage * 60);
}

export function buildIngredientPriceBreakdown(
  ingredients: Ingredient[],
  receiptItems: ReceiptItem[],
): IngredientPriceBreakdown {
  const usedReceiptItemIds = new Set<string>();

  const rows = ingredients.map((ingredient) => {
    let bestMatch: ReceiptItem | null = null;
    let bestScore = 0;

    for (const receiptItem of receiptItems) {
      if (usedReceiptItemIds.has(receiptItem.id) || receiptItem.priceEur == null) {
        continue;
      }

      const score = getMatchScore(ingredient.name, receiptItem.itemName);
      if (score > bestScore) {
        bestMatch = receiptItem;
        bestScore = score;
      }
    }

    if (bestMatch && bestScore >= 40) {
      usedReceiptItemIds.add(bestMatch.id);
      return {
        ingredient,
        matchedReceiptItem: bestMatch,
        priceEur: bestMatch.priceEur,
        matchType: bestScore >= 100 ? 'exact' : 'partial',
      } satisfies IngredientPriceRow;
    }

    return {
      ingredient,
      matchedReceiptItem: null,
      priceEur: null,
      matchType: 'none',
    } satisfies IngredientPriceRow;
  });

  const totalMatchedPriceEur = rows.reduce(
    (sum, row) => sum + (row.priceEur ?? 0),
    0,
  );
  const matchedCount = rows.filter((row) => row.priceEur != null).length;

  return {
    rows,
    totalMatchedPriceEur,
    matchedCount,
    unmatchedCount: rows.length - matchedCount,
  };
}

export function useIngredientPricing(ingredients: Ingredient[]) {
  const receiptItemsQuery = useQuery({
    queryKey: ingredientPricingKeys.receiptItems(),
    queryFn: async (): Promise<ReceiptItem[]> => {
      const userId = await getCurrentUserId();
      const { data, error } = await supabase
        .from('receipt_items')
        .select('*')
        .eq('user_id', userId)
        .not('price_eur', 'is', null)
        .order('purchased_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      return (data ?? []).map(mapReceiptItem);
    },
    staleTime: 1000 * 60 * 10,
  });

  const breakdown = useMemo(
    () => buildIngredientPriceBreakdown(ingredients, receiptItemsQuery.data ?? []),
    [ingredients, receiptItemsQuery.data],
  );

  return {
    ...receiptItemsQuery,
    breakdown,
  };
}
