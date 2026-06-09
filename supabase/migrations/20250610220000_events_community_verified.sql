alter table public.events
  add column if not exists community_verified_at timestamptz;

comment on column public.events.community_verified_at is
  'When an admin confirmed this event via a community submission or manual review.';
