-- supabase/migrations/20260410000000_household_accounts.sql

-- ── New tables ────────────────────────────────────────────────────────────────

create table public.households (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  created_by    uuid not null references auth.users(id) on delete cascade,
  -- Household-level planning settings (moved from user_preferences)
  managed_meal_slots  text[]  not null default '{"dinner"}',
  shopping_days       int[]   not null default '{1}',
  batch_cook_days     int     not null default 1,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.household_members (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references public.households(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  role           text not null default 'member' check (role in ('owner', 'member')),
  joined_at      timestamptz not null default now(),
  unique (household_id, user_id)
);

create table public.household_invites (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references public.households(id) on delete cascade,
  token          text not null unique,
  created_by     uuid not null references auth.users(id) on delete cascade,
  expires_at     timestamptz not null,
  created_at     timestamptz not null default now()
);

-- ── Modify meal_plans ─────────────────────────────────────────────────────────

alter table public.meal_plans
  drop column if exists user_id,
  add column household_id uuid not null references public.households(id) on delete cascade;

-- Replace old unique constraint (user_id, week_start) with (household_id, week_start)
alter table public.meal_plans
  drop constraint if exists meal_plans_user_id_week_start_key;

alter table public.meal_plans
  add constraint meal_plans_household_id_week_start_key unique (household_id, week_start);

-- ── Modify shopping_lists ─────────────────────────────────────────────────────

alter table public.shopping_lists
  drop column if exists user_id,
  add column household_id uuid not null references public.households(id) on delete cascade;

-- ── RLS: households ───────────────────────────────────────────────────────────

alter table public.households enable row level security;

-- Members can read households they belong to
create policy "households_select" on public.households
  for select using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = id and hm.user_id = auth.uid()
    )
  );

-- Owner can update household settings
create policy "households_update" on public.households
  for update using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = id and hm.user_id = auth.uid() and hm.role = 'owner'
    )
  );

-- Service role handles inserts (Edge Functions)
create policy "households_insert_service" on public.households
  for insert with check (true);

-- ── RLS: household_members ────────────────────────────────────────────────────

alter table public.household_members enable row level security;

-- Any member can see all members of households they belong to
create policy "household_members_select" on public.household_members
  for select using (
    exists (
      select 1 from public.household_members hm2
      where hm2.household_id = household_id and hm2.user_id = auth.uid()
    )
  );

-- Service role handles inserts and deletes
create policy "household_members_insert_service" on public.household_members
  for insert with check (true);

create policy "household_members_delete_service" on public.household_members
  for delete using (true);

-- ── RLS: household_invites ────────────────────────────────────────────────────

alter table public.household_invites enable row level security;

-- Any authenticated user can read by token (needed for join validation)
create policy "household_invites_select" on public.household_invites
  for select using (auth.uid() is not null);

-- Members can create invites for their households
create policy "household_invites_insert" on public.household_invites
  for insert with check (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = household_id and hm.user_id = auth.uid()
    )
  );

-- Service role handles inserts
create policy "household_invites_insert_service" on public.household_invites
  for insert with check (true);

-- ── RLS: meal_plans (update existing policies) ────────────────────────────────

drop policy if exists "meal_plans_select" on public.meal_plans;
drop policy if exists "meal_plans_insert" on public.meal_plans;
drop policy if exists "meal_plans_update" on public.meal_plans;
drop policy if exists "meal_plans_delete" on public.meal_plans;

create policy "meal_plans_member_access" on public.meal_plans
  for all using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = household_id and hm.user_id = auth.uid()
    )
  );

-- ── RLS: shopping_lists (update existing policies) ────────────────────────────

drop policy if exists "shopping_lists_select" on public.shopping_lists;
drop policy if exists "shopping_lists_insert" on public.shopping_lists;
drop policy if exists "shopping_lists_update" on public.shopping_lists;
drop policy if exists "shopping_lists_delete" on public.shopping_lists;

create policy "shopping_lists_member_access" on public.shopping_lists
  for all using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = household_id and hm.user_id = auth.uid()
    )
  );
