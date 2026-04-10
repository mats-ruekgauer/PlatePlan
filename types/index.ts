// ─── Primitive enums & unions ───────────────────────────────────────────────

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type DietaryRestriction =
  | 'vegetarian'
  | 'vegan'
  | 'gluten_free'
  | 'lactose_free'
  | 'nut_free'
  | 'halal'
  | 'kosher';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter' | 'all';

export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | 'very_active';

export type Sex = 'male' | 'female' | 'other';

export type PlanStatus = 'active' | 'archived';

export type MealPlanStatus = 'active' | 'archived';

export type MealStatus =
  | 'recommended'
  | 'planned'
  | 'prepared'
  | 'cooked'
  | 'rated'
  | 'skipped';

// ─── Ingredient & shopping ───────────────────────────────────────────────────

export interface Ingredient {
  name: string;
  amount: number;
  unit: string;
  category?: 'produce' | 'meat' | 'dairy' | 'pantry' | 'spice' | 'other';
}

export interface ShoppingItem extends Ingredient {
  checked: boolean;
  forMeals?: string[]; // recipe titles this ingredient belongs to
}

// ─── Database row types ──────────────────────────────────────────────────────

/** Mirrors `profiles` table */
export interface Profile {
  id: string; // UUID — same as auth.users.id
  displayName: string | null;
  createdAt: string; // ISO timestamp
  updatedAt: string;
}

