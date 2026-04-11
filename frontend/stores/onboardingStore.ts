import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type {
  ActivityLevel,
  DietaryRestriction,
  MealSlot,
  OnboardingState,
  Sex,
} from '../types';

// ─── Default values ───────────────────────────────────────────────────────────

const DEFAULT_PANTRY_STAPLES = [
  'olive oil',
  'salt',
  'pepper',
  'garlic',
  'onion',
  'pasta',
  'rice',
  'canned tomatoes',
  'butter',
  'eggs',
  'flour',
  'sugar',
  'soy sauce',
  'honey',
  'stock cubes',
];

const initialState: OnboardingState = {
  hasCompletedOnboarding: false,
  // Step 1 — Goals
  goalsMode: 'calculate',
  weightKg: null,
  heightCm: null,
  age: null,
  sex: null,
  activityLevel: null,
  calorieTarget: null,
  proteinTargetG: null,
  // Step 2 — Preferences
  dietaryRestrictions: [],
  likedIngredients: [],
  dislikedIngredients: [],
  likedCuisines: [],
  seasonalityImportance: 3,
  cookFromScratchPreference: 3,
  preferredLanguage: 'en',
  // Step 3 — Meal slots
  managedMealSlots: ['dinner'],
  unmanagedSlotCalories: {},
  // Step 4 — Batch cooking
  batchCookDays: 1,
  // Step 5 — Pantry
  pantryStaples: [...DEFAULT_PANTRY_STAPLES],
  // Step 6 — Shopping days
  shoppingDays: [1], // Monday by default
};

// ─── Store actions ────────────────────────────────────────────────────────────

interface OnboardingActions {
  // Step 1
  setGoalsMode: (mode: 'calculate' | 'manual') => void;
  setBodyData: (data: {
    weightKg?: number | null;
    heightCm?: number | null;
    age?: number | null;
    sex?: Sex | null;
    activityLevel?: ActivityLevel | null;
  }) => void;
  setManualTargets: (calorieTarget: number | null, proteinTargetG: number | null) => void;
  /** Stores the result of TDEE calculation from MacroCalculator */
  setCalculatedTargets: (calorieTarget: number, proteinTargetG: number) => void;

  // Step 2
  toggleDietaryRestriction: (restriction: DietaryRestriction) => void;
  setDietaryRestrictions: (restrictions: DietaryRestriction[]) => void;
  addLikedIngredient: (ingredient: string) => void;
  removeLikedIngredient: (ingredient: string) => void;
  setLikedIngredients: (ingredients: string[]) => void;
  addDislikedIngredient: (ingredient: string) => void;
  removeDislikedIngredient: (ingredient: string) => void;
  setDislikedIngredients: (ingredients: string[]) => void;
  toggleLikedCuisine: (cuisine: string) => void;
  setLikedCuisines: (cuisines: string[]) => void;
  setSeasonalityImportance: (value: 1 | 2 | 3 | 4 | 5) => void;
  setCookFromScratchPreference: (value: 1 | 2 | 3 | 4 | 5) => void;

  // Step 3
  toggleManagedMealSlot: (slot: MealSlot) => void;
  setUnmanagedSlotCalories: (slot: MealSlot, calories: number) => void;

  // Step 4
  setBatchCookDays: (days: 1 | 2 | 3) => void;

  // Step 5
  togglePantryStaple: (staple: string) => void;
  addCustomPantryStaple: (staple: string) => void;

  // Step 6
  toggleShoppingDay: (day: number) => void;

