alter table public.venues
  add column if not exists community_verified_at timestamptz;

comment on column public.venues.community_verified_at is
  'When an admin confirmed this happy hour via a community submission (photo, manager edit, etc.).';
