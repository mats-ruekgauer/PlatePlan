/**
 * Unit tests for mapUserPreferences — verifies snake_case → camelCase mapping
 * and default values for nullable/optional columns.
 */

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

import { mapUserPreferences } from '../../lib/supabase';

// Minimal DB row shape — only fields needed for these assertions
function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pref-1',
    user_id: 'user-1',
    calorie_target: null,
    protein_target_g: null,
    weight_kg: null,
    height_cm: null,
    age: null,
    sex: null,
    activity_level: null,
    dietary_restrictions: [],
    liked_ingredients: [],
    disliked_ingredients: [],
    liked_cuisines: [],
    seasonality_importance: 3,
    cook_from_scratch_preference: 3,
    unmanaged_slot_calories: {},
    max_cook_time_minutes: 45,
    pantry_staples: [],
    preferred_language: 'en',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  } as Parameters<typeof mapUserPreferences>[0];
}

describe('mapUserPreferences', () => {
  it('maps cook_from_scratch_preference from DB row', () => {
    const result = mapUserPreferences(makeRow({ cook_from_scratch_preference: 5 }));
    expect(result.cookFromScratchPreference).toBe(5);
  });

  it('defaults cookFromScratchPreference to 3 when column is null', () => {
    const result = mapUserPreferences(makeRow({ cook_from_scratch_preference: null }));
    expect(result.cookFromScratchPreference).toBe(3);
  });

  it('maps seasonalityImportance correctly (regression)', () => {
    const result = mapUserPreferences(makeRow({ seasonality_importance: 4 }));
    expect(result.seasonalityImportance).toBe(4);
  });
});
