-- Crowdsourced suggestions for venues missing from discovery

create table public.venue_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  city_id uuid not null references public.cities (id) on delete cascade,
  venue_name text not null,
  storage_path text not null,
  status public.menu_submission_status not null default 'pending_review',
  parsed_slots jsonb,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint venue_suggestions_venue_name_len check (char_length(trim(venue_name)) >= 2)
);

create index venue_suggestions_city_id_idx on public.venue_suggestions (city_id);
create index venue_suggestions_status_idx on public.venue_suggestions (status);
create index venue_suggestions_user_id_idx on public.venue_suggestions (user_id);

create trigger venue_suggestions_set_updated_at
  before update on public.venue_suggestions
  for each row execute function public.set_updated_at();

comment on table public.venue_suggestions is
  'User-submitted venue names and happy hour menu photos for venues not yet on the map.';

alter table public.venue_suggestions enable row level security;

create policy "venue_suggestions_select_own_or_admin"
  on public.venue_suggestions
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "venue_suggestions_insert_authenticated"
  on public.venue_suggestions
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "venue_suggestions_update_admin"
  on public.venue_suggestions
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert on public.venue_suggestions to authenticated;
grant update on public.venue_suggestions to authenticated;
