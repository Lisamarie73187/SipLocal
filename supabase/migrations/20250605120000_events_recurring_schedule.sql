-- Recurring weekly events: day_of_week + start/end time (like happy hour slots)

alter table public.events
  add column if not exists day_of_week smallint,
  add column if not exists start_time time,
  add column if not exists end_time time;

-- Backfill from legacy timestamptz columns when they still exist
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'events'
      and column_name = 'starts_at'
  ) then
    update public.events e
    set
      day_of_week = extract(
        dow from (e.starts_at at time zone c.timezone)
      )::smallint,
      start_time = (e.starts_at at time zone c.timezone)::time,
      end_time = case
        when e.ends_at is not null then (e.ends_at at time zone c.timezone)::time
        else null
      end
    from public.cities c
    where c.id = e.city_id
      and (e.day_of_week is null or e.start_time is null);
  end if;
end $$;

-- Events that crossed midnight (or bad scrape data) end up with end_time <= start_time on
-- the same weekday — clear end so the app uses its default duration instead.
update public.events
set end_time = null
where end_time is not null
  and end_time <= start_time;

-- Safety fallback for any row that still lacks schedule fields
update public.events
set
  day_of_week = coalesce(day_of_week, 0),
  start_time = coalesce(start_time, time '19:00')
where day_of_week is null
   or start_time is null;

alter table public.events
  alter column day_of_week set not null,
  alter column start_time set not null;

drop index if exists public.events_starts_at_idx;
drop index if exists public.events_published_starts_idx;

alter table public.events
  drop constraint if exists events_ends_after_start;

alter table public.events
  drop column if exists starts_at,
  drop column if exists ends_at;

alter table public.events
  drop constraint if exists events_day_of_week_range,
  drop constraint if exists events_end_after_start;

alter table public.events
  add constraint events_day_of_week_range
    check (day_of_week >= 0 and day_of_week <= 6),
  add constraint events_end_after_start
    check (end_time is null or end_time > start_time);

drop index if exists public.events_published_schedule_idx;

create index events_published_schedule_idx
  on public.events (city_id, day_of_week, start_time)
  where is_published = true;
