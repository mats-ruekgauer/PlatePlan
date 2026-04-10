/**
 * Integration tests for the onboarding Zustand store.
 * Tests all state transitions across the 6 onboarding steps.
 *
 * We test the store actions in isolation (no React rendering) since the store
 * is a pure state machine — the React components are thin wrappers around it.
 */

// Mock AsyncStorage (used by Zustand persist middleware)
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
}));

import {
  useOnboardingStore,
  selectOnboardingIsComplete,
  selectUnmanagedSlots,
  ALL_MEAL_SLOTS,
} from '../../stores/onboardingStore';

// ─── Helper: get a fresh store snapshot ───────────────────────────────────────
// Calling getState() is simpler than rendering a hook in unit tests.

function getStore() {
  return useOnboardingStore.getState();
}

// Reset store between tests
beforeEach(() => {
  useOnboardingStore.setState(useOnboardingStore.getInitialState(), true);
});

// ─── Step 1: Goals ────────────────────────────────────────────────────────────

describe('Step 1 — Goals', () => {
  it('starts in calculate mode by default', () => {
    expect(getStore().goalsMode).toBe('calculate');
  });

  it('setGoalsMode switches to manual', () => {
    getStore().setGoalsMode('manual');
    expect(getStore().goalsMode).toBe('manual');
  });

  it('setBodyData stores all body fields', () => {
    getStore().setBodyData({ weightKg: 75, heightCm: 178, age: 32, sex: 'male', activityLevel: 'moderate' });
    const s = getStore();
    expect(s.weightKg).toBe(75);
    expect(s.heightCm).toBe(178);
    expect(s.age).toBe(32);
    expect(s.sex).toBe('male');
    expect(s.activityLevel).toBe('moderate');
  });

  it('setBodyData does a partial update without clearing other fields', () => {
    getStore().setBodyData({ weightKg: 75 });
    getStore().setBodyData({ heightCm: 178 });
    expect(getStore().weightKg).toBe(75);
    expect(getStore().heightCm).toBe(178);
  });

  it('setManualTargets stores calorie and protein targets', () => {
    getStore().setManualTargets(2000, 150);
    expect(getStore().calorieTarget).toBe(2000);
    expect(getStore().proteinTargetG).toBe(150);
  });

  it('setCalculatedTargets stores calorie and protein targets', () => {
    getStore().setCalculatedTargets(1800, 140);
    expect(getStore().calorieTarget).toBe(1800);
    expect(getStore().proteinTargetG).toBe(140);
  });
});

// ─── Step 2: Preferences ──────────────────────────────────────────────────────

describe('Step 2 — Preferences', () => {
  it('toggleDietaryRestriction adds a restriction', () => {
    getStore().toggleDietaryRestriction('vegetarian');
    expect(getStore().dietaryRestrictions).toContain('vegetarian');
  });

  it('toggleDietaryRestriction removes a restriction when toggled again', () => {
    getStore().toggleDietaryRestriction('vegetarian');
    getStore().toggleDietaryRestriction('vegetarian');
    expect(getStore().dietaryRestrictions).not.toContain('vegetarian');
  });

  it('addDislikedIngredient normalises to lowercase', () => {
    getStore().addDislikedIngredient('Mushrooms');
    expect(getStore().dislikedIngredients).toContain('mushrooms');
  });

  it('addDislikedIngredient deduplicates', () => {
    getStore().addDislikedIngredient('mushrooms');
    getStore().addDislikedIngredient('mushrooms');
    expect(getStore().dislikedIngredients.filter((i) => i === 'mushrooms')).toHaveLength(1);
  });

  it('addDislikedIngredient ignores empty/whitespace strings', () => {
    getStore().addDislikedIngredient('   ');
    expect(getStore().dislikedIngredients).toHaveLength(0);
  });

  it('removeDislikedIngredient removes the item', () => {
    getStore().addDislikedIngredient('olives');
    getStore().removeDislikedIngredient('olives');
    expect(getStore().dislikedIngredients).not.toContain('olives');
  });

  it('toggleLikedCuisine adds and removes a cuisine', () => {
    getStore().toggleLikedCuisine('Italian');
    expect(getStore().likedCuisines).toContain('Italian');
    getStore().toggleLikedCuisine('Italian');
    expect(getStore().likedCuisines).not.toContain('Italian');
  });

  it('cookFromScratchPreference defaults to 3', () => {
    expect(getStore().cookFromScratchPreference).toBe(3);
  });

  it('setCookFromScratchPreference stores the value', () => {
    getStore().setCookFromScratchPreference(5);
    expect(getStore().cookFromScratchPreference).toBe(5);
  });

  it('reset restores cookFromScratchPreference to 3', () => {
    getStore().setCookFromScratchPreference(1);
    getStore().reset();
    expect(getStore().cookFromScratchPreference).toBe(3);
  });
});

// ─── Step 3: Meal slots ───────────────────────────────────────────────────────

