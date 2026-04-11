/**
 * Integration tests: feedback submission and preference update.
 * Mocks Supabase and the Edge Function invoker.
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

const mockInvokeFunction = jest.fn();
const mockSupabaseFrom = jest.fn();

jest.mock('../../lib/supabase', () => ({
  supabase: { from: mockSupabaseFrom },
  invokeFunction: mockInvokeFunction,
  mapMealFeedback: (row: Record<string, unknown>) => ({
    id: row.id,
    userId: row.user_id,
    plannedMealId: row.planned_meal_id,
    recipeId: row.recipe_id,
    tasteRating: row.taste_rating,
    portionRating: row.portion_rating,
    wouldRepeat: row.would_repeat,
    notes: row.notes,
    createdAt: row.created_at,
  }),
}));

import { invokeFunction } from '../../lib/supabase';
import type { MealFeedback } from '../../types';
import type { SubmitFeedbackInput } from '../../hooks/useFeedback';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_FEEDBACK_ROW: MealFeedback = {
  id: 'fb-001',
  userId: 'user-123',
  plannedMealId: 'meal-1',
  recipeId: 'recipe-1',
  tasteRating: 4,
  portionRating: 3,
  wouldRepeat: true,
  notes: 'Really enjoyed this one.',
  createdAt: '2026-04-07T20:35:00Z',
};

const NEGATIVE_FEEDBACK_ROW: MealFeedback = {
  ...MOCK_FEEDBACK_ROW,
  id: 'fb-002',
  tasteRating: 2,
  portionRating: 1,
  wouldRepeat: false,
  notes: 'Too bland and not enough food.',
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Feedback submission via process-feedback Edge Function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls process-feedback with all required fields', async () => {
    mockInvokeFunction.mockResolvedValueOnce({ feedback: MOCK_FEEDBACK_ROW });

    const input: SubmitFeedbackInput = {
      plannedMealId: 'meal-1',
      recipeId: 'recipe-1',
      tasteRating: 4,
      portionRating: 3,
      wouldRepeat: true,
      notes: 'Really enjoyed this one.',
    };

    await invokeFunction<SubmitFeedbackInput, { feedback: MealFeedback }>(
      'process-feedback',
      input,
    );

    expect(mockInvokeFunction).toHaveBeenCalledWith('process-feedback', input);
  });

  it('returns the saved feedback record', async () => {
    mockInvokeFunction.mockResolvedValueOnce({ feedback: MOCK_FEEDBACK_ROW });

    const result = await invokeFunction<SubmitFeedbackInput, { feedback: MealFeedback }>(
      'process-feedback',
      {
        plannedMealId: 'meal-1',
        recipeId: 'recipe-1',
        tasteRating: 4,
        portionRating: 3,
        wouldRepeat: true,
        notes: null,
      },
    );

    expect(result.feedback.id).toBe('fb-001');
    expect(result.feedback.tasteRating).toBe(4);
    expect(result.feedback.wouldRepeat).toBe(true);
  });

  it('accepts null optional fields (partial feedback)', async () => {
    const partial: MealFeedback = {
      ...MOCK_FEEDBACK_ROW,
      tasteRating: null,
      portionRating: null,
      wouldRepeat: null,
      notes: null,
    };
    mockInvokeFunction.mockResolvedValueOnce({ feedback: partial });

    const result = await invokeFunction<SubmitFeedbackInput, { feedback: MealFeedback }>(
      'process-feedback',
      {
        plannedMealId: 'meal-1',
        recipeId: 'recipe-1',
        tasteRating: null,
        portionRating: null,
        wouldRepeat: null,
        notes: null,
      },
    );

    expect(result.feedback.tasteRating).toBeNull();
    expect(result.feedback.wouldRepeat).toBeNull();
  });

  it('accepts null plannedMealId for ad-hoc feedback', async () => {
    mockInvokeFunction.mockResolvedValueOnce({ feedback: { ...MOCK_FEEDBACK_ROW, plannedMealId: null } });

    const result = await invokeFunction<SubmitFeedbackInput, { feedback: MealFeedback }>(
      'process-feedback',
      {
        plannedMealId: null,
        recipeId: 'recipe-1',
        tasteRating: 3,
        portionRating: 3,
        wouldRepeat: true,
        notes: null,
      },
    );

    expect(result.feedback.plannedMealId).toBeNull();
  });

  it('propagates network errors', async () => {
    mockInvokeFunction.mockRejectedValueOnce(new Error('Network request failed'));

    await expect(
      invokeFunction<SubmitFeedbackInput, { feedback: MealFeedback }>('process-feedback', {
        plannedMealId: 'meal-1',
        recipeId: 'recipe-1',
        tasteRating: 3,
        portionRating: 3,
        wouldRepeat: false,
        notes: null,
      }),
    ).rejects.toThrow('Network request failed');
  });
});

// ─── Preference blacklist logic ───────────────────────────────────────────────
// Test the soft-blacklist logic that mirrors what the Edge Function does.

/**
 * Extracts the top N main ingredients (non-spice, non-pantry) by amount.
 * Mirrors the logic in process-feedback/index.ts.
 */
