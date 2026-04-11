jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

import { mapRecipe } from '../../lib/supabase';

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'recipe-1',
    user_id: 'user-1',
    title: 'Lentil Curry',
    description: 'A quick weekday dinner.',
    ingredients: [{ name: 'Lentils', amount: 250, unit: 'g' }],
    steps: ['Cook everything'],
    calories_per_serving: 520,
    protein_per_serving_g: 28,
    carbs_per_serving_g: 52,
    fat_per_serving_g: 14,
    servings: 2,
    cook_time_minutes: 30,
    cuisine: 'Indian',
    tags: ['quick'],
    is_seasonal: false,
    season: 'all',
    estimated_price_eur: 2.8,
    source: 'manual',
    created_at: '2026-04-10T12:00:00Z',
    ...overrides,
  } as Parameters<typeof mapRecipe>[0];
}

describe('mapRecipe', () => {
  it('maps recipe source from the database row', () => {
    const result = mapRecipe(makeRow({ source: 'manual' }));
    expect(result.source).toBe('manual');
  });

  it('defaults source to ai_generated when the row is missing it', () => {
    const result = mapRecipe(makeRow({ source: null }));
    expect(result.source).toBe('ai_generated');
  });
});