describe('Step 3 — Meal slots', () => {
  it('default managed slots contains dinner', () => {
    expect(getStore().managedMealSlots).toContain('dinner');
  });

  it('toggleManagedMealSlot adds an unmanaged slot to managed', () => {
    // breakfast is not managed by default
    getStore().toggleManagedMealSlot('breakfast');
    expect(getStore().managedMealSlots).toContain('breakfast');
  });

  it('toggleManagedMealSlot removes a managed slot', () => {
    getStore().toggleManagedMealSlot('dinner'); // remove
    expect(getStore().managedMealSlots).not.toContain('dinner');
  });

  it('removing a managed slot clears its unmanagedSlotCalories entry', () => {
    // Add dinner to managed first (it's managed by default), so toggling removes it
    getStore().setUnmanagedSlotCalories('lunch', 500);
    getStore().toggleManagedMealSlot('lunch'); // was unmanaged, now managed
    getStore().toggleManagedMealSlot('lunch'); // now unmanaged again
    // The calories should still be there — we only clear when becoming managed
    // Let's test the clear direction:
    getStore().setUnmanagedSlotCalories('dinner', 800);
    getStore().toggleManagedMealSlot('dinner'); // remove from managed → add unmanagedCalories kept
    // calories should not be cleared when going to unmanaged
    // Now add it back to managed → calories should clear
    getStore().toggleManagedMealSlot('dinner'); // add back to managed
    expect(getStore().unmanagedSlotCalories['dinner']).toBeUndefined();
  });

  it('setUnmanagedSlotCalories stores calories for a slot', () => {
    getStore().setUnmanagedSlotCalories('breakfast', 400);
    expect(getStore().unmanagedSlotCalories['breakfast']).toBe(400);
  });

  it('selectUnmanagedSlots returns slots not in managedMealSlots', () => {
    // Default: only dinner is managed
    const unmanaged = selectUnmanagedSlots(getStore());
    expect(unmanaged).toContain('breakfast');
    expect(unmanaged).toContain('lunch');
    expect(unmanaged).toContain('snack');
    expect(unmanaged).not.toContain('dinner');
  });

  it('selectUnmanagedSlots returns all slots when none are managed', () => {
    getStore().toggleManagedMealSlot('dinner'); // remove last managed slot
    const unmanaged = selectUnmanagedSlots(getStore());
    expect(unmanaged).toHaveLength(ALL_MEAL_SLOTS.length);
  });
});

// ─── Step 4: Batch cooking ────────────────────────────────────────────────────

describe('Step 4 — Batch cooking', () => {
  it('default batch cook days is 1', () => {
    expect(getStore().batchCookDays).toBe(1);
  });

  it('setBatchCookDays stores the value', () => {
    getStore().setBatchCookDays(3);
    expect(getStore().batchCookDays).toBe(3);
  });
});

// ─── Step 5: Pantry ───────────────────────────────────────────────────────────

describe('Step 5 — Pantry', () => {
  it('starts with default pantry staples', () => {
    expect(getStore().pantryStaples).toContain('olive oil');
    expect(getStore().pantryStaples).toContain('salt');
    expect(getStore().pantryStaples).toContain('eggs');
  });

  it('togglePantryStaple removes a checked staple', () => {
    getStore().togglePantryStaple('olive oil');
    expect(getStore().pantryStaples).not.toContain('olive oil');
  });

  it('togglePantryStaple re-adds a removed staple', () => {
    getStore().togglePantryStaple('olive oil');
    getStore().togglePantryStaple('olive oil');
    expect(getStore().pantryStaples).toContain('olive oil');
  });

  it('addCustomPantryStaple adds a new item', () => {
    getStore().addCustomPantryStaple('coconut milk');
    expect(getStore().pantryStaples).toContain('coconut milk');
  });

  it('addCustomPantryStaple normalises to lowercase', () => {
    getStore().addCustomPantryStaple('Coconut Milk');
    expect(getStore().pantryStaples).toContain('coconut milk');
  });

  it('addCustomPantryStaple deduplicates', () => {
    getStore().addCustomPantryStaple('coconut milk');
    getStore().addCustomPantryStaple('coconut milk');
    expect(
      getStore().pantryStaples.filter((s) => s === 'coconut milk'),
    ).toHaveLength(1);
  });
});

// ─── Step 6: Shopping days ────────────────────────────────────────────────────

describe('Step 6 — Shopping days', () => {
  it('toggleShoppingDay adds a day', () => {
    getStore().toggleShoppingDay(3); // Wednesday
    expect(getStore().shoppingDays).toContain(3);
  });

  it('toggleShoppingDay removes a day when toggled again', () => {
    getStore().toggleShoppingDay(1); // already in default
    expect(getStore().shoppingDays).not.toContain(1);
  });
});

// ─── Completion selector ─────────────────────────────────────────────────────

describe('selectOnboardingIsComplete', () => {
  it('returns false when calorieTarget is null', () => {
    expect(selectOnboardingIsComplete(getStore())).toBe(false);
  });

  it('returns false when no managed slots are set', () => {
    getStore().setCalculatedTargets(2000, 150);
    getStore().toggleManagedMealSlot('dinner'); // remove default
    expect(selectOnboardingIsComplete(getStore())).toBe(false);
  });

  it('returns false when no shopping days are set', () => {
    getStore().setCalculatedTargets(2000, 150);
    getStore().toggleShoppingDay(1); // remove default
    expect(selectOnboardingIsComplete(getStore())).toBe(false);
  });

  it('returns true when all required fields are set', () => {
    getStore().setCalculatedTargets(2000, 150);
    // dinner is managed by default, monday shopping is default
    expect(selectOnboardingIsComplete(getStore())).toBe(true);
  });
});

// ─── Reset ────────────────────────────────────────────────────────────────────

describe('reset', () => {
  it('restores all fields to initial values', () => {
    getStore().setManualTargets(3000, 200);
    getStore().addDislikedIngredient('broccoli');
    getStore().setBatchCookDays(3);
    getStore().reset();

    const s = getStore();
    expect(s.calorieTarget).toBeNull();
    expect(s.dislikedIngredients).toHaveLength(0);
    expect(s.batchCookDays).toBe(1);
    expect(s.pantryStaples).toContain('olive oil'); // defaults restored
  });
});
