-- Proposed re-scrape revisions (manual approve before live data changes)

create type public.scrape_revision_status as enum (
  'pending_review',
  'approved',
  'rejected'
);

alter table public.scrape_jobs
  add column if not exists job_kind text not null default 'discovery',
  add column if not exists target_venue_ids uuid[];

comment on column public.scrape_jobs.job_kind is 'discovery | propose_rescrape';
comment on column public.scrape_jobs.target_venue_ids is 'Venue IDs for propose_rescrape jobs';

create table public.scrape_revisions (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  scrape_job_id uuid not null references public.scrape_jobs (id) on delete cascade,
  proposed_slots jsonb not null default '[]'::jsonb,
  proposed_deals jsonb not null default '[]'::jsonb,
  proposed_description text,
  scrape_error text,
  status public.scrape_revision_status not null default 'pending_review',
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint scrape_revisions_job_venue_unique unique (scrape_job_id, venue_id)
);

create index scrape_revisions_venue_id_idx on public.scrape_revisions (venue_id);
create index scrape_revisions_job_id_idx on public.scrape_revisions (scrape_job_id);
create index scrape_revisions_status_created_idx
  on public.scrape_revisions (status, created_at desc);

create unique index scrape_revisions_one_pending_per_venue_idx
  on public.scrape_revisions (venue_id)
  where status = 'pending_review';

create trigger scrape_revisions_set_updated_at
  before update on public.scrape_revisions
  for each row execute function public.set_updated_at();

alter table public.scrape_revisions enable row level security;

create policy "scrape_revisions_select_admin"
  on public.scrape_revisions
  for select
  to authenticated
  using (public.is_admin());

grant select on public.scrape_revisions to authenticated;
