-- ---------------------------------------------------------------------------
-- Security: prevent privilege escalation via public.profiles.is_admin
--
-- Before this migration the `profiles_update_own` policy plus a blanket
-- `grant update on public.profiles to authenticated` let any signed-in user
-- run `update profiles set is_admin = true where id = auth.uid()` and promote
-- themselves to admin. We close that hole with two independent layers:
--   1. Column-level UPDATE grants — the authenticated role can only write the
--      profile fields users actually edit (never is_admin / id / timestamps).
--   2. A BEFORE UPDATE trigger that rejects any is_admin change unless it comes
--      from a privileged role (migrations / service_role). Defense in depth in
--      case a future migration re-grants broad UPDATE.
-- ---------------------------------------------------------------------------

-- 1. Column-level UPDATE grants -------------------------------------------------
-- Replace the table-wide UPDATE grant with the explicit user-editable columns.
revoke update on public.profiles from authenticated;

grant update (
  display_name,
  avatar_url,
  preferred_city_id,
  visitor_type,
  neighborhood_or_zip,
  notify_favorite_updates,
  notify_starting_soon,
  notify_new_venues_in_city,
  date_of_birth,
  gender
) on public.profiles to authenticated;

-- 2. Trigger guard --------------------------------------------------------------
create or replace function public.prevent_profile_admin_escalation()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.is_admin is distinct from old.is_admin
     and current_user not in ('postgres', 'supabase_admin', 'service_role')
  then
    raise exception 'Only administrators can change is_admin'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

comment on function public.prevent_profile_admin_escalation() is
  'Blocks is_admin changes from non-privileged roles to prevent self-promotion.';

drop trigger if exists profiles_prevent_admin_escalation on public.profiles;

create trigger profiles_prevent_admin_escalation
  before update on public.profiles
  for each row execute function public.prevent_profile_admin_escalation();
