-- New market: Arlington, TX
insert into public.cities (
  slug,
  name,
  state,
  timezone,
  center_lat,
  center_lng
)
values (
  'arlington-tx',
  'Arlington',
  'TX',
  'America/Chicago',
  32.7357,
  -97.1081
)
on conflict (slug) do nothing;
