alter table public.venues
  add column if not exists admin_notes text;

comment on column public.venues.admin_notes is
  'Internal admin notes about this venue, not shown to users.';
