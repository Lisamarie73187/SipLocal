-- New market: Maui, HI
insert into public.cities (
  slug,
  name,
  state,
  timezone,
  center_lat,
  center_lng
)
values (
  'maui-hi',
  'Maui',
  'HI',
  'Pacific/Honolulu',
  20.8783,
  -156.6825
)
on conflict (slug) do nothing;
