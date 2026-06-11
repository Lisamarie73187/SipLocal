-- Multiple happy hour menu photos per venue, ordered for display

create table public.venue_menu_images (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  storage_path text not null,
  position integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create index venue_menu_images_venue_id_idx on public.venue_menu_images (venue_id);
create unique index venue_menu_images_storage_path_idx on public.venue_menu_images (storage_path);

comment on table public.venue_menu_images is
  'Ordered set of happy hour menu photos (storage paths in the menu-photos bucket) shown on the venue detail card.';

-- Backfill from the existing single menu image column
insert into public.venue_menu_images (venue_id, storage_path, position)
select id, happy_hour_menu_storage_path, 0
from public.venues
where happy_hour_menu_storage_path is not null;

alter table public.venues
  drop column happy_hour_menu_storage_path,
  drop column happy_hour_menu_url;

-- ---------------------------------------------------------------------------
-- RLS — venue_menu_images
-- ---------------------------------------------------------------------------

alter table public.venue_menu_images enable row level security;

create policy "venue_menu_images_select_admin"
  on public.venue_menu_images
  for select
  to authenticated
  using (public.is_admin());

create policy "venue_menu_images_all_admin"
  on public.venue_menu_images
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.venue_menu_images to authenticated;
grant insert, update, delete on public.venue_menu_images to authenticated;
