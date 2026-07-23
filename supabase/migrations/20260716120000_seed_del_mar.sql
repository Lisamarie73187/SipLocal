-- New market: Del Mar, CA
insert into public.cities (
  slug,
  name,
  state,
  timezone,
  center_lat,
  center_lng
)
values (
  'del-mar-ca',
  'Del Mar',
  'CA',
  'America/Los_Angeles',
  32.9595,
  -117.2653
)
on conflict (slug) do nothing;
