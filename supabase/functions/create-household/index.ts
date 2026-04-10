// supabase/functions/create-household/index.ts
// Creates a new household, adds the caller as owner, and returns a default invite link.
// Body: { name: string; managedMealSlots: string[]; shoppingDays: number[]; batchCookDays: number }
// Returns: { householdId: string; inviteLink: string }

import { createClient } from 'npm:@supabase/supabase-js@2';

const APP_SCHEME = Deno.env.get('APP_SCHEME') ?? 'plateplan';

/** Generates a 256-bit URL-safe base64 token and its SHA-256 hex hash. */
async function generateInviteToken(): Promise<{ token: string; tokenHash: string }> {
  const rawBytes = new Uint8Array(32);
  crypto.getRandomValues(rawBytes);
  const token = btoa(String.fromCharCode(...rawBytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  const data = new TextEncoder().encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const tokenHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return { token, tokenHash };
}

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

    // 1. Create the household
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

    // 2. Add creator as owner
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

    // 3. Create a default invite token (7-day expiry, unlimited uses) — non-fatal
    let inviteLink = `${APP_SCHEME}://invite/`;
    try {
      const { token, tokenHash } = await generateInviteToken();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      await serviceClient
        .from('household_invites')
        .insert({
          household_id: household.id,
          token_hash: tokenHash,
          created_by: user.id,
          expires_at: expiresAt,
        });

      inviteLink = `${APP_SCHEME}://invite/${token}`;
    } catch (inviteErr) {
      console.warn('[create-household] Failed to create default invite:', inviteErr);
    }

    return cors(Response.json({ householdId: household.id, inviteLink }));
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
