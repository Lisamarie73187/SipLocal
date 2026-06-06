-- Canonical storage path for the venue's displayed happy hour menu photo (set when a submission is approved)

alter table public.venues
  add column happy_hour_menu_storage_path text;

comment on column public.venues.happy_hour_menu_storage_path is
  'Storage path in the menu-photos bucket for the approved happy hour menu image shown on the venue detail card.';

-- Backfill from already-approved menu submissions
update public.venues v
set happy_hour_menu_storage_path = latest.storage_path
from (
  select distinct on (venue_id)
    venue_id,
    storage_path
  from public.venue_menu_submissions
  where status = 'approved'
  order by venue_id, reviewed_at desc nulls last, created_at desc
) as latest
where v.id = latest.venue_id;
