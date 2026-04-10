// supabase/functions/join-household/index.ts
// Validates an invite token and adds the calling user to the household.
// Body: { token: string }
// Returns: { householdId: string; householdName: string }

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

    const body = await req.json() as { token: string };
    if (!body.token) return errorResponse('token is required', 400);

    // Read invite (any authenticated user can read by token per RLS)
    const { data: invite, error: inviteError } = await supabase
      .from('household_invites')
      .select('*, households(id, name)')
      .eq('token', body.token)
      .maybeSingle();

    if (inviteError || !invite) return errorResponse('Invite not found', 404);

    // Check expiry
    if (new Date(invite.expires_at) < new Date()) {
      return errorResponse('This invite link has expired', 410);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const household = (invite as any).households as { id: string; name: string } | null;
    if (!household) return errorResponse('Household not found', 404);

    // Check if already a member (idempotent)
    const { data: existingMember } = await supabase
      .from('household_members')
      .select('id')
      .eq('household_id', household.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingMember) {
      // Already a member — return success silently
      return cors(Response.json({ householdId: household.id, householdName: household.name }));
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { error: memberError } = await serviceClient
      .from('household_members')
      .insert({
        household_id: household.id,
        user_id: user.id,
        role: 'member',
      });

    if (memberError) throw new Error(`Failed to join household: ${memberError.message}`);

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
