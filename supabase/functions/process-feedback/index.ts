// supabase/functions/process-feedback/index.ts

import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

// ─── Input schema ─────────────────────────────────────────────────────────────

const FeedbackSchema = z.object({
  plannedMealId: z.string().uuid().nullable().optional(),
  recipeId: z.string().uuid(),
  tasteRating: z.number().int().min(1).max(5).nullable().optional(),
  portionRating: z.number().int().min(1).max(5).nullable().optional(),
  wouldRepeat: z.boolean().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

type FeedbackInput = z.infer<typeof FeedbackSchema>;

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return cors(new Response('ok'));

  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return errorResponse('Missing Authorization header', 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return errorResponse('Unauthorized', 401);
    const userId = user.id;

    // ── Validate input ────────────────────────────────────────────────────────
    const body = await req.json();
    const parsed = FeedbackSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }
    const feedback: FeedbackInput = parsed.data;

    // ── Insert feedback ───────────────────────────────────────────────────────
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: inserted, error: insertError } = await serviceClient
      .from('meal_feedback')
      .insert({
        user_id: userId,
        planned_meal_id: feedback.plannedMealId ?? null,
        recipe_id: feedback.recipeId,
        taste_rating: feedback.tasteRating ?? null,
        portion_rating: feedback.portionRating ?? null,
        would_repeat: feedback.wouldRepeat ?? null,
        notes: feedback.notes ?? null,
      })
      .select()
      .single();

    if (insertError || !inserted) {
      throw new Error(`Failed to insert feedback: ${insertError?.message}`);
    }

    // ── Soft-blacklist disliked recipes ───────────────────────────────────────
    // If wouldRepeat=false, add the recipe's main ingredients to disliked_ingredients
    if (feedback.wouldRepeat === false) {
      await addIngredientsToBlacklist(serviceClient, userId, feedback.recipeId);
    }

    return cors(Response.json({ feedback: inserted }));
  } catch (err) {
    console.error('[process-feedback]', err);
    return errorResponse(err instanceof Error ? err.message : 'Internal server error', 500);
  }
});

// ─── Blacklist helper ─────────────────────────────────────────────────────────

async function addIngredientsToBlacklist(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serviceClient: any,
  userId: string,
  recipeId: string,
): Promise<void> {
  // Fetch recipe ingredients
  const { data: recipe } = await serviceClient
    .from('recipes')
    .select('ingredients, title')
    .eq('id', recipeId)
    .single();

  if (!recipe) return;

  // Extract the top 3 main ingredients (by amount) as blacklist candidates
  // We only blacklist main ingredients — not spices or pantry staples — to
  // avoid over-restricting the user's future plans.
  // TODO: A smarter heuristic could use the `category` field to skip spices.
  const ingredients = (recipe.ingredients as Array<{ name: string; amount: number; category?: string }>) ?? [];

  const mainIngredients = ingredients
    .filter((i) => {
      const cat = (i.category ?? '').toLowerCase();
      return cat !== 'spice' && cat !== 'pantry';
    })
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3)
    .map((i) => i.name.toLowerCase().trim());

  if (mainIngredients.length === 0) return;

  // Merge with existing disliked_ingredients (deduplicate)
  const { data: prefs } = await serviceClient
    .from('user_preferences')
    .select('disliked_ingredients')
    .eq('user_id', userId)
    .single();

  const existing: string[] = prefs?.disliked_ingredients ?? [];
  const merged = Array.from(new Set([...existing, ...mainIngredients]));

  await serviceClient
    .from('user_preferences')
    .update({ disliked_ingredients: merged })
    .eq('user_id', userId);
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
