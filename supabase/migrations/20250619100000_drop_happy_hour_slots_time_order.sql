-- Remove the start_time < end_time constraint to allow overnight happy hour slots (e.g. 10pm–2am).
alter table public.happy_hour_slots
  drop constraint if exists happy_hour_slots_time_order;
