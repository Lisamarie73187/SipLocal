-- Optional device location captured when the user submits a suggestion or menu photo

alter table public.venue_suggestions
  add column submitter_lat double precision,
  add column submitter_lng double precision,
  add constraint venue_suggestions_submitter_lat_range
    check (submitter_lat is null or (submitter_lat >= -90 and submitter_lat <= 90)),
  add constraint venue_suggestions_submitter_lng_range
    check (submitter_lng is null or (submitter_lng >= -180 and submitter_lng <= 180)),
  add constraint venue_suggestions_submitter_location_pair
    check (
      (submitter_lat is null and submitter_lng is null)
      or (submitter_lat is not null and submitter_lng is not null)
    );

alter table public.venue_menu_submissions
  add column submitter_lat double precision,
  add column submitter_lng double precision,
  add constraint venue_menu_submissions_submitter_lat_range
    check (submitter_lat is null or (submitter_lat >= -90 and submitter_lat <= 90)),
  add constraint venue_menu_submissions_submitter_lng_range
    check (submitter_lng is null or (submitter_lng >= -180 and submitter_lng <= 180)),
  add constraint venue_menu_submissions_submitter_location_pair
    check (
      (submitter_lat is null and submitter_lng is null)
      or (submitter_lat is not null and submitter_lng is not null)
    );

comment on column public.venue_suggestions.submitter_lat is
  'Latitude from the submitter device when available (map button or submit flow).';
comment on column public.venue_suggestions.submitter_lng is
  'Longitude from the submitter device when available (map button or submit flow).';
comment on column public.venue_menu_submissions.submitter_lat is
  'Latitude from the submitter device when available (map button or submit flow).';
comment on column public.venue_menu_submissions.submitter_lng is
  'Longitude from the submitter device when available (map button or submit flow).';
