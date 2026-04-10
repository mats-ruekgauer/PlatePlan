// supabase/functions/generate-shopping-list/index.ts
// Deterministic — no Claude call. Aggregates ingredients from a plan.

import { createClient } from 'npm:@supabase/supabase-js@2';

interface Ingredient {
  name: string;
  amount: number;
  unit: string;
  category?: string;
}

interface ShoppingItem extends Ingredient {
  checked: boolean;
  forMeals: string[];
}

interface GroupedList {
  shoppingDate: string;
  label: string;
  categories: Array<{
    category: string;
    items: ShoppingItem[];
  }>;
}

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

    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !user) return errorResponse('Unauthorized', 401);
    const userId = user.id;

    // ── Input ─────────────────────────────────────────────────────────────────
    const body = await req.json() as { planId: string };
    if (!body.planId) return errorResponse('planId is required', 400);

    // ── Load plan + meals + recipes ───────────────────────────────────────────
    // RLS ensures the user can only see plans for households they belong to
    const { data: plan, error: planError } = await supabase
      .from('meal_plans')
      .select('id, week_start, household_id')
      .eq('id', body.planId)
      .single();
    if (planError || !plan) return errorResponse('Plan not found', 404);

    const { data: plannedMeals, error: mealsError } = await supabase
      .from('planned_meals')
      .select(`
        id,
        day_of_week,
        meal_slot,
        chosen_recipe_id,
        recipe_id,
        recipes!planned_meals_recipe_id_fkey (
          title, ingredients, servings
        ),
        chosen_recipe:recipes!planned_meals_chosen_recipe_id_fkey (
          title, ingredients, servings
        )
      `)
      .eq('plan_id', body.planId);
    if (mealsError) throw new Error(mealsError.message);

    // ── Load user preferences (for pantry staples + shopping days) ────────────
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('pantry_staples, shopping_days')
      .eq('user_id', userId)
      .maybeSingle();

    const pantryStaples: string[] = (prefs?.pantry_staples ?? []).map((s: string) =>
      s.toLowerCase().trim(),
    );
    const shoppingDays: number[] = prefs?.shopping_days ?? [];

    // ── Aggregate ingredients ─────────────────────────────────────────────────
    // Key: "name||unit" → merged ShoppingItem
    const merged = new Map<string, ShoppingItem>();

    for (const pm of plannedMeals ?? []) {
      // Use the chosen recipe if the user swapped, otherwise the default
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recipe: { title: string; ingredients: Ingredient[]; servings: number } | null =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (pm.chosen_recipe_id ? (pm as any).chosen_recipe : (pm as any).recipes) ?? null;

      if (!recipe) continue;

      const ingredients = (recipe.ingredients ?? []) as Ingredient[];

      for (const ing of ingredients) {
        const normName = ing.name.toLowerCase().trim();
        const normUnit = ing.unit.toLowerCase().trim();

        // Skip pantry staples
        if (pantryStaples.some((staple) => normName.includes(staple) || staple.includes(normName))) {
          continue;
        }

        const key = `${normName}||${normUnit}`;
        const existing = merged.get(key);

        if (existing) {
          existing.amount += ing.amount;
          if (!existing.forMeals.includes(recipe.title)) {
            existing.forMeals.push(recipe.title);
          }
        } else {
          merged.set(key, {
            name: normName,
            amount: ing.amount,
            unit: normUnit,
            category: ing.category ?? 'other',
            checked: false,
            forMeals: [recipe.title],
          });
        }
      }
    }

    const allItems = Array.from(merged.values());

    // ── Group by shopping day ─────────────────────────────────────────────────
    const weekStart = new Date(plan.week_start);
    const grouped = groupByShoppingDay(allItems, plannedMeals ?? [], shoppingDays, weekStart);

    // ── Persist the shopping list ─────────────────────────────────────────────
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: savedList, error: saveError } = await serviceClient
      .from('shopping_lists')
      .upsert(
        {
          household_id: plan.household_id,
          plan_id: body.planId,
          items: allItems,
        },
        { onConflict: 'household_id,plan_id' } as Record<string, unknown>,
      )
      .select('id')
      .single();
    if (saveError) console.warn('[generate-shopping-list] save warning:', saveError.message);

    return cors(
      Response.json({
        listId: savedList?.id ?? null,
        grouped,
        allItems,
      }),
    );
  } catch (err) {
    console.error('[generate-shopping-list]', err);
    return errorResponse(err instanceof Error ? err.message : 'Internal server error', 500);
  }
});

