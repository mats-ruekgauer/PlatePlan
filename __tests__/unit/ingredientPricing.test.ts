jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

import {
  buildIngredientPriceBreakdown,
  normalizePriceMatchText,
} from '../../hooks/useIngredientPricing';
import type { Ingredient, ReceiptItem } from '../../types';

function ingredient(name: string, amount = 1, unit = 'pcs'): Ingredient {
  return { name, amount, unit };
}

function receiptItem(
  id: string,
  itemName: string,
  priceEur: number,
): ReceiptItem {
  return {
    id,
    userId: 'user-1',
    receiptImageUrl: null,
    itemName,
    priceEur,
    supermarket: null,
    purchasedAt: '2026-04-10',
    createdAt: '2026-04-10T12:00:00Z',
  };
}

describe('ingredient pricing helpers', () => {
  it('normalizes strings for fuzzy ingredient matching', () => {
    expect(normalizePriceMatchText('Crème-Fraîche!')).toBe('creme fraiche');
  });

  it('matches exact and partial ingredient names to receipt items', () => {
    const breakdown = buildIngredientPriceBreakdown(
      [ingredient('Tomato'), ingredient('Olive oil')],
      [
        receiptItem('1', 'tomato', 1.29),
        receiptItem('2', 'extra virgin olive oil', 4.99),
      ],
    );

    expect(breakdown.rows[0].priceEur).toBe(1.29);
    expect(breakdown.rows[0].matchType).toBe('exact');
    expect(breakdown.rows[1].priceEur).toBe(4.99);
    expect(breakdown.rows[1].matchType).toBe('partial');
    expect(breakdown.totalMatchedPriceEur).toBeCloseTo(6.28);
  });

  it('does not reuse the same receipt item for multiple ingredients', () => {
    const breakdown = buildIngredientPriceBreakdown(
      [ingredient('Tomato'), ingredient('Tomatoes')],
      [receiptItem('1', 'tomatoes', 2.49)],
    );

    const matchedRows = breakdown.rows.filter((row) => row.priceEur != null);
    expect(matchedRows).toHaveLength(1);
    expect(breakdown.unmatchedCount).toBe(1);
  });
});