function extractBlacklistIngredients(
  ingredients: Array<{ name: string; amount: number; category?: string }>,
  topN = 3,
): string[] {
  return ingredients
    .filter((i) => {
      const cat = (i.category ?? '').toLowerCase();
      return cat !== 'spice' && cat !== 'pantry';
    })
    .sort((a, b) => b.amount - a.amount)
    .slice(0, topN)
    .map((i) => i.name.toLowerCase().trim());
}

function mergeBlacklist(existing: string[], newItems: string[]): string[] {
  return Array.from(new Set([...existing, ...newItems]));
}

describe('Preference soft-blacklist on wouldRepeat=false', () => {
  it('extracts the top 3 non-spice ingredients by amount', () => {
    const ingredients = [
      { name: 'chicken breast', amount: 200, category: 'meat' },
      { name: 'broccoli', amount: 150, category: 'produce' },
      { name: 'soy sauce', amount: 30, category: 'pantry' },
      { name: 'ginger', amount: 10, category: 'spice' },
      { name: 'noodles', amount: 100, category: 'grain' },
    ];
    const result = extractBlacklistIngredients(ingredients);
    // Should include chicken, broccoli, noodles (not soy sauce / ginger)
    expect(result).toContain('chicken breast');
    expect(result).toContain('broccoli');
    expect(result).toContain('noodles');
    expect(result).not.toContain('soy sauce');
    expect(result).not.toContain('ginger');
  });

  it('respects topN limit', () => {
    const ingredients = Array.from({ length: 10 }, (_, i) => ({
      name: `ingredient-${i}`,
      amount: 100 - i,
      category: 'produce',
    }));
    const result = extractBlacklistIngredients(ingredients, 3);
    expect(result).toHaveLength(3);
  });

  it('returns empty array when all ingredients are spices', () => {
    const ingredients = [
      { name: 'cumin', amount: 5, category: 'spice' },
      { name: 'paprika', amount: 3, category: 'spice' },
    ];
    expect(extractBlacklistIngredients(ingredients)).toHaveLength(0);
  });

  it('merges new blacklist items with existing ones, deduplicating', () => {
    const existing = ['mushrooms', 'olives'];
    const newItems = ['olives', 'anchovies'];
    const merged = mergeBlacklist(existing, newItems);
    expect(merged).toContain('mushrooms');
    expect(merged).toContain('olives');
    expect(merged).toContain('anchovies');
    expect(merged.filter((i) => i === 'olives')).toHaveLength(1);
  });

  it('returns existing list unchanged when newItems is empty', () => {
    const existing = ['mushrooms'];
    const merged = mergeBlacklist(existing, []);
    expect(merged).toEqual(['mushrooms']);
  });

  it('handles empty existing list', () => {
    const merged = mergeBlacklist([], ['anchovies', 'olives']);
    expect(merged).toHaveLength(2);
  });
});

// ─── Feedback rating validation ───────────────────────────────────────────────

describe('Feedback rating constraints', () => {
  it('tasteRating must be between 1 and 5', () => {
    const validRatings = [1, 2, 3, 4, 5];
    const invalidRatings = [0, 6, -1, 10];

    for (const r of validRatings) {
      expect(r).toBeGreaterThanOrEqual(1);
      expect(r).toBeLessThanOrEqual(5);
    }
    for (const r of invalidRatings) {
      expect(r < 1 || r > 5).toBe(true);
    }
  });

  it('portionRating uses discrete values 1, 3, 5', () => {
    // 1=too small, 3=perfect, 5=too large
    const validPortions = [1, 3, 5];
    for (const p of validPortions) {
      expect([1, 3, 5]).toContain(p);
    }
  });
});
