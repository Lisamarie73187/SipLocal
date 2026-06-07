-- Convert venue_type from a single value to a multi-select array

drop index if exists public.venues_venue_type_idx;

alter table public.venues
  add column venue_types public.venue_type[] not null default '{}';

update public.venues
  set venue_types = array[venue_type]
  where venue_type is not null;

alter table public.venues
  drop column venue_type;

create index venues_venue_types_idx on public.venues using gin (venue_types);