  // Utility
  reset: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useOnboardingStore = create<OnboardingState & OnboardingActions>()(
  persist(
    (set) => ({
      ...initialState,

      // ── Step 1 ──────────────────────────────────────────────────────────────
      setGoalsMode: (goalsMode) => set({ goalsMode }),

      setBodyData: (data) => set((s) => ({ ...s, ...data })),

      setManualTargets: (calorieTarget, proteinTargetG) =>
        set({ calorieTarget, proteinTargetG }),

      setCalculatedTargets: (calorieTarget, proteinTargetG) =>
        set({ calorieTarget, proteinTargetG }),

      // ── Step 2 ──────────────────────────────────────────────────────────────
      toggleDietaryRestriction: (restriction) =>
        set((s) => ({
          dietaryRestrictions: s.dietaryRestrictions.includes(restriction)
            ? s.dietaryRestrictions.filter((r) => r !== restriction)
            : [...s.dietaryRestrictions, restriction],
        })),

      setDietaryRestrictions: (restrictions) => set({ dietaryRestrictions: restrictions }),

      setLikedIngredients: (ingredients) => set({ likedIngredients: ingredients }),

      setDislikedIngredients: (ingredients) => set({ dislikedIngredients: ingredients }),

      setLikedCuisines: (cuisines) => set({ likedCuisines: cuisines }),

      addLikedIngredient: (ingredient) =>
        set((s) => {
          const normalised = ingredient.trim().toLowerCase();
          if (!normalised || s.likedIngredients.includes(normalised)) return s;
          return { likedIngredients: [...s.likedIngredients, normalised] };
        }),

      removeLikedIngredient: (ingredient) =>
        set((s) => ({
          likedIngredients: s.likedIngredients.filter((i) => i !== ingredient),
        })),

      addDislikedIngredient: (ingredient) =>
        set((s) => {
          const normalised = ingredient.trim().toLowerCase();
          if (!normalised || s.dislikedIngredients.includes(normalised)) return s;
          return { dislikedIngredients: [...s.dislikedIngredients, normalised] };
        }),

      removeDislikedIngredient: (ingredient) =>
        set((s) => ({
          dislikedIngredients: s.dislikedIngredients.filter((i) => i !== ingredient),
        })),

      toggleLikedCuisine: (cuisine) =>
        set((s) => ({
          likedCuisines: s.likedCuisines.includes(cuisine)
            ? s.likedCuisines.filter((c) => c !== cuisine)
            : [...s.likedCuisines, cuisine],
        })),

      setSeasonalityImportance: (seasonalityImportance) => set({ seasonalityImportance }),
      setCookFromScratchPreference: (cookFromScratchPreference) =>
        set({ cookFromScratchPreference }),

      // ── Step 3 ──────────────────────────────────────────────────────────────
      toggleManagedMealSlot: (slot) =>
        set((s) => {
          const isManaged = s.managedMealSlots.includes(slot);
          const managedMealSlots = isManaged
            ? s.managedMealSlots.filter((ms) => ms !== slot)
            : [...s.managedMealSlots, slot];

          // Remove unmanaged calorie entry if slot becomes managed
          const unmanagedSlotCalories = { ...s.unmanagedSlotCalories };
          if (!isManaged) {
            delete unmanagedSlotCalories[slot];
          }

          return { managedMealSlots, unmanagedSlotCalories };
        }),

      setUnmanagedSlotCalories: (slot, calories) =>
        set((s) => ({
          unmanagedSlotCalories: { ...s.unmanagedSlotCalories, [slot]: calories },
        })),

      // ── Step 4 ──────────────────────────────────────────────────────────────
      setBatchCookDays: (batchCookDays) => set({ batchCookDays }),

      // ── Step 5 ──────────────────────────────────────────────────────────────
      togglePantryStaple: (staple) =>
        set((s) => ({
          pantryStaples: s.pantryStaples.includes(staple)
            ? s.pantryStaples.filter((p) => p !== staple)
            : [...s.pantryStaples, staple],
        })),

      addCustomPantryStaple: (staple) =>
        set((s) => {
          const normalised = staple.trim().toLowerCase();
          if (!normalised || s.pantryStaples.includes(normalised)) return s;
          return { pantryStaples: [...s.pantryStaples, normalised] };
        }),

      // ── Step 6 ──────────────────────────────────────────────────────────────
      toggleShoppingDay: (day) =>
        set((s) => ({
          shoppingDays: s.shoppingDays.includes(day)
            ? s.shoppingDays.filter((d) => d !== day)
            : [...s.shoppingDays, day],
        })),

      // ── Utility ─────────────────────────────────────────────────────────────
      reset: () => set({ ...initialState, hasCompletedOnboarding: true, pantryStaples: [...DEFAULT_PANTRY_STAPLES], likedIngredients: [], dislikedIngredients: [] }),
    }),
    {
      name: 'plateplan-onboarding',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

// ─── Selectors ────────────────────────────────────────────────────────────────

/** Derives the list of ALL meal slots that are NOT managed (needed for Step 3 UI) */
export const ALL_MEAL_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export function selectUnmanagedSlots(state: OnboardingState): MealSlot[] {
  return ALL_MEAL_SLOTS.filter((slot) => !state.managedMealSlots.includes(slot));
}

/** True when enough data exists to proceed to the completion step */
export function selectOnboardingIsComplete(state: OnboardingState): boolean {
  if (state.hasCompletedOnboarding) return true;
  return (
    state.calorieTarget !== null &&
    state.managedMealSlots.length > 0 &&
    state.shoppingDays.length > 0
  );
}

// ─── TDEE calculator (Mifflin-St Jeor) ──────────────────────────────────────
// Exported here (co-located with the store that uses it) and also tested in __tests__.

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export interface TdeeInput {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: Sex;
  activityLevel: ActivityLevel;
  /** kcal deficit to subtract from TDEE. Defaults to 300. */
  deficit?: number;
}

export interface TdeeResult {
  bmr: number;
  tdee: number;
  /** TDEE minus deficit — the recommended daily calorie target */
  calorieTarget: number;
  /** Simple protein target: 1.8g per kg bodyweight */
  proteinTargetG: number;
}

export function calculateTdee({
  weightKg,
  heightCm,
  age,
  sex,
  activityLevel,
  deficit = 300,
}: TdeeInput): TdeeResult {
  // Mifflin-St Jeor BMR
  const bmr =
    sex === 'male'
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;

  const tdee = Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
  const calorieTarget = Math.max(1200, tdee - deficit); // floor at 1200 kcal
  const proteinTargetG = Math.round(weightKg * 1.8);

  return { bmr: Math.round(bmr), tdee, calorieTarget, proteinTargetG };
}
