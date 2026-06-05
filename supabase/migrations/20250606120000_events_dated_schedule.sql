-- Support specific calendar dates (e.g. River's Place monthly lineup) alongside recurring weekly events.

alter table public.events
  add column if not exists event_date date;

alter table public.events
  alter column day_of_week drop not null;

alter table public.events
  drop constraint if exists events_day_of_week_range;

alter table public.events
  drop constraint if exists events_schedule_type_check;

alter table public.events
  add constraint events_schedule_type_check check (
    event_date is not null
    or (day_of_week is not null and day_of_week >= 0 and day_of_week <= 6)
  );

create index if not exists events_published_date_idx
  on public.events (city_id, event_date, start_time)
  where is_published = true and event_date is not null;
