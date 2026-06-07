-- Crowdsourced event submissions (title, optional photo, short description)

create type public.event_submission_status as enum ('pending_review', 'approved', 'rejected');

create table public.event_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  venue_id uuid references public.venues (id) on delete set null,
  venue_name text,
  title text not null check (char_length(title) <= 200),
  description text check (description is null or char_length(description) <= 200),
  photo_storage_path text,
  status public.event_submission_status not null default 'pending_review',
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint event_submissions_venue_reference check (
    venue_id is not null or venue_name is not null
  )
);

create index event_submissions_venue_id_idx on public.event_submissions (venue_id);
create index event_submissions_status_idx on public.event_submissions (status);
create index event_submissions_user_id_idx on public.event_submissions (user_id);

create trigger event_submissions_set_updated_at
  before update on public.event_submissions
  for each row execute function public.set_updated_at();

comment on table public.event_submissions is
  'Crowdsourced event submissions awaiting admin review; may reference an existing venue or a free-text venue name.';

-- Private bucket — access via signed URLs (service role / admin server functions)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-photos',
  'event-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
);

-- ---------------------------------------------------------------------------
-- RLS — event_submissions
-- ---------------------------------------------------------------------------

alter table public.event_submissions enable row level security;

create policy "event_submissions_select_own_or_admin"
  on public.event_submissions
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "event_submissions_insert_authenticated"
  on public.event_submissions
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "event_submissions_update_admin"
  on public.event_submissions
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert on public.event_submissions to authenticated;
grant update on public.event_submissions to authenticated;
