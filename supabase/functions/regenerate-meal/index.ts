// supabase/functions/regenerate-meal/index.ts
// Deno Edge Function — do not import Node-only modules.

import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

import { PLAN_GENERATION_SYSTEM_PROMPT } from '../_shared/prompts.ts';

// ─── Zod schemas (same as generate-plan) ─────────────────────────────────────

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

const SingleMealResponseSchema = z.object({
  recipe: RecipeSchema,
  alternativeRecipe: RecipeSchema,
});

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

    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !user) return errorResponse(`Unauthorized: ${authError?.message}`, 401);
    const userId = user.id;

    // ── Input ────────────────────────────────────────────────────────────────
    const body = await req.json() as { plannedMealId: string };
    const { plannedMealId } = body;
    if (!plannedMealId) return errorResponse('plannedMealId is required', 400);

    // ── Load the planned meal + plan context ─────────────────────────────────
    const { data: plannedMeal, error: pmError } = await supabase
      .from('planned_meals')
      .select('*, meal_plans(*), recipes!planned_meals_recipe_id_fkey(title)')
      .eq('id', plannedMealId)
      .single();

    if (pmError || !plannedMeal) return errorResponse('Planned meal not found', 404);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plan = (plannedMeal as any).meal_plans;
    if (plan.user_id !== userId) return errorResponse('Forbidden', 403);

    // ── Load all other meal titles in this plan (to avoid duplicates) ────────
    const { data: existingMeals } = await supabase
      .from('planned_meals')
      .select('recipes!planned_meals_recipe_id_fkey(title)')
      .eq('plan_id', plan.id)
      .neq('id', plannedMealId);

    const existingTitles = (existingMeals ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((m: any) => m.recipes?.title)
      .filter(Boolean) as string[];

    // ── Load user preferences ─────────────────────────────────────────────────
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    // ── Build Claude prompt ──────────────────────────────────────────────────
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentTitle = ((plannedMeal as any).recipes as { title: string } | null)?.title ?? 'current meal';

    const userPrompt = `
Generate a single meal replacement for the following slot:
- Day: ${dayNames[plannedMeal.day_of_week] ?? plannedMeal.day_of_week}
- Slot: ${plannedMeal.meal_slot}
- Current meal (to replace): "${currentTitle}"
- Meals already in this week's plan (do NOT repeat these): ${JSON.stringify(existingTitles)}

User preferences:
${JSON.stringify(prefs ?? {}, null, 2)}

Current month: ${new Date(plan.week_start).toLocaleString('en-US', { month: 'long' })}

Respond ONLY with a valid JSON object conforming to this exact structure:
{
  "recipe": { ...RecipeObject },
  "alternativeRecipe": { ...RecipeObject }
}
`.trim();

    // ── Call Claude ──────────────────────────────────────────────────────────
    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: PLAN_GENERATION_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const rawText = message.content[0].type === 'text' ? message.content[0].text : '';
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed: unknown = JSON.parse(cleaned);
    const validated = SingleMealResponseSchema.parse(parsed);

    // ── Persist ──────────────────────────────────────────────────────────────
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const primaryId = await upsertRecipe(serviceClient, userId, validated.recipe);
    const altId = await upsertRecipe(serviceClient, userId, validated.alternativeRecipe);

    const { error: updateError } = await serviceClient
      .from('planned_meals')
      .update({
        recipe_id: primaryId,
        alternative_recipe_id: altId,
        chosen_recipe_id: null,
        status: 'recommended',
      })
      .eq('id', plannedMealId);

    if (updateError) throw new Error(`Failed to update planned meal: ${updateError.message}`);

    return cors(Response.json({ success: true }));
  } catch (err) {
    console.error('[regenerate-meal]', err);
    return errorResponse(err instanceof Error ? err.message : 'Internal server error', 500);
  }
});

// ─── DB helpers ───────────────────────────────────────────────────────────────

async function upsertRecipe(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  if (error || !data) throw new Error(`Failed to insert recipe "${recipe.title}": ${error?.message}`);
  return data.id as string;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function cors(res: Response): Response {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
  return res;
}

function errorResponse(message: string, status: number): Response {
  return cors(Response.json({ error: message }, { status }));
}
