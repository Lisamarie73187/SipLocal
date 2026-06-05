-- Venue type for admin classification and discovery filters

create type public.venue_type as enum (
  'bar',
  'brewery',
  'taproom',
  'restaurant',
  'gastropub',
  'wine_bar',
  'cocktail_bar',
  'sports_bar',
  'pub',
  'distillery'
);

alter table public.venues
  add column venue_type public.venue_type;

create index venues_venue_type_idx on public.venues (venue_type)
  where venue_type is not null;
