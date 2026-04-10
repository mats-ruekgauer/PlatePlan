import { mergePreferences } from '../../supabase/functions/_shared/mergePreferences';

const BASE_PREFS = {
  calorieTarget: 2000,
  proteinTargetG: 150,
  dietaryRestrictions: [] as string[],
  likedIngredients: [] as string[],
  dislikedIngredients: [] as string[],
  likedCuisines: [] as string[],
  seasonalityImportance: 3,
  maxCookTimeMinutes: 60,
  pantryStaples: [] as string[],
};

describe('mergePreferences', () => {
  it('returns single member prefs unchanged (except targets stay same)', () => {
    const result = mergePreferences([BASE_PREFS]);
    expect(result.calorieTarget).toBe(2000);
    expect(result.proteinTargetG).toBe(150);
  });

  it('sums calorie and protein targets across members', () => {
    const result = mergePreferences([BASE_PREFS, { ...BASE_PREFS, calorieTarget: 1800, proteinTargetG: 120 }]);
    expect(result.calorieTarget).toBe(3800);
    expect(result.proteinTargetG).toBe(270);
  });

  it('unions dietary restrictions', () => {
    const a = { ...BASE_PREFS, dietaryRestrictions: ['vegetarian'] };
    const b = { ...BASE_PREFS, dietaryRestrictions: ['gluten_free'] };
    const result = mergePreferences([a, b]);
    expect(result.dietaryRestrictions).toContain('vegetarian');
    expect(result.dietaryRestrictions).toContain('gluten_free');
    expect(result.dietaryRestrictions).toHaveLength(2);
  });

  it('deduplicates dietary restrictions', () => {
    const a = { ...BASE_PREFS, dietaryRestrictions: ['vegetarian'] };
    const b = { ...BASE_PREFS, dietaryRestrictions: ['vegetarian', 'gluten_free'] };
    const result = mergePreferences([a, b]);
    expect(result.dietaryRestrictions.filter((r) => r === 'vegetarian')).toHaveLength(1);
  });

  it('unions liked ingredients', () => {
    const a = { ...BASE_PREFS, likedIngredients: ['chicken'] };
    const b = { ...BASE_PREFS, likedIngredients: ['salmon'] };
    const result = mergePreferences([a, b]);
    expect(result.likedIngredients).toContain('chicken');
    expect(result.likedIngredients).toContain('salmon');
  });

  it('unions disliked ingredients', () => {
    const a = { ...BASE_PREFS, dislikedIngredients: ['cilantro'] };
    const b = { ...BASE_PREFS, dislikedIngredients: ['mushrooms'] };
    const result = mergePreferences([a, b]);
    expect(result.dislikedIngredients).toContain('cilantro');
    expect(result.dislikedIngredients).toContain('mushrooms');
  });

  it('unions liked cuisines', () => {
    const a = { ...BASE_PREFS, likedCuisines: ['Italian'] };
    const b = { ...BASE_PREFS, likedCuisines: ['Japanese'] };
    const result = mergePreferences([a, b]);
    expect(result.likedCuisines).toContain('Italian');
    expect(result.likedCuisines).toContain('Japanese');
  });

  it('uses the minimum maxCookTimeMinutes', () => {
    const a = { ...BASE_PREFS, maxCookTimeMinutes: 60 };
    const b = { ...BASE_PREFS, maxCookTimeMinutes: 30 };
    const result = mergePreferences([a, b]);
    expect(result.maxCookTimeMinutes).toBe(30);
  });

  it('averages seasonalityImportance and rounds', () => {
    const a = { ...BASE_PREFS, seasonalityImportance: 2 };
    const b = { ...BASE_PREFS, seasonalityImportance: 3 };
    const result = mergePreferences([a, b]);
    expect(result.seasonalityImportance).toBe(3); // Math.round(2.5) = 3
  });

  it('unions pantry staples without duplicates', () => {
    const a = { ...BASE_PREFS, pantryStaples: ['olive oil', 'garlic'] };
    const b = { ...BASE_PREFS, pantryStaples: ['garlic', 'salt'] };
    const result = mergePreferences([a, b]);
    expect(result.pantryStaples).toContain('olive oil');
    expect(result.pantryStaples).toContain('garlic');
    expect(result.pantryStaples).toContain('salt');
    expect(result.pantryStaples.filter((s) => s === 'garlic')).toHaveLength(1);
  });
});
