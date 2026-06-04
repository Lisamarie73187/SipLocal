-- Launch market: Bend, OR
insert into public.cities (
  slug,
  name,
  state,
  timezone,
  center_lat,
  center_lng
)
values (
  'bend-or',
  'Bend',
  'OR',
  'America/Los_Angeles',
  44.0582,
  -121.3153
)
on conflict (slug) do nothing;
