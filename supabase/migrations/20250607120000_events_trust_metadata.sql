-- Per-event scrape trust metadata (confidence, sources, freshness)

alter table public.events
  add column if not exists confidence public.scrape_confidence,
  add column if not exists source_urls text[] not null default '{}',
  add column if not exists last_scraped_at timestamptz,
  add column if not exists last_verified_at timestamptz;

comment on column public.events.confidence is 'Scrape confidence for this event row';
comment on column public.events.source_urls is 'URLs used to verify this event';
comment on column public.events.last_scraped_at is 'When this event was last scraped';
comment on column public.events.last_verified_at is 'When an admin last verified this event';
