-- AI scrape pipeline: venue/slot provenance, scrape jobs, admin flag

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.venue_data_status as enum (
  'live',
  'pending_review',
  'no_happy_hour_found',
  'flagged'
);

create type public.happy_hour_data_status as enum (
  'live',
  'pending_review',
  'flagged'
);

create type public.scrape_confidence as enum (
  'high',
  'medium',
  'low'
);

create type public.scrape_job_status as enum (
  'pending',
  'running',
  'complete',
  'failed'
);

comment on type public.venue_data_status is 'Scrape/review lifecycle for venues';
comment on type public.happy_hour_data_status is 'Scrape/review lifecycle for happy hour slots';
comment on type public.scrape_confidence is 'Claude extraction confidence for a slot';
comment on type public.scrape_job_status is 'City-level scrape job state';

-- ---------------------------------------------------------------------------
-- profiles — admin flag
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column is_admin boolean not null default false;

comment on column public.profiles.is_admin is 'Grants access to admin review and scrape job history';

-- Grant admin to project owner (no-op until auth user exists)
update public.profiles p
set is_admin = true
from auth.users u
where p.id = u.id
  and lower(u.email) = lower('lisamarieherzberg@gmail.com');

-- ---------------------------------------------------------------------------
-- venues — scrape fields
-- ---------------------------------------------------------------------------

alter table public.venues
  add column place_id text,
  add column yelp_id text,
  add column yelp_rating numeric(2, 1),
  add column yelp_review_count integer,
  add column data_status public.venue_data_status not null default 'pending_review',
  add column last_scraped_at timestamptz,
  add column last_verified_at timestamptz,
  add column scraped_city text,
  add column scraped_zip text,
  add column scrape_content_hash text;

comment on column public.venues.place_id is 'Google Places ID; unique when set';
comment on column public.venues.scrape_content_hash is 'Normalized happy-hour payload hash for weekly refresh dedupe';

create unique index venues_place_id_unique_idx
  on public.venues (place_id)
  where place_id is not null;

create index venues_data_status_idx on public.venues (data_status);
create index venues_city_data_status_idx on public.venues (city_id, data_status);

-- Seed / manual venues: treat as live
update public.venues
set data_status = 'live'
where data_status = 'pending_review';

-- ---------------------------------------------------------------------------
-- happy_hour_slots — scrape fields
-- ---------------------------------------------------------------------------

alter table public.happy_hour_slots
  add column confidence public.scrape_confidence,
  add column source_urls text[] not null default '{}',
  add column conflicts jsonb,
  add column data_status public.happy_hour_data_status not null default 'pending_review',
  add column last_scraped_at timestamptz;

comment on column public.happy_hour_slots.conflicts is 'Conflicting happy hour details across sources (Claude extraction)';

create index happy_hour_slots_data_status_idx on public.happy_hour_slots (data_status);
create index happy_hour_slots_venue_data_status_idx on public.happy_hour_slots (venue_id, data_status);

update public.happy_hour_slots
set data_status = 'live'
where data_status = 'pending_review';

-- ---------------------------------------------------------------------------
-- scrape_jobs
-- ---------------------------------------------------------------------------

create table public.scrape_jobs (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities (id) on delete restrict,
  city_slug text not null,
  zip text,
  bounds jsonb,
  status public.scrape_job_status not null default 'pending',
  venues_found integer not null default 0,
  venues_with_happy_hours integer not null default 0,
  max_venues integer not null default 25,
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint scrape_jobs_venues_found_non_negative check (venues_found >= 0),
  constraint scrape_jobs_venues_with_happy_hours_non_negative check (venues_with_happy_hours >= 0),
  constraint scrape_jobs_max_venues_positive check (max_venues > 0)
);

create index scrape_jobs_city_id_idx on public.scrape_jobs (city_id);
create index scrape_jobs_city_slug_status_idx on public.scrape_jobs (city_slug, status);
create index scrape_jobs_completed_at_idx on public.scrape_jobs (completed_at desc nulls last);

create trigger scrape_jobs_set_updated_at
  before update on public.scrape_jobs
  for each row execute function public.set_updated_at();

comment on table public.scrape_jobs is 'City/ZIP scrape runs (Google → Claude → Yelp pipeline)';

-- ---------------------------------------------------------------------------
-- Admin helper (RLS)
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- RLS — public reads only live data; admins see pending for review
-- ---------------------------------------------------------------------------

drop policy if exists "venues_select_published" on public.venues;

create policy "venues_select_live_published"
  on public.venues
  for select
  to anon, authenticated
  using (
    is_published = true
    and data_status = 'live'
    and exists (
      select 1
      from public.cities c
      where c.id = venues.city_id
        and c.is_active = true
    )
  );

create policy "venues_select_admin_review"
  on public.venues
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "happy_hour_slots_select_published" on public.happy_hour_slots;

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
        and v.is_published = true
        and v.data_status = 'live'
        and c.is_active = true
    )
  );

create policy "happy_hour_slots_select_admin_review"
  on public.happy_hour_slots
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "happy_hour_deals_select_published" on public.happy_hour_deals;

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
        and v.is_published = true
        and v.data_status = 'live'
        and c.is_active = true
    )
  );

create policy "happy_hour_deals_select_admin_review"
  on public.happy_hour_deals
  for select
  to authenticated
  using (public.is_admin());

alter table public.scrape_jobs enable row level security;

create policy "scrape_jobs_select_admin"
  on public.scrape_jobs
  for select
  to authenticated
  using (public.is_admin());

-- Pipeline writes use service role (bypasses RLS). Admins update via future policies or service fn.

grant select on public.scrape_jobs to authenticated;