/** Mirrors `user_preferences` table */
export interface UserPreferences {
  id: string;
  userId: string;
  // Goals
  calorieTarget: number | null;
  proteinTargetG: number | null;
  // Body data
  weightKg: number | null;
  heightCm: number | null;
  age: number | null;
  sex: Sex | null;
  activityLevel: ActivityLevel | null;
  // Food preferences
  dietaryRestrictions: DietaryRestriction[];
  likedIngredients: string[];
  dislikedIngredients: string[];
  likedCuisines: string[];
  seasonalityImportance: 1 | 2 | 3 | 4 | 5;
  // Planning
  managedMealSlots: MealSlot[];
  unmanagedSlotCalories: Partial<Record<MealSlot, number>>; // e.g. { breakfast: 400 }
  batchCookDays: number; // 1 | 2 | 3
  maxCookTimeMinutes: number;
  // Shopping
  shoppingDays: number[]; // 0=Sunday … 6=Saturday
  pantryStaples: string[];
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/** Mirrors `recipes` table */
export interface Recipe {
  id: string;
  userId: string | null; // null = global/shared recipe
  title: string;
  description: string | null;
  ingredients: Ingredient[];
  steps: string[];
  caloriesPerServing: number | null;
  proteinPerServingG: number | null;
  carbsPerServingG: number | null;
  fatPerServingG: number | null;
  servings: number;
  cookTimeMinutes: number | null;
  cuisine: string | null;
  tags: string[];
  isSeasonal: boolean;
  season: Season;
  estimatedPriceEur: number | null;
  createdAt: string;
}

/** Mirrors `meal_plans` table */
export interface MealPlan {
  id: string;
  householdId: string;
  weekStart: string; // ISO date string — always a Monday
  status: MealPlanStatus;
  generatedAt: string;
}

/** Mirrors `planned_meals` table */
export interface PlannedMeal {
  id: string;
  planId: string;
  dayOfWeek: number; // 0=Monday … 6=Sunday
  mealSlot: MealSlot;
  recipeId: string;
  alternativeRecipeId: string | null;
  chosenRecipeId: string | null; // null = using the default recipeId
  batchGroup: number | null;
  status: MealStatus;
  createdAt: string;
}

/** Mirrors `shopping_lists` table */
export interface ShoppingList {
  id: string;
  householdId: string;
  planId: string | null;
  shoppingDate: string | null; // ISO date
  items: ShoppingItem[];
  exportedAt: string | null;
  createdAt: string;
}

/** Mirrors `meal_feedback` table */
export interface MealFeedback {
  id: string;
  userId: string;
  plannedMealId: string | null;
  recipeId: string;
  tasteRating: number | null; // 1–5
  portionRating: number | null; // 1=too small, 3=perfect, 5=too large
  wouldRepeat: boolean | null;
  notes: string | null;
  createdAt: string;
}

/** Mirrors `receipt_items` table */
export interface ReceiptItem {
  id: string;
  userId: string;
  receiptImageUrl: string | null;
  itemName: string;
  priceEur: number | null;
  supermarket: string | null;
  purchasedAt: string | null; // ISO date
  createdAt: string;
}

// ─── Edge Function I/O types ─────────────────────────────────────────────────

export interface GeneratePlanInput {
  userId: string;
  weekStart: string; // ISO date string
  preferences: UserPreferences;
}

export interface PlanGenerationResult {
  planId: string;
  meals: PlannedMeal[];
  shoppingItems: ShoppingItem[];
}

/** Shape Claude must return for a single recipe inside the plan JSON */
export interface ClaudeRecipeObject {
  title: string;
  description: string;
  ingredients: Ingredient[];
  steps: string[];
  caloriesPerServing: number;
  proteinPerServingG: number;
  carbsPerServingG: number;
  fatPerServingG: number;
  servings: number;
  cookTimeMinutes: number;
  cuisine: string;
  tags: string[];
  isSeasonal: boolean;
  season: Season;
  estimatedPriceEur: number;
}

export interface ClaudeMealSlotObject {
  slot: MealSlot;
  recipe: ClaudeRecipeObject;
  alternativeRecipe: ClaudeRecipeObject;
}

export interface ClaudeDayObject {
  dayOfWeek: number; // 0=Monday … 6=Sunday
  meals: ClaudeMealSlotObject[];
}

/** Root shape of the JSON Claude must return for plan generation */
export interface ClaudePlanResponse {
  days: ClaudeDayObject[];
}

// ─── UI / view-layer convenience types ──────────────────────────────────────

/** A planned meal hydrated with its resolved recipe (default or chosen) */
export interface HydratedMeal extends PlannedMeal {
  recipe: Recipe;
  alternativeRecipe: Recipe | null;
}

/** A full week's plan hydrated for display */
export interface HydratedPlan extends MealPlan {
  days: Array<{
    dayOfWeek: number;
    meals: HydratedMeal[];
  }>;
}

/** Shopping items grouped by day and category */
export interface GroupedShoppingList {
  shoppingDate: string; // ISO date
  label: string; // e.g. "Monday's shop"
  categories: Array<{
    category: string;
    items: ShoppingItem[];
  }>;
}

// ─── Onboarding store shape ──────────────────────────────────────────────────

export interface OnboardingState {
  hasCompletedOnboarding: boolean;
  // Step 1 — Goals
  goalsMode: 'calculate' | 'manual';
  weightKg: number | null;
  heightCm: number | null;
  age: number | null;
  sex: Sex | null;
  activityLevel: ActivityLevel | null;
  calorieTarget: number | null;
  proteinTargetG: number | null;
  // Step 2 — Preferences
  dietaryRestrictions: DietaryRestriction[];
  likedIngredients: string[];
  dislikedIngredients: string[];
  likedCuisines: string[];
  seasonalityImportance: 1 | 2 | 3 | 4 | 5;
  // Step 3 — Meal slots
  managedMealSlots: MealSlot[];
  unmanagedSlotCalories: Partial<Record<MealSlot, number>>;
  // Step 4 — Batch cooking
  batchCookDays: 1 | 2 | 3;
  // Step 5 — Pantry
  pantryStaples: string[];
  // Step 6 — Shopping days
  shoppingDays: number[];
}

// ─── Favorites ───────────────────────────────────────────────────────────────

export interface UserFavorite {
  id: string;
  userId: string;
  recipeId: string | null;
  recipe: Recipe | null; // hydrated when fetched with join
  customName: string | null;
  notes: string | null;
  createdAt: string;
}

// ─── Automations ─────────────────────────────────────────────────────────────

export type AutomationType = 'reminders_export' | 'sms_share';

export interface RemindersExportConfig {
  trigger: 'on_plan_generated' | 'manual';
}

export interface SmsShareConfig {
  trigger: 'on_plan_generated' | 'manual';
  contactName: string;
  contactNumber: string;
}

export type AutomationConfig = RemindersExportConfig | SmsShareConfig;

export interface Automation {
  id: string;
  userId: string;
  type: AutomationType;
  enabled: boolean;
  config: AutomationConfig;
  createdAt: string;
}

// ─── Households ──────────────────────────────────────────────────────────────

export type HouseholdRole = 'owner' | 'member';

export interface Household {
  id: string;
  name: string;
  createdBy: string;
  managedMealSlots: MealSlot[];
  shoppingDays: number[];      // 0=Sun … 6=Sat
  batchCookDays: number;       // 1 | 2 | 3
  createdAt: string;
  updatedAt: string;
}

export interface HouseholdMember {
  id: string;
  householdId: string;
  userId: string;
  displayName: string | null;  // joined from profiles
  role: HouseholdRole;
  joinedAt: string;
}

export interface HouseholdInvite {
  id: string;
  householdId: string;
  token: string;
  createdBy: string;
  expiresAt: string;
  createdAt: string;
}

// ─── Notifications ───────────────────────────────────────────────────────────

export interface ScheduledMealNotification {
  notificationId: string;
  plannedMealId: string;
  recipeName: string;
  scheduledFor: string; // ISO timestamp
}
