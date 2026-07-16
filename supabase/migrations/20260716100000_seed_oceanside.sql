-- New market: Oceanside, CA
insert into public.cities (
  slug,
  name,
  state,
  timezone,
  center_lat,
  center_lng
)
values (
  'oceanside-ca',
  'Oceanside',
  'CA',
  'America/Los_Angeles',
  33.1959,
  -117.3795
)
on conflict (slug) do nothing;
