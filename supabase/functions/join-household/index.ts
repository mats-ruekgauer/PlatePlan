// supabase/functions/join-household/index.ts
// Validates an invite token (by hash) and adds the calling user to the household.
// Body: { token: string }
// Returns: { householdId: string; householdName: string }

import { createClient } from 'npm:@supabase/supabase-js@2';

/** SHA-256 hex hash of the raw token string. */
async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
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

    const body = await req.json() as { token: string };
    if (!body.token) return errorResponse('token is required', 400);

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Hash the raw token and look up the stored record
    const tokenHash = await hashToken(body.token);

    const { data: invite, error: inviteError } = await serviceClient
      .from('household_invites')
      .select('*, households(id, name)')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (inviteError || !invite) return errorResponse('Invite not found', 404);

    // Check expiry
    if (new Date(invite.expires_at) < new Date()) {
      return errorResponse('This invite link has expired', 410);
    }

    // Check usage limit
    if (invite.usage_limit !== null && invite.uses_count >= invite.usage_limit) {
      return errorResponse('This invite link has reached its usage limit', 410);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const household = (invite as any).households as { id: string; name: string } | null;
    if (!household) return errorResponse('Household not found', 404);

    // Check if already a member (idempotent)
    const { data: existingMember } = await serviceClient
      .from('household_members')
      .select('id')
      .eq('household_id', household.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingMember) {
      return cors(Response.json({ householdId: household.id, householdName: household.name }));
    }

    // Add new member
    const { error: memberError } = await serviceClient
      .from('household_members')
      .insert({
        household_id: household.id,
        user_id: user.id,
        role: 'member',
      });

    if (memberError) throw new Error(`Failed to join household: ${memberError.message}`);

    // Increment uses_count
    await serviceClient
      .from('household_invites')
      .update({ uses_count: invite.uses_count + 1 })
      .eq('id', invite.id);

    return cors(Response.json({ householdId: household.id, householdName: household.name }));
  } catch (err) {
    console.error('[join-household]', err);
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
