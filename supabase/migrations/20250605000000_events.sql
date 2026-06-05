-- Local events (trivia, live music, etc.) linked to venues

create type public.event_type as enum (
  'trivia',
  'live_music',
  'special',
  'other'
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities (id) on delete restrict,
  venue_id uuid not null references public.venues (id) on delete cascade,
  title text not null,
  description text,
  event_type public.event_type not null default 'other',
  starts_at timestamptz not null,
  ends_at timestamptz,
  is_published boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint events_ends_after_start check (ends_at is null or ends_at > starts_at)
);

create index events_city_id_idx on public.events (city_id);
create index events_venue_id_idx on public.events (venue_id);
create index events_starts_at_idx on public.events (starts_at);
create index events_published_starts_idx
  on public.events (city_id, starts_at)
  where is_published = true;

create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

alter table public.events enable row level security;

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
        and v.is_published = true
        and v.data_status = 'live'
    )
  );

create policy "events_select_admin"
  on public.events
  for select
  to authenticated
  using (public.is_admin());

grant select on public.events to anon, authenticated;

-- Sample Bend events (relative to migration apply time)
do $$
declare
  v_city_id uuid;
  v_venue_id uuid;
  v_base timestamptz := timezone('utc', now());
begin
  select id into v_city_id from public.cities where slug = 'bend-or';
  if v_city_id is null then
    return;
  end if;

  select id into v_venue_id
  from public.venues
  where city_id = v_city_id and slug = 'deschutes-bend-public-house'
  limit 1;

  if v_venue_id is not null then
    insert into public.events (
      city_id, venue_id, title, description, event_type, starts_at, ends_at, is_published
    ) values (
      v_city_id,
      v_venue_id,
      'Trivia Night',
      'Weekly pub trivia with prizes and $5 pints.',
      'trivia',
      (date_trunc('day', v_base at time zone 'America/Los_Angeles') + interval '2 days' + time '19:00')
        at time zone 'America/Los_Angeles',
      (date_trunc('day', v_base at time zone 'America/Los_Angeles') + interval '2 days' + time '21:00')
        at time zone 'America/Los_Angeles',
      true
    );
  end if;

  select id into v_venue_id
  from public.venues
  where city_id = v_city_id and slug = 'crux-fermentation-project'
  limit 1;

  if v_venue_id is not null then
    insert into public.events (
      city_id, venue_id, title, description, event_type, starts_at, ends_at, is_published
    ) values (
      v_city_id,
      v_venue_id,
      'Live Acoustic Set',
      'Local duo on the patio — no cover.',
      'live_music',
      (date_trunc('day', v_base at time zone 'America/Los_Angeles') + interval '1 day' + time '18:00')
        at time zone 'America/Los_Angeles',
      (date_trunc('day', v_base at time zone 'America/Los_Angeles') + interval '1 day' + time '20:30')
        at time zone 'America/Los_Angeles',
      true
    );
  end if;

  select id into v_venue_id
  from public.venues
  where city_id = v_city_id and slug = 'ten-barrel-bend'
  limit 1;

  if v_venue_id is not null then
    insert into public.events (
      city_id, venue_id, title, description, event_type, starts_at, ends_at, is_published
    ) values (
      v_city_id,
      v_venue_id,
      'Burger & Beer Special',
      'Half-price burgers with any pint purchase.',
      'special',
      v_base + interval '3 hours',
      v_base + interval '6 hours',
      true
    );
  end if;
end;
$$;
