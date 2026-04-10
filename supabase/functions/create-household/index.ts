// supabase/functions/create-household/index.ts
// Creates a new household and adds the calling user as owner.
// Body: { name: string; managedMealSlots: string[]; shoppingDays: number[]; batchCookDays: number }
// Returns: { householdId: string }

import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return cors(new Response('ok'));

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return errorResponse('Missing Authorization header', 401);
    const jwt = authHeader.replace('Bearer ', '');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !user) return errorResponse('Unauthorized', 401);

    const body = await req.json() as {
      name: string;
      managedMealSlots: string[];
      shoppingDays: number[];
      batchCookDays: number;
    };

    if (!body.name?.trim()) return errorResponse('name is required', 400);

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Create the household
    const { data: household, error: hhError } = await serviceClient
      .from('households')
      .insert({
        name: body.name.trim(),
        created_by: user.id,
        managed_meal_slots: body.managedMealSlots ?? ['dinner'],
        shopping_days: body.shoppingDays ?? [1],
        batch_cook_days: body.batchCookDays ?? 1,
      })
      .select('id')
      .single();

    if (hhError || !household) {
      throw new Error(`Failed to create household: ${hhError?.message}`);
    }

    // Add creator as owner
    const { error: memberError } = await serviceClient
      .from('household_members')
      .insert({
        household_id: household.id,
        user_id: user.id,
        role: 'owner',
      });

    if (memberError) {
      throw new Error(`Failed to add owner member: ${memberError.message}`);
    }

    return cors(Response.json({ householdId: household.id }));
  } catch (err) {
    console.error('[create-household]', err);
    return errorResponse(err instanceof Error ? err.message : 'Internal server error', 500);
  }
});

function cors(res: Response): Response {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
  return res;
}

function errorResponse(message: string, status: number): Response {
  return cors(Response.json({ error: message }, { status }));
}
