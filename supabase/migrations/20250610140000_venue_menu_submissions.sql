-- Crowdsourced and manager happy hour menu photo submissions

create type public.menu_submission_source as enum ('crowd', 'manager');

create type public.menu_submission_status as enum ('pending_review', 'approved', 'rejected');

create table public.venue_menu_submissions (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null,
  source public.menu_submission_source not null,
  status public.menu_submission_status not null default 'pending_review',
  parsed_slots jsonb,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index venue_menu_submissions_venue_id_idx on public.venue_menu_submissions (venue_id);
create index venue_menu_submissions_status_idx on public.venue_menu_submissions (status);
create index venue_menu_submissions_user_id_idx on public.venue_menu_submissions (user_id);

create trigger venue_menu_submissions_set_updated_at
  before update on public.venue_menu_submissions
  for each row execute function public.set_updated_at();

comment on table public.venue_menu_submissions is
  'Happy hour menu photos from crowdsourced users or venue managers; AI-parsed slots stored for admin review.';

-- Private bucket — access via signed URLs (service role / admin server functions)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'menu-photos',
  'menu-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
);

-- ---------------------------------------------------------------------------
-- RLS — venue_menu_submissions
-- ---------------------------------------------------------------------------

alter table public.venue_menu_submissions enable row level security;

create policy "venue_menu_submissions_select_own_or_admin"
  on public.venue_menu_submissions
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "venue_menu_submissions_insert_authenticated"
  on public.venue_menu_submissions
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "venue_menu_submissions_update_admin"
  on public.venue_menu_submissions
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert on public.venue_menu_submissions to authenticated;
grant update on public.venue_menu_submissions to authenticated;
