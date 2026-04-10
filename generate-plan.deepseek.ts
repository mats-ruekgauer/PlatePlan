// supabase/functions/generate-plan/index.ts
// Deno Edge Function — do not import Node-only modules.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

import {
  buildPlanGenerationUserPrompt,
  PLAN_GENERATION_SYSTEM_PROMPT,
} from './supabase/functions/_shared/prompts.ts';

const IngredientSchema = z.object({
  name: z.string().min(1),
  amount: z.number().positive(),
  unit: z.string().min(1),
  category: z.string().optional(),
});

const RecipeSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  ingredients: z.array(IngredientSchema).min(1),
  steps: z.array(z.string()).min(1),
  caloriesPerServing: z.number().positive(),
  proteinPerServingG: z.number().nonnegative(),
  carbsPerServingG: z.number().nonnegative(),
  fatPerServingG: z.number().nonnegative(),
  servings: z.number().int().positive(),
  cookTimeMinutes: z.number().positive(),
  cuisine: z.string(),
  tags: z.array(z.string()),
  isSeasonal: z.boolean(),
  season: z.enum(['spring', 'summer', 'autumn', 'winter', 'all']),
  estimatedPriceEur: z.number().nonnegative(),
});

const MealSlotSchema = z.object({
  slot: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  recipe: RecipeSchema,
  alternativeRecipe: RecipeSchema,
});

const DaySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  meals: z.array(MealSlotSchema).min(1),
});

const PlanResponseSchema = z.object({
  days: z.array(DaySchema).min(1),
});

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return cors(new Response('ok'));
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return errorResponse('Missing Authorization header', 401);
    const jwt = authHeader.replace('Bearer ', '');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(jwt);

    if (authError || !user) {
      return errorResponse(`Unauthorized: ${authError?.message}`, 401);
    }

    const userId = user.id;

    const body = (await req.json()) as { weekStart: string };
    const weekStart = body.weekStart;

    if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
      return errorResponse('weekStart must be an ISO date string (YYYY-MM-DD)', 400);
    }

    const { data: prefs, error: prefsError } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (prefsError || !prefs) {
      return errorResponse('User preferences not found', 404);
    }

    const { data: feedbackRows } = await supabase
      .from('meal_feedback')
      .select('recipe_id, taste_rating, portion_rating, would_repeat, notes, recipes(title)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    const feedbackHistory = (feedbackRows ?? []).map((row) => ({
      recipeTitle: (row.recipes as { title: string } | null)?.title ?? 'Unknown',
      tasteRating: row.taste_rating,
      portionRating: row.portion_rating,
      wouldRepeat: row.would_repeat,
      notes: row.notes,
    }));

    const { data: favRows } = await supabase
      .from('user_favorites')
      .select('custom_name, recipes(title, cuisine)')
      .eq('user_id', userId);

    const favoriteDishes = (favRows ?? [])
      .map((row) => {
        const r = row as any;
        return {
          name: r.recipes?.title ?? r.custom_name ?? null,
          cuisine: r.recipes?.cuisine ?? null,
        };
      })
      .filter((f) => f.name !== null);

    const currentMonth = new Date(weekStart).toLocaleString('en-US', { month: 'long' });
    const userPrompt = buildPlanGenerationUserPrompt({
      weekStart,
      preferences: prefs,
      feedbackHistory,
      favoriteDishes,
      manualRecipes: [],
      currentMonth,
    });

    const plan = await callDeepSeekWithRetry(userPrompt);

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: mealPlan, error: planError } = await serviceClient
      .from('meal_plans')
      .upsert(
        { user_id: userId, week_start: weekStart, status: 'active' },
        { onConflict: 'user_id,week_start' },
      )
      .select()
      .single();

    if (planError || !mealPlan) {
      throw new Error(`Failed to upsert meal plan: ${planError?.message}`);
    }

    const insertedMeals: Array<{ id: string; day_of_week: number; meal_slot: string }> = [];

    for (const day of plan.days) {
      for (const mealSlot of day.meals) {
        const primaryRecipeId = await upsertRecipe(serviceClient, userId, mealSlot.recipe);
        const altRecipeId = await upsertRecipe(serviceClient, userId, mealSlot.alternativeRecipe);

        const { data: pm, error: pmError } = await serviceClient
          .from('planned_meals')
          .upsert(
            {
              plan_id: mealPlan.id,
              day_of_week: day.dayOfWeek,
              meal_slot: mealSlot.slot,
              recipe_id: primaryRecipeId,
              alternative_recipe_id: altRecipeId,
            },
            { onConflict: 'plan_id,day_of_week,meal_slot' },
          )
          .select()
          .single();

        if (pmError || !pm) {
          throw new Error(`Failed to upsert planned meal: ${pmError?.message}`);
        }

        insertedMeals.push(pm);
      }
    }

    return cors(
      Response.json({
        planId: mealPlan.id,
        meals: insertedMeals,
      }),
    );
  } catch (err) {
    console.error('[generate-plan]', err);
    return errorResponse(err instanceof Error ? err.message : 'Internal server error', 500);
  }
});

async function callDeepSeekWithRetry(userPrompt: string, maxAttempts = 3) {
  const apiKey = Deno.env.get('DEEPSEEK_API_KEY');
  if (!apiKey) {
    throw new Error('Missing DEEPSEEK_API_KEY secret');
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: PLAN_GENERATION_SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 8192,
          temperature: 0.2,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const bodyText = await response.text();
        throw new Error(`DeepSeek API error (${response.status}): ${bodyText}`);
      }

      const data = await response.json() as any;
      const rawText = data?.choices?.[0]?.message?.content ?? '';

      if (!rawText.trim()) {
        throw new Error('DeepSeek returned empty content');
      }

      const cleaned = rawText
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      const parsed = JSON.parse(cleaned);
      return PlanResponseSchema.parse(parsed);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[generate-plan] attempt ${attempt} failed:`, lastError.message);

      if (attempt < maxAttempts) {
        await sleep(500 * 2 ** (attempt - 1));
      }
    }
  }

  throw lastError ?? new Error('Plan generation failed after retries');
}

async function upsertRecipe(
  client: any,
  userId: string,
  recipe: z.infer<typeof RecipeSchema>,
): Promise<string> {
  const { data: existing } = await client
    .from('recipes')
    .select('id')
    .eq('user_id', userId)
    .eq('title', recipe.title)
    .maybeSingle();

  if (existing?.id) return existing.id as string;

  const { data, error } = await client
    .from('recipes')
    .insert({
      user_id: userId,
      title: recipe.title,
      description: recipe.description,
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      calories_per_serving: recipe.caloriesPerServing,
      protein_per_serving_g: recipe.proteinPerServingG,
      carbs_per_serving_g: recipe.carbsPerServingG,
      fat_per_serving_g: recipe.fatPerServingG,
      servings: recipe.servings,
      cook_time_minutes: recipe.cookTimeMinutes,
      cuisine: recipe.cuisine,
      tags: recipe.tags,
      is_seasonal: recipe.isSeasonal,
      season: recipe.season,
      estimated_price_eur: recipe.estimatedPriceEur,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Failed to insert recipe "${recipe.title}": ${error?.message}`);
  }

  return data.id as string;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function cors(res: Response): Response {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
  return res;
}

function errorResponse(message: string, status: number): Response {
  return cors(Response.json({ error: message }, { status }));
}
