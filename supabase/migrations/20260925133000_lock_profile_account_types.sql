-- Learner and institutional staff identities keep one permanent account type.
-- The only non-platform transition is the one-time student placeholder used
-- while a verified teacher or first-school-admin invitation is being accepted.
create or replace function private.enforce_profile_account_type_guard_14c()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_old_role text := old.role::text;
  v_new_role text := new.role::text;
begin
  if v_old_role = v_new_role then
    return new;
  end if;

  -- Existing platform staff accounts may transfer between the two platform
  -- roles. The separate master-admin guard still protects the final master.
  if v_old_role in ('content_admin', 'admin')
     and v_new_role in ('content_admin', 'admin') then
    return new;
  end if;

  -- Supabase creates every new profile as a student placeholder. Permit the
  -- intended one-time institutional activation only while its invitation is
  -- still valid and unclaimed.
  if v_old_role = 'student'
     and v_new_role in ('teacher', 'school_admin')
     and exists (
       select 1
       from public.staff_account_provisioning invitation
       where invitation.recipient_id = old.id
         and invitation.kind = v_new_role
         and invitation.accepted_at is null
         and invitation.revoked_at is null
         and invitation.expires_at > now()
     ) then
    return new;
  end if;

  raise exception 'account_type_immutable' using errcode = 'P0001';
end;
$$;

drop trigger if exists enforce_profile_account_type_14c on public.profiles;
create trigger enforce_profile_account_type_14c
before update of role on public.profiles
for each row
when (old.role is distinct from new.role)
execute function private.enforce_profile_account_type_guard_14c();

revoke all on function private.enforce_profile_account_type_guard_14c()
from public, anon, authenticated;
