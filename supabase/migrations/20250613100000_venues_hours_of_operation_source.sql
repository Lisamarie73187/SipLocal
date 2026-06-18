do $$
begin
  if not exists (select 1 from pg_type where typname = 'hours_of_operation_source') then
    create type public.hours_of_operation_source as enum ('website', 'google', 'manual');
  end if;
end $$;

alter table public.venues
  add column if not exists hours_of_operation_source public.hours_of_operation_source;

comment on column public.venues.hours_of_operation_source is
  'Where hours_of_operation was last populated from: website scrub, Google Places, or manual admin edit.';
