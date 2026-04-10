-- supabase/migrations/20260410000001_invite_links.sql
-- Upgrades household_invites to use hashed tokens with usage limits.
-- Adds status column to household_members for future direct-invite support.

-- ── household_invites: rename token → token_hash, add usage tracking ──────────

alter table public.household_invites rename column token to token_hash;

alter table public.household_invites
  add column usage_limit int     default null,  -- null = unlimited
  add column uses_count  int not null default 0;

-- ── household_members: add status ─────────────────────────────────────────────

alter table public.household_members
  add column status text not null default 'active'
    check (status in ('active', 'pending'));

-- ── household_invites: allow owners to delete tokens (regenerate) ─────────────

create policy "household_invites_delete_owner" on public.household_invites
  for delete using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = household_id
        and hm.user_id = auth.uid()
        and hm.role = 'owner'
    )
  );

-- ── household_invites: allow service role to increment uses_count ─────────────

create policy "household_invites_update_service" on public.household_invites
  for update using (true);
