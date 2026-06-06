-- Optional demographic fields for profile and future marketing analytics

create type public.profile_gender as enum (
  'woman',
  'man',
  'non_binary',
  'prefer_not_to_say'
);

alter table public.profiles
  add column date_of_birth date,
  add column gender public.profile_gender;

alter table public.profiles
  add constraint profiles_date_of_birth_valid
  check (date_of_birth is null or date_of_birth <= current_date);

comment on column public.profiles.date_of_birth is 'Optional date of birth for age-based offers and analytics.';
comment on column public.profiles.gender is 'Optional self-reported gender for analytics; prefer_not_to_say when withheld.';
