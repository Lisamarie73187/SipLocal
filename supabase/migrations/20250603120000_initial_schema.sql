-- SipLocal initial schema: cities, venues, happy hours, favorites

-- ---------------------------------------------------------------------------
-- Extensions & helpers
-- ---------------------------------------------------------------------------

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.deal_category as enum ('drinks', 'food', 'both', 'other');

comment on type public.deal_category is 'Category for happy hour deals and filters';

-- day_of_week: 0 = Sunday … 6 = Saturday (matches JavaScript Date.getDay())
-- ---------------------------------------------------------------------------
-- cities
-- ---------------------------------------------------------------------------

create table public.cities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  state text not null,
  country text not null default 'US',
  timezone text not null default 'America/Los_Angeles',
  center_lat double precision not null,
  center_lng double precision not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint cities_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create trigger cities_set_updated_at
  before update on public.cities
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- venues
-- ---------------------------------------------------------------------------

create table public.venues (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities (id) on delete restrict,
  slug text not null,
  name text not null,
  description text,
  address_line1 text not null,
  address_line2 text,
  postal_code text,
  phone text,
  website_url text,
  image_url text,
  lat double precision not null,
  lng double precision not null,
  is_published boolean not null default false,
  is_featured boolean not null default false,
  featured_until timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint venues_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint venues_lat_range check (lat >= -90 and lat <= 90),
  constraint venues_lng_range check (lng >= -180 and lng <= 180),
  unique (city_id, slug)
);

create index venues_city_id_idx on public.venues (city_id);
create index venues_city_published_idx on public.venues (city_id, is_published);
create index venues_featured_idx on public.venues (is_featured, featured_until)
  where is_featured = true;

create trigger venues_set_updated_at
  before update on public.venues
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- happy_hour_slots — recurring weekly windows
-- ---------------------------------------------------------------------------

create table public.happy_hour_slots (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  day_of_week smallint not null,
  start_time time not null,
  end_time time not null,
  deal_summary text,
  categories public.deal_category[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint happy_hour_slots_day_range check (day_of_week >= 0 and day_of_week <= 6),
  constraint happy_hour_slots_time_order check (start_time < end_time)
);

create index happy_hour_slots_venue_id_idx on public.happy_hour_slots (venue_id);
create index happy_hour_slots_venue_day_idx on public.happy_hour_slots (venue_id, day_of_week)
  where is_active = true;

create trigger happy_hour_slots_set_updated_at
  before update on public.happy_hour_slots
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- happy_hour_deals — individual items within a slot (optional detail)
-- ---------------------------------------------------------------------------

create table public.happy_hour_deals (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.happy_hour_slots (id) on delete cascade,
  label text not null,
  price_text text,
  category public.deal_category not null default 'other',
  sort_order smallint not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create index happy_hour_deals_slot_id_idx on public.happy_hour_deals (slot_id);

-- ---------------------------------------------------------------------------
-- favorites — per authenticated user
-- ---------------------------------------------------------------------------

create table public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  venue_id uuid not null references public.venues (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, venue_id)
);

create index favorites_user_id_idx on public.favorites (user_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.cities enable row level security;
alter table public.venues enable row level security;
alter table public.happy_hour_slots enable row level security;
alter table public.happy_hour_deals enable row level security;
alter table public.favorites enable row level security;

-- Cities: public read for active cities
create policy "cities_select_active"
  on public.cities
  for select
  to anon, authenticated
  using (is_active = true);

-- Venues: public read for published venues in active cities
create policy "venues_select_published"
  on public.venues
  for select
  to anon, authenticated
  using (
    is_published = true
    and exists (
      select 1
      from public.cities c
      where c.id = venues.city_id
        and c.is_active = true
    )
  );

-- Happy hour slots: readable when parent venue is visible
create policy "happy_hour_slots_select_published"
  on public.happy_hour_slots
  for select
  to anon, authenticated
  using (
    is_active = true
    and exists (
      select 1
      from public.venues v
      join public.cities c on c.id = v.city_id
      where v.id = happy_hour_slots.venue_id
        and v.is_published = true
        and c.is_active = true
    )
  );

-- Deals: readable when parent slot is visible
create policy "happy_hour_deals_select_published"
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
        and v.is_published = true
        and c.is_active = true
    )
  );

-- Favorites: users manage only their own rows
create policy "favorites_select_own"
  on public.favorites
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "favorites_insert_own"
  on public.favorites
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "favorites_delete_own"
  on public.favorites
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;
grant select on public.cities to anon, authenticated;
grant select on public.venues to anon, authenticated;
grant select on public.happy_hour_slots to anon, authenticated;
grant select on public.happy_hour_deals to anon, authenticated;
grant select, insert, delete on public.favorites to authenticated;
