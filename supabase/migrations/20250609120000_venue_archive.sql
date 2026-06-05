-- Soft-archive venues (hidden from lists and discovery, not deleted)

alter table public.venues
  add column if not exists archived_at timestamptz;

comment on column public.venues.archived_at is
  'When set, venue is archived — hidden from admin default lists and public discovery';

create index if not exists venues_archived_at_idx on public.venues (archived_at);

-- Public discovery: exclude archived venues
drop policy if exists "venues_select_live_published" on public.venues;

create policy "venues_select_live_published"
  on public.venues
  for select
  to anon, authenticated
  using (
    archived_at is null
    and is_published = true
    and data_status = 'live'
    and exists (
      select 1
      from public.cities c
      where c.id = venues.city_id
        and c.is_active = true
    )
  );

drop policy if exists "happy_hour_slots_select_live_published" on public.happy_hour_slots;

create policy "happy_hour_slots_select_live_published"
  on public.happy_hour_slots
  for select
  to anon, authenticated
  using (
    is_active = true
    and data_status = 'live'
    and exists (
      select 1
      from public.venues v
      join public.cities c on c.id = v.city_id
      where v.id = happy_hour_slots.venue_id
        and v.archived_at is null
        and v.is_published = true
        and v.data_status = 'live'
        and c.is_active = true
    )
  );

drop policy if exists "happy_hour_deals_select_live_published" on public.happy_hour_deals;

create policy "happy_hour_deals_select_live_published"
  on public.happy_hour_deals
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.happy_hour_slots s
      join public.venues v on v.id = s.venue_id
      join public.cities c on c.id = v.city_id
      where s.id = happy_hour_deals.slot_id
        and s.is_active = true
        and s.data_status = 'live'
        and v.archived_at is null
        and v.is_published = true
        and v.data_status = 'live'
        and c.is_active = true
    )
  );

drop policy if exists "events_select_published" on public.events;

create policy "events_select_published"
  on public.events
  for select
  to anon, authenticated
  using (
    is_published = true
    and exists (
      select 1
      from public.cities c
      where c.id = events.city_id
        and c.is_active = true
    )
    and exists (
      select 1
      from public.venues v
      where v.id = events.venue_id
        and v.archived_at is null
        and v.is_published = true
        and v.data_status = 'live'
    )
  );
