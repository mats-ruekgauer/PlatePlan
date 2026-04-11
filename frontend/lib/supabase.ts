import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

import type {
  Automation,
  AppLanguage,
  Household,
  HouseholdMember,
  MealFeedback,
  MealPlan,
  MealStatus,
  PlannedMeal,
  Profile,
  Recipe,
  ReceiptItem,
  ShoppingList,
  UserFavorite,
  UserPreferences,
} from '../types';

// ─── Environment variables ────────────────────────────────────────────────────

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
      'Ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set in .env.',
  );
}

// ─── Typed database schema ────────────────────────────────────────────────────
// Gives createClient a row-level type map so every .from() call is typed.

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      user_preferences: {
        Row: {
          id: string;
          user_id: string;
          calorie_target: number | null;
          protein_target_g: number | null;
          weight_kg: number | null;
          height_cm: number | null;
          age: number | null;
          sex: string | null;
          activity_level: string | null;
          dietary_restrictions: string[];
          liked_ingredients: string[];
          disliked_ingredients: string[];
          liked_cuisines: string[];
          seasonality_importance: number;
          cook_from_scratch_preference: number;
          unmanaged_slot_calories: Record<string, number> | null;
          max_cook_time_minutes: number;
          pantry_staples: string[];
          preferred_language: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['user_preferences']['Row'],
          'id' | 'created_at' | 'updated_at'
        >;
        Update: Partial<Database['public']['Tables']['user_preferences']['Insert']>;
      };
      recipes: {
        Row: {
          id: string;
          user_id: string | null;
          title: string;
          description: string | null;
          ingredients: unknown; // JSONB — cast at read time
          steps: string[];
          calories_per_serving: number | null;
          protein_per_serving_g: number | null;
          carbs_per_serving_g: number | null;
          fat_per_serving_g: number | null;
          servings: number;
          cook_time_minutes: number | null;
          cuisine: string | null;
          tags: string[];
          is_seasonal: boolean;
          season: string;
          estimated_price_eur: number | null;
          source: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['recipes']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['recipes']['Insert']>;
      };
      meal_plans: {
        Row: {
          id: string;
          household_id: string;
          week_start: string;
          status: string;
          generated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['meal_plans']['Row'], 'id' | 'generated_at'>;
        Update: Partial<Database['public']['Tables']['meal_plans']['Insert']>;
      };
      planned_meals: {
        Row: {
          id: string;
          plan_id: string;
          day_of_week: number;
          meal_slot: string;
          recipe_id: string;
          alternative_recipe_id: string | null;
          chosen_recipe_id: string | null;
          batch_group: number | null;
          status: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['planned_meals']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['planned_meals']['Insert']>;
      };
      shopping_lists: {
        Row: {
          id: string;
          household_id: string;
          plan_id: string | null;
          shopping_date: string | null;
          items: unknown; // JSONB — cast at read time
          exported_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['shopping_lists']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['shopping_lists']['Insert']>;
      };
      meal_feedback: {
        Row: {
          id: string;
          user_id: string;
          planned_meal_id: string | null;
          recipe_id: string;
          taste_rating: number | null;
          portion_rating: number | null;
          would_repeat: boolean | null;
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['meal_feedback']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['meal_feedback']['Insert']>;
      };
      receipt_items: {
        Row: {
          id: string;
          user_id: string;
          receipt_image_url: string | null;
          item_name: string;
          price_eur: number | null;
          supermarket: string | null;
          purchased_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['receipt_items']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['receipt_items']['Insert']>;
      };
      user_favorites: {
        Row: {
          id: string;
          user_id: string;
          recipe_id: string | null;
          custom_name: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_favorites']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['user_favorites']['Insert']>;
      };
      automations: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          enabled: boolean;
          config: Record<string, unknown>;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['automations']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['automations']['Insert']>;
      };
      households: {
        Row: {
          id: string;
          name: string;
          created_by: string;
          managed_meal_slots: string[];
          shopping_days: number[];
          batch_cook_days: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['households']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['households']['Insert']>;
      };
      household_members: {
        Row: {
          id: string;
          household_id: string;
          user_id: string;
          role: string;
          status: string;
          joined_at: string;
        };
        Insert: Omit<Database['public']['Tables']['household_members']['Row'], 'id' | 'joined_at' | 'status'>;
        Update: Partial<Database['public']['Tables']['household_members']['Insert']>;
      };
      household_invites: {
        Row: {
          id: string;
          household_id: string;
          token_hash: string;
          created_by: string;
          expires_at: string;
          usage_limit: number | null;
          uses_count: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['household_invites']['Row'], 'id' | 'created_at' | 'uses_count'>;
        Update: Partial<Database['public']['Tables']['household_invites']['Insert']>;
      };
    };
  };
}

// ─── Client singleton ─────────────────────────────────────────────────────────

export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // not a web app
    },
  },
);

// ─── Auth helpers ─────────────────────────────────────────────────────────────

export async function getCurrentUserId(): Promise<string> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error) throw error;
  if (!session?.user?.id) throw new Error('Not authenticated');
  return session.user.id;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// ─── Row mappers (snake_case DB → camelCase app types) ────────────────────────

export function mapProfile(
  row: Database['public']['Tables']['profiles']['Row'],
): Profile {
  return {
    id: row.id,
    displayName: row.display_name,
    email: null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapUserPreferences(
  row: Database['public']['Tables']['user_preferences']['Row'],
): UserPreferences {
  return {
    id: row.id,
    userId: row.user_id,
    calorieTarget: row.calorie_target,
    proteinTargetG: row.protein_target_g,
    weightKg: row.weight_kg,
    heightCm: row.height_cm,
    age: row.age,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sex: row.sex as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    activityLevel: row.activity_level as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dietaryRestrictions: (row.dietary_restrictions ?? []) as any[],
    likedIngredients: row.liked_ingredients ?? [],
    dislikedIngredients: row.disliked_ingredients ?? [],
    likedCuisines: row.liked_cuisines ?? [],
    seasonalityImportance: (row.seasonality_importance ?? 3) as 1 | 2 | 3 | 4 | 5,
    cookFromScratchPreference: (row.cook_from_scratch_preference ?? 3) as 1 | 2 | 3 | 4 | 5,
    unmanagedSlotCalories: (row.unmanaged_slot_calories ?? {}) as Record<string, number>,
    maxCookTimeMinutes: row.max_cook_time_minutes,
    pantryStaples: row.pantry_staples ?? [],
    preferredLanguage: (row.preferred_language ?? 'en') as AppLanguage,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapRecipe(
  row: Database['public']['Tables']['recipes']['Row'],
): Recipe {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ingredients: (row.ingredients as any[]) ?? [],
    steps: row.steps ?? [],
    caloriesPerServing: row.calories_per_serving,
    proteinPerServingG: row.protein_per_serving_g,
    carbsPerServingG: row.carbs_per_serving_g,
    fatPerServingG: row.fat_per_serving_g,
    servings: row.servings,
    cookTimeMinutes: row.cook_time_minutes,
    cuisine: row.cuisine,
    tags: row.tags ?? [],
    isSeasonal: row.is_seasonal,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    season: row.season as any,
    estimatedPriceEur: row.estimated_price_eur ?? null,
    source: (row.source ?? 'ai_generated') as Recipe['source'],
    createdAt: row.created_at,
  };
}

export function mapMealPlan(
  row: Database['public']['Tables']['meal_plans']['Row'],
): MealPlan {
  return {
    id: row.id,
    householdId: row.household_id,
    weekStart: row.week_start,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    status: row.status as any,
    generatedAt: row.generated_at,
  };
}

export function mapPlannedMeal(
  row: Database['public']['Tables']['planned_meals']['Row'],
): PlannedMeal {
  return {
    id: row.id,
    planId: row.plan_id,
    dayOfWeek: row.day_of_week,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mealSlot: row.meal_slot as any,
    recipeId: row.recipe_id,
    alternativeRecipeId: row.alternative_recipe_id,
    chosenRecipeId: row.chosen_recipe_id,
    batchGroup: row.batch_group,
    status: (row.status ?? 'recommended') as MealStatus,
    createdAt: row.created_at,
  };
}

export function mapShoppingList(
  row: Database['public']['Tables']['shopping_lists']['Row'],
): ShoppingList {
  return {
    id: row.id,
    householdId: row.household_id,
    planId: row.plan_id,
    shoppingDate: row.shopping_date,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items: (row.items as any[]) ?? [],
    exportedAt: row.exported_at,
    createdAt: row.created_at,
  };
}

export function mapMealFeedback(
  row: Database['public']['Tables']['meal_feedback']['Row'],
): MealFeedback {
  return {
    id: row.id,
    userId: row.user_id,
    plannedMealId: row.planned_meal_id,
    recipeId: row.recipe_id,
    tasteRating: row.taste_rating,
    portionRating: row.portion_rating,
    wouldRepeat: row.would_repeat,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export function mapReceiptItem(
  row: Database['public']['Tables']['receipt_items']['Row'],
): ReceiptItem {
  return {
    id: row.id,
    userId: row.user_id,
    receiptImageUrl: row.receipt_image_url,
    itemName: row.item_name,
    priceEur: row.price_eur,
    supermarket: row.supermarket,
    purchasedAt: row.purchased_at,
    createdAt: row.created_at,
  };
}

export function mapUserFavorite(
  row: Database['public']['Tables']['user_favorites']['Row'] & { recipes?: Database['public']['Tables']['recipes']['Row'] | null },
): UserFavorite {
  return {
    id: row.id,
    userId: row.user_id,
    recipeId: row.recipe_id,
    recipe: row.recipes ? mapRecipe(row.recipes) : null,
    customName: row.custom_name,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export function mapAutomation(
  row: Database['public']['Tables']['automations']['Row'],
): Automation {
  return {
    id: row.id,
    userId: row.user_id,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type: row.type as any,
    enabled: row.enabled,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    config: row.config as any,
    createdAt: row.created_at,
  };
}

export function mapHousehold(
  row: Database['public']['Tables']['households']['Row'],
): Household {
  return {
    id: row.id,
    name: row.name,
    createdBy: row.created_by,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    managedMealSlots: (row.managed_meal_slots ?? []) as any[],
    shoppingDays: row.shopping_days ?? [],
    batchCookDays: row.batch_cook_days ?? 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapHouseholdMember(
  row: Database['public']['Tables']['household_members']['Row'] & { profiles?: Database['public']['Tables']['profiles']['Row'] | null },
): HouseholdMember {
  return {
    id: row.id,
    householdId: row.household_id,
    userId: row.user_id,
    displayName: row.profiles?.display_name ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    role: row.role as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    status: (row.status ?? 'active') as any,
    joinedAt: row.joined_at,
  };
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

/** Uploads a receipt image and returns the public URL. */
export async function uploadReceiptImage(
  userId: string,
  fileUri: string,
  mimeType: string = 'image/jpeg',
): Promise<string> {
  const fileName = `${userId}/${Date.now()}.jpg`;

  const response = await fetch(fileUri);
  const blob = await response.blob();

  const { error } = await supabase.storage
    .from('receipts')
    .upload(fileName, blob, { contentType: mimeType, upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from('receipts').getPublicUrl(fileName);
  return data.publicUrl;
}

// ─── Edge Function invoker ────────────────────────────────────────────────────

/**
 * Typed wrapper around Supabase Edge Functions.
 *
 * - Always ensures a valid, non-expired session before calling (refreshes if needed).
 * - Uses raw fetch so the full JSON error body is always readable.
 * - Throws with the actual server error message, never the generic SDK string.
 */
export async function invokeFunction<TBody, TResponse>(
  name: string,
  body: TBody,
): Promise<TResponse> {
  await ensureFreshSession();

  let result = await supabase.functions.invoke<TResponse>(name, {
    body: body as Record<string, unknown>,
  });

  if (isInvalidJwtError(result.error)) {
    console.warn(`[invokeFunction] ${name} got invalid JWT, refreshing session and retrying once`);
    await refreshCurrentSession();
    result = await supabase.functions.invoke<TResponse>(name, {
      body: body as Record<string, unknown>,
    });
  }

  const { data, error } = result;
  if (error) {
    const errorContext = (error as { context?: unknown }).context;
    const status =
      errorContext &&
      typeof errorContext === 'object' &&
      'status' in errorContext &&
      typeof errorContext.status === 'number'
        ? errorContext.status
        : null;

    let responseBody: unknown = null;

    if (
      errorContext &&
      typeof errorContext === 'object' &&
      'text' in errorContext &&
      typeof errorContext.text === 'function'
    ) {
      try {
        const rawBody = await errorContext.text();
        if (rawBody) {
          try {
            responseBody = JSON.parse(rawBody);
          } catch {
            responseBody = rawBody;
          }
        }
      } catch (bodyError) {
        responseBody = `[failed to read body: ${
          bodyError instanceof Error ? bodyError.message : String(bodyError)
        }]`;
      }
    }

    console.error(`[invokeFunction] ${name} failed`, {
      message: error.message,
      status,
      body: responseBody,
    });

    throw new Error(
      status != null ? `${error.message} (status ${status})` : error.message,
    );
  }

  return data as TResponse;
}

async function ensureFreshSession() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  if (!session) {
    throw new Error('Not authenticated');
  }

  const expiresAtMs = session.expires_at ? session.expires_at * 1000 : null;
  const willExpireSoon = expiresAtMs != null && expiresAtMs <= Date.now() + 60_000;

  if (willExpireSoon) {
    await refreshCurrentSession();
  }
}

async function refreshCurrentSession() {
  const { error } = await supabase.auth.refreshSession();
  if (error) {
    throw error;
  }
}

function isInvalidJwtError(error: { message?: string; context?: unknown } | null): boolean {
  if (!error) return false;

  const errorContext = error.context;
  const status =
    errorContext &&
    typeof errorContext === 'object' &&
    'status' in errorContext &&
    typeof errorContext.status === 'number'
      ? errorContext.status
      : null;

  const bodyMessage =
    errorContext &&
    typeof errorContext === 'object' &&
    'body' in errorContext &&
    typeof errorContext.body === 'object' &&
    errorContext.body &&
    'message' in errorContext.body &&
    typeof errorContext.body.message === 'string'
      ? errorContext.body.message
      : null;

  return status === 401 && (bodyMessage === 'Invalid JWT' || error.message === 'Edge Function returned a non-2xx status code');
}
