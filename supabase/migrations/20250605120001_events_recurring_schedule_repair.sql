-- Repair partial apply of events_recurring_schedule (invalid end_time rows)

update public.events
set end_time = null
where end_time is not null
  and start_time is not null
  and end_time <= start_time;

update public.events
set
  day_of_week = coalesce(day_of_week, 0),
  start_time = coalesce(start_time, time '19:00')
where day_of_week is null
   or start_time is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_day_of_week_range'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_day_of_week_range
        check (day_of_week >= 0 and day_of_week <= 6);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_end_after_start'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_end_after_start
        check (end_time is null or end_time > start_time);
  end if;
end $$;

create index if not exists events_published_schedule_idx
  on public.events (city_id, day_of_week, start_time)
  where is_published = true;
