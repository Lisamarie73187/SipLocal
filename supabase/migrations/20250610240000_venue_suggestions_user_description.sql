alter table public.venue_suggestions
  add column if not exists user_description text;

comment on column public.venue_suggestions.user_description is
  'Optional comments or context provided by the user when submitting a venue suggestion.';
