-- Venue owner portal: managers, claims, RLS

create type public.venue_manager_role as enum ('owner', 'manager');

create type public.venue_claim_status as enum ('pending', 'approved', 'rejected');

-- ---------------------------------------------------------------------------
-- venue_managers — links auth users to venues they may edit
-- ---------------------------------------------------------------------------

create table public.venue_managers (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.venue_manager_role not null default 'manager',
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint venue_managers_unique_user_venue unique (venue_id, user_id)
);

create index venue_managers_user_id_idx on public.venue_managers (user_id);
create index venue_managers_venue_id_idx on public.venue_managers (venue_id);

comment on table public.venue_managers is
  'Users who may edit a venue via /manage (not admin). Does not grant is_admin.';

-- ---------------------------------------------------------------------------
-- venue_claim_requests — Phase 2 self-serve claim workflow
-- ---------------------------------------------------------------------------

create table public.venue_claim_requests (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  message text,
  status public.venue_claim_status not null default 'pending',
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index venue_claim_requests_one_pending_per_user_venue
  on public.venue_claim_requests (venue_id, user_id)
  where status = 'pending';

create index venue_claim_requests_status_idx on public.venue_claim_requests (status);
create index venue_claim_requests_venue_id_idx on public.venue_claim_requests (venue_id);

create trigger venue_claim_requests_set_updated_at
  before update on public.venue_claim_requests
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_venue_manager(p_venue_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.venue_managers vm
    where vm.venue_id = p_venue_id
      and vm.user_id = auth.uid()
  );
$$;

revoke all on function public.is_venue_manager(uuid) from public;
grant execute on function public.is_venue_manager(uuid) to authenticated;

create or replace function public.is_venue_manager_for_any_managed_venue()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.venue_managers vm where vm.user_id = auth.uid()
  );
$$;

revoke all on function public.is_venue_manager_for_any_managed_venue() from public;
grant execute on function public.is_venue_manager_for_any_managed_venue() to authenticated;

-- ---------------------------------------------------------------------------
-- RLS — venue_managers
-- ---------------------------------------------------------------------------

alter table public.venue_managers enable row level security;

create policy "venue_managers_select_own"
  on public.venue_managers
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "venue_managers_insert_admin"
  on public.venue_managers
  for insert
  to authenticated
  with check (public.is_admin());

create policy "venue_managers_delete_admin"
  on public.venue_managers
  for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- RLS — venue_claim_requests
-- ---------------------------------------------------------------------------

alter table public.venue_claim_requests enable row level security;

create policy "venue_claim_requests_select_own_or_admin"
  on public.venue_claim_requests
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "venue_claim_requests_insert_own"
  on public.venue_claim_requests
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and status = 'pending'
    and not public.is_venue_manager(venue_id)
  );

create policy "venue_claim_requests_update_admin"
  on public.venue_claim_requests
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- RLS — happy_hour_slots (managers: CRUD on managed venues)
-- ---------------------------------------------------------------------------

create policy "happy_hour_slots_select_manager"
  on public.happy_hour_slots
  for select
  to authenticated
  using (public.is_venue_manager(venue_id));

create policy "happy_hour_slots_insert_manager"
  on public.happy_hour_slots
  for insert
  to authenticated
  with check (
    public.is_venue_manager(venue_id)
    and data_status = 'pending_review'
  );

create policy "happy_hour_slots_update_manager"
  on public.happy_hour_slots
  for update
  to authenticated
  using (public.is_venue_manager(venue_id))
  with check (
    public.is_venue_manager(venue_id)
    and data_status = 'pending_review'
  );

create policy "happy_hour_slots_delete_manager"
  on public.happy_hour_slots
  for delete
  to authenticated
  using (public.is_venue_manager(venue_id));

-- ---------------------------------------------------------------------------
-- RLS — happy_hour_deals (via managed slots)
-- ---------------------------------------------------------------------------

create policy "happy_hour_deals_select_manager"
  on public.happy_hour_deals
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.happy_hour_slots s
      where s.id = happy_hour_deals.slot_id
        and public.is_venue_manager(s.venue_id)
    )
  );

create policy "happy_hour_deals_insert_manager"
  on public.happy_hour_deals
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.happy_hour_slots s
      where s.id = happy_hour_deals.slot_id
        and public.is_venue_manager(s.venue_id)
        and s.data_status = 'pending_review'
    )
  );

create policy "happy_hour_deals_delete_manager"
  on public.happy_hour_deals
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.happy_hour_slots s
      where s.id = happy_hour_deals.slot_id
        and public.is_venue_manager(s.venue_id)
    )
  );

-- ---------------------------------------------------------------------------
-- RLS — venues (managers read managed venues)
-- ---------------------------------------------------------------------------

create policy "venues_select_manager"
  on public.venues
  for select
  to authenticated
  using (public.is_venue_manager(id));

grant select on public.venue_managers to authenticated;
grant select, insert on public.venue_claim_requests to authenticated;
grant update on public.venue_claim_requests to authenticated;
