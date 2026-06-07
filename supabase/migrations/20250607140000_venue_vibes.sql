-- Venue vibes for discovery filters (multi-select tags)

create type public.venue_vibe as enum (
  'upscale',
  'rooftop',
  'patio',
  'sports_viewing',
  'group_friendly',
  'family_friendly',
  'dog_friendly'
);

alter table public.venues
  add column vibes public.venue_vibe[] not null default '{}';

create index venues_vibes_idx on public.venues using gin (vibes);
