-- Two-step scrape: Google discover → Claude research

alter type public.venue_data_status add value if not exists 'discovered';

create type public.schedule_cadence as enum (
  'weekly',
  'monthly',
  'annually',
  'seasonally'
);

alter table public.venues
  add column if not exists schedule_cadence public.schedule_cadence;

comment on column public.venues.schedule_cadence is
  'How often the venue happy hour schedule changes (set after talking with the venue)';

alter table public.scrape_jobs
  add column if not exists research_targets jsonb;

comment on column public.scrape_jobs.research_targets is
  'Per-venue research flags: [{ "venueId", "researchHappyHour", "researchEvents" }]';

alter table public.scrape_revisions
  add column if not exists proposed_source_urls jsonb not null default '[]'::jsonb,
  add column if not exists proposed_confidence public.scrape_confidence,
  add column if not exists research_events_count integer not null default 0;

comment on column public.scrape_revisions.proposed_source_urls is 'Source URLs from Claude research run';
comment on column public.scrape_revisions.proposed_confidence is 'Rolled-up confidence from Claude research';
comment on column public.scrape_revisions.research_events_count is 'Events saved during the same research run';
