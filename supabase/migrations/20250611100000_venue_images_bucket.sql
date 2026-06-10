-- Public bucket for venue cover photos (e.g. pulled from Google Places during scrub)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'venue-images',
  'venue-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
);

create policy "venue_images_public_read"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'venue-images');
