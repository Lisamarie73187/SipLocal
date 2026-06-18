-- New market: San Diego, CA
insert into public.cities (
  slug,
  name,
  state,
  timezone,
  center_lat,
  center_lng
)
values (
  'san-diego-ca',
  'San Diego',
  'CA',
  'America/Los_Angeles',
  32.7157,
  -117.1611
)
on conflict (slug) do nothing;
