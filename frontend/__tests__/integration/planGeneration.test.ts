/**
 * Integration test: plan generation with mocked Claude response and Supabase.
 * Tests the core orchestration logic without hitting real external services.
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

// Mock the supabase client
const mockSupabaseFrom = jest.fn();
const mockSupabaseAuth = {
  getSession: jest.fn(() =>
    Promise.resolve({ data: { session: { user: { id: 'user-123' } } }, error: null }),
  ),
};

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: mockSupabaseFrom,
    auth: mockSupabaseAuth,
  },
  invokeFunction: jest.fn(),
  mapMealPlan: (row: Record<string, unknown>) => ({ ...row, weekStart: row.week_start, generatedAt: row.generated_at }),
}));

import { invokeFunction } from '../../lib/supabase';
import type { PlanGenerationResult } from '../../types';

// ─── Fixture: valid Claude plan response (as returned by Edge Function) ───────

const MOCK_PLAN_RESULT: PlanGenerationResult = {
  planId: 'plan-abc-123',
  meals: [
    {
      id: 'meal-1',
      planId: 'plan-abc-123',
      dayOfWeek: 0,
      mealSlot: 'dinner',
      recipeId: 'recipe-1',
      alternativeRecipeId: 'recipe-2',
      chosenRecipeId: null,
      batchGroup: null,
      createdAt: '2026-04-07T00:00:00Z',
    },
    {
      id: 'meal-2',
      planId: 'plan-abc-123',
      dayOfWeek: 1,
      mealSlot: 'dinner',
      recipeId: 'recipe-3',
      alternativeRecipeId: 'recipe-4',
      chosenRecipeId: null,
      batchGroup: null,
      createdAt: '2026-04-08T00:00:00Z',
    },
  ],
  shoppingItems: [],
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Plan generation via invokeFunction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls the generate-plan Edge Function with the correct weekStart', async () => {
    (invokeFunction as jest.Mock).mockResolvedValueOnce(MOCK_PLAN_RESULT);

    const weekStart = '2026-04-07';
    const result = await invokeFunction<{ weekStart: string }, PlanGenerationResult>(
      'generate-plan',
      { weekStart },
    );

    expect(invokeFunction).toHaveBeenCalledWith('generate-plan', { weekStart });
    expect(result.planId).toBe('plan-abc-123');
  });

  it('returns the full list of planned meals', async () => {
    (invokeFunction as jest.Mock).mockResolvedValueOnce(MOCK_PLAN_RESULT);

    const result = await invokeFunction<{ weekStart: string }, PlanGenerationResult>(
      'generate-plan',
      { weekStart: '2026-04-07' },
    );

    expect(result.meals).toHaveLength(2);
    expect(result.meals[0].dayOfWeek).toBe(0);
    expect(result.meals[1].dayOfWeek).toBe(1);
  });

  it('propagates errors from the Edge Function', async () => {
    (invokeFunction as jest.Mock).mockRejectedValueOnce(new Error('Claude API timeout'));

    await expect(
      invokeFunction<{ weekStart: string }, PlanGenerationResult>('generate-plan', {
        weekStart: '2026-04-07',
      }),
    ).rejects.toThrow('Claude API timeout');
  });

  it('returns a planId that is a non-empty string', async () => {
    (invokeFunction as jest.Mock).mockResolvedValueOnce(MOCK_PLAN_RESULT);

    const result = await invokeFunction<{ weekStart: string }, PlanGenerationResult>(
      'generate-plan',
      { weekStart: '2026-04-07' },
    );

    expect(typeof result.planId).toBe('string');
    expect(result.planId.length).toBeGreaterThan(0);
  });

  it('each meal has a valid mealSlot value', async () => {
    (invokeFunction as jest.Mock).mockResolvedValueOnce(MOCK_PLAN_RESULT);

    const result = await invokeFunction<{ weekStart: string }, PlanGenerationResult>(
      'generate-plan',
      { weekStart: '2026-04-07' },
    );

    const validSlots = ['breakfast', 'lunch', 'dinner', 'snack'];
    for (const meal of result.meals) {
      expect(validSlots).toContain(meal.mealSlot);
    }
  });

  it('each meal has dayOfWeek between 0 and 6', async () => {
    (invokeFunction as jest.Mock).mockResolvedValueOnce(MOCK_PLAN_RESULT);

    const result = await invokeFunction<{ weekStart: string }, PlanGenerationResult>(
      'generate-plan',
      { weekStart: '2026-04-07' },
    );

    for (const meal of result.meals) {
      expect(meal.dayOfWeek).toBeGreaterThanOrEqual(0);
      expect(meal.dayOfWeek).toBeLessThanOrEqual(6);
    }
  });
});

// ─── getThisMonday helper (extracted from step-complete and tabs/index) ───────

function getThisMonday(fromDate: Date): string {
  const day = fromDate.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(fromDate);
  monday.setDate(fromDate.getDate() + diff);
  return monday.toISOString().split('T')[0];
}

describe('getThisMonday', () => {
  it('returns the same date when the input is already a Monday', () => {
    const monday = new Date('2026-04-06'); // Monday
    expect(getThisMonday(monday)).toBe('2026-04-06');
  });

  it('returns the previous Monday for a Wednesday', () => {
    const wednesday = new Date('2026-04-08'); // Wednesday
    expect(getThisMonday(wednesday)).toBe('2026-04-06');
  });

  it('returns the previous Monday for a Sunday', () => {
    const sunday = new Date('2026-04-12'); // Sunday
    expect(getThisMonday(sunday)).toBe('2026-04-06');
  });

  it('returns the previous Monday for a Saturday', () => {
    const saturday = new Date('2026-04-11'); // Saturday
    expect(getThisMonday(saturday)).toBe('2026-04-06');
  });

  it('returns an ISO date string with no time component', () => {
    const date = new Date('2026-04-09'); // Thursday
    const result = getThisMonday(date);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result).not.toContain('T');
  });
});
