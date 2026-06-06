-- Extended profile fields for discovery preferences and future notifications

create type public.profile_visitor_type as enum ('local', 'visiting');

alter table public.profiles
  add column visitor_type public.profile_visitor_type,
  add column neighborhood_or_zip text,
  add column notify_favorite_updates boolean not null default true,
  add column notify_starting_soon boolean not null default false,
  add column notify_new_venues_in_city boolean not null default false;

alter table public.profiles
  add constraint profiles_neighborhood_or_zip_len
  check (neighborhood_or_zip is null or char_length(trim(neighborhood_or_zip)) between 1 and 80);

comment on column public.profiles.visitor_type is 'Whether the user lives in their preferred city or is visiting.';
comment on column public.profiles.neighborhood_or_zip is 'Optional rough area for near-me defaults (neighborhood name or ZIP).';
comment on column public.profiles.notify_favorite_updates is 'Email/push when a favorited venue schedule changes.';
comment on column public.profiles.notify_starting_soon is 'Email/push when a favorited happy hour is starting soon.';
comment on column public.profiles.notify_new_venues_in_city is 'Email/push when new venues are added in the preferred city.';
