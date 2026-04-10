// supabase/functions/create-invite/index.ts
// Generates a 7-day invite token for a household.
// Body: { householdId: string }
// Returns: { token: string; expiresAt: string }

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

    const body = await req.json() as { householdId: string };
    if (!body.householdId) return errorResponse('householdId is required', 400);

    // Verify caller is a member of this household
    const { data: membership } = await supabase
      .from('household_members')
      .select('id')
      .eq('household_id', body.householdId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership) return errorResponse('Forbidden: not a member of this household', 403);

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { error: insertError } = await serviceClient
      .from('household_invites')
      .insert({
        household_id: body.householdId,
        token,
        created_by: user.id,
        expires_at: expiresAt,
      });

    if (insertError) throw new Error(`Failed to create invite: ${insertError.message}`);

    return cors(Response.json({ token, expiresAt }));
  } catch (err) {
    console.error('[create-invite]', err);
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
