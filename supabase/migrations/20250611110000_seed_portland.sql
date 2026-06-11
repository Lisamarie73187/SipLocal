-- New market: Portland, OR
insert into public.cities (
  slug,
  name,
  state,
  timezone,
  center_lat,
  center_lng
)
values (
  'portland-or',
  'Portland',
  'OR',
  'America/Los_Angeles',
  45.5152,
  -122.6784
)
on conflict (slug) do nothing;
