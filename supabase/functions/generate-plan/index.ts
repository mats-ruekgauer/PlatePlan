// supabase/functions/generate-plan/index.ts
// Deno Edge Function — do not import Node-only modules.

import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

import {
  buildPlanGenerationUserPrompt,
  PLAN_GENERATION_SYSTEM_PROMPT,
} from '../_shared/prompts.ts';

// ─── Zod schemas for Claude response validation ───────────────────────────────

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

type ValidatedPlan = z.infer<typeof PlanResponseSchema>;

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return cors(new Response('ok'));
  }

  try {
    // ── Auth ────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return errorResponse('Missing Authorization header', 401);
    const jwt = authHeader.replace('Bearer ', '');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    // Pass the JWT explicitly so getUser() validates it against the Auth API
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !user) return errorResponse(`Unauthorized: ${authError?.message}`, 401);
    const userId = user.id;

    // ── Input ────────────────────────────────────────────────────────────────
    const body = await req.json() as { weekStart: string };
    const weekStart: string = body.weekStart;
    if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
      return errorResponse('weekStart must be an ISO date string (YYYY-MM-DD)', 400);
    }

    // ── Load preferences ─────────────────────────────────────────────────────
    const { data: prefs, error: prefsError } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (prefsError || !prefs) return errorResponse('User preferences not found', 404);

    // ── Load last 10 feedback entries ────────────────────────────────────────
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

    // ── Build Claude prompt ──────────────────────────────────────────────────
    const currentMonth = new Date(weekStart).toLocaleString('en-US', { month: 'long' });
    const userPrompt = buildPlanGenerationUserPrompt({
      weekStart,
      preferences: prefs,
      feedbackHistory,
      currentMonth,
    });

    // ── Call Claude (with retry) ─────────────────────────────────────────────
    const plan = await callClaudeWithRetry(userPrompt);

    // ── Persist to DB ────────────────────────────────────────────────────────
    // Use service-role client for inserts so RLS doesn't block Edge Function writes
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Upsert meal plan row
    const { data: mealPlan, error: planError } = await serviceClient
      .from('meal_plans')
      .upsert(
        { user_id: userId, week_start: weekStart, status: 'active' },
        { onConflict: 'user_id,week_start' },
      )
      .select()
      .single();
    if (planError || !mealPlan) throw new Error(`Failed to upsert meal plan: ${planError?.message}`);

    const insertedMeals: Array<{ id: string; day_of_week: number; meal_slot: string }> = [];

    for (const day of plan.days) {
      for (const mealSlot of day.meals) {
        // Insert primary recipe
        const primaryRecipeId = await upsertRecipe(serviceClient, userId, mealSlot.recipe);
        // Insert alternative recipe
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
        if (pmError || !pm) throw new Error(`Failed to upsert planned meal: ${pmError?.message}`);
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

// ─── Claude call with exponential backoff retry ───────────────────────────────

async function callClaudeWithRetry(userPrompt: string, maxAttempts = 3): Promise<ValidatedPlan> {
  const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        system: PLAN_GENERATION_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const rawText =
        message.content[0].type === 'text' ? message.content[0].text : '';

      // Strip any accidental markdown code fences
      const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

      const parsed: unknown = JSON.parse(cleaned);
      const validated = PlanResponseSchema.parse(parsed);
      return validated;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[generate-plan] attempt ${attempt} failed:`, lastError.message);
      if (attempt < maxAttempts) {
        await sleep(500 * 2 ** (attempt - 1)); // 500ms, 1000ms
      }
    }
  }

  throw lastError ?? new Error('Plan generation failed after retries');
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

async function upsertRecipe(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  userId: string,
  recipe: z.infer<typeof RecipeSchema>,
): Promise<string> {
  // Check if a recipe with the same title already exists for this user
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
    })
    .select('id')
    .single();

  if (error || !data) throw new Error(`Failed to insert recipe "${recipe.title}": ${error?.message}`);
  return data.id as string;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

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