// ─── Grouping logic ───────────────────────────────────────────────────────────

function groupByShoppingDay(
  items: ShoppingItem[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plannedMeals: any[],
  shoppingDays: number[], // day-of-week numbers (0=Sun)
  weekStart: Date,
): GroupedList[] {
  if (shoppingDays.length === 0) {
    // No shopping days configured — return everything in one group
    return [
      {
        shoppingDate: weekStart.toISOString().split('T')[0],
        label: "This week's shop",
        categories: groupByCategory(items),
      },
    ];
  }

  // Sort shopping days within the week
  const sortedDays = [...shoppingDays].sort((a, b) => {
    // Normalise to Mon-based offset: Mon=0, …, Sun=6
    const toOffset = (d: number) => (d === 0 ? 6 : d - 1);
    return toOffset(a) - toOffset(b);
  });

  // Map day-of-week → absolute date in the current week
  function dateForDay(dow: number): Date {
    const offset = dow === 0 ? 6 : dow - 1; // Mon offset
    const d = new Date(weekStart);
    d.setDate(d.getDate() + offset);
    return d;
  }

  // Determine which shopping trip covers which meal days
  // A meal on dayOfWeek D is bought on the nearest shopping day <= D
  const groups: GroupedList[] = sortedDays.map((dow) => ({
    shoppingDate: dateForDay(dow).toISOString().split('T')[0],
    label: formatShoppingLabel(dow),
    categories: [],
  }));

  // Build a set of recipe titles for each shopping group
  const groupRecipeTitles: Set<string>[] = sortedDays.map(() => new Set<string>());

  for (const pm of plannedMeals) {
    const mealOffset = pm.day_of_week; // Mon-based (0=Mon)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recipe: { title: string } | null = (pm.chosen_recipe_id ? (pm as any).chosen_recipe : (pm as any).recipes) ?? null;
    if (!recipe) continue;

    // Find latest shopping day that is <= meal day
    let groupIdx = 0;
    for (let i = sortedDays.length - 1; i >= 0; i--) {
      const shoppingOffset = sortedDays[i] === 0 ? 6 : sortedDays[i] - 1;
      if (shoppingOffset <= mealOffset) {
        groupIdx = i;
        break;
      }
    }
    groupRecipeTitles[groupIdx].add(recipe.title);
  }

  // Assign items to groups based on which recipes they belong to
  // Items that span multiple groups go into the first group
  for (const item of items) {
    let assignedGroup = -1;
    for (let gi = 0; gi < groups.length; gi++) {
      if (item.forMeals.some((title) => groupRecipeTitles[gi].has(title))) {
        assignedGroup = gi;
        break;
      }
    }
    if (assignedGroup === -1) assignedGroup = 0; // fallback

    const group = groups[assignedGroup];
    const catLabel = normaliseCategoryLabel(item.category ?? 'other');
    let cat = group.categories.find((c) => c.category === catLabel);
    if (!cat) {
      cat = { category: catLabel, items: [] };
      group.categories.push(cat);
    }
    cat.items.push(item);
  }

  // Sort categories within each group
  const CATEGORY_ORDER = ['Produce', 'Meat & Fish', 'Dairy', 'Pantry', 'Other'];
  for (const group of groups) {
    group.categories.sort(
      (a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category),
    );
  }

  return groups.filter((g) => g.categories.length > 0);
}

function groupByCategory(items: ShoppingItem[]): GroupedList['categories'] {
  const map = new Map<string, ShoppingItem[]>();
  for (const item of items) {
    const cat = normaliseCategoryLabel(item.category ?? 'other');
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(item);
  }
  return Array.from(map.entries()).map(([category, items]) => ({ category, items }));
}

function normaliseCategoryLabel(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower === 'produce' || lower === 'vegetable' || lower === 'fruit') return 'Produce';
  if (lower === 'meat' || lower === 'fish' || lower === 'seafood' || lower === 'poultry') return 'Meat & Fish';
  if (lower === 'dairy' || lower === 'cheese' || lower === 'milk') return 'Dairy';
  if (lower === 'pantry' || lower === 'spice' || lower === 'condiment' || lower === 'grain') return 'Pantry';
  return 'Other';
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatShoppingLabel(dow: number): string {
  return `${DAY_NAMES[dow]}'s shop`;
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
