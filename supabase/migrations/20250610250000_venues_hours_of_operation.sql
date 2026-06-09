alter table public.venues
  add column if not exists hours_of_operation jsonb;

comment on column public.venues.hours_of_operation is
  'Array of { day: 0-6 (Sun-Sat), open: "HH:MM", close: "HH:MM" } objects representing regular operating hours.';
