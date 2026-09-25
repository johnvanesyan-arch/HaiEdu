-- Master administrators are retained for audit continuity. Once an identity
-- has held the admin role it remains deletion-protected, even after a controlled
-- transfer of responsibility and role demotion.
alter table public.profiles
  add column if not exists master_admin_protected_at timestamptz;

update public.profiles
set master_admin_protected_at = coalesce(master_admin_protected_at, now())
where role::text = 'admin';

create or replace function private.enforce_master_admin_identity_guard_14c()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    if new.role::text = 'admin' then
      new.master_admin_protected_at := coalesce(new.master_admin_protected_at, now());
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.master_admin_protected_at is not null then
      raise exception 'master_admin_deletion_forbidden' using errcode = 'P0001';
    end if;
    return old;
  end if;

  if old.master_admin_protected_at is not null then
    new.master_admin_protected_at := old.master_admin_protected_at;
  elsif new.role::text = 'admin' then
    new.master_admin_protected_at := now();
  end if;

  if old.role::text = 'admin' and old.account_status = 'active'
     and (new.role::text <> 'admin' or new.account_status <> 'active') then
    perform pg_advisory_xact_lock(hashtext('master_admin_identity_guard_14c'));
    if not exists (
      select 1 from public.profiles p
      where p.id <> old.id and p.role::text = 'admin' and p.account_status = 'active'
    ) then
      raise exception 'last_active_admin_protected' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_master_admin_identity_14c on public.profiles;
create trigger protect_master_admin_identity_14c
before insert or update or delete on public.profiles
for each row execute function private.enforce_master_admin_identity_guard_14c();

revoke all on function private.enforce_master_admin_identity_guard_14c()
from public, anon, authenticated;

-- Platform-level identities must not reuse a learner or institutional staff
-- identity. Teachers and school admins are provisioned only by invitations.
create or replace function public.service_platform_role_change_allowed_14c(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_user is not null
    and not exists(select 1 from public.learning_sessions where student_id=p_user)
    and not exists(select 1 from public.attempts where student_id=p_user)
    and not exists(select 1 from public.chapter_mastery_states where student_id=p_user)
    and not exists(select 1 from public.student_skill_mastery where student_id=p_user)
    and not exists(select 1 from public.student_skill_mastery_by_release where student_id=p_user)
    and not exists(select 1 from public.student_item_exposure_events where student_id=p_user)
    and not exists(select 1 from public.remediation_events where student_id=p_user)
    and not exists(select 1 from public.recommendation_events where student_id=p_user)
    and not exists(select 1 from public.pilot_participants where student_id=p_user)
    and not exists(select 1 from public.class_memberships where student_id=p_user)
    and not exists(select 1 from public.institutional_class_enrollments where student_id=p_user)
    and not exists(select 1 from public.institutional_memberships where person_id=p_user)
    and not exists(select 1 from public.institutional_invitations where recipient_user_id=p_user)
    and not exists(select 1 from private.learning_session_item_option_orders where student_id=p_user);
$$;

revoke all on function public.service_platform_role_change_allowed_14c(uuid)
from public, anon, authenticated;
grant execute on function public.service_platform_role_change_allowed_14c(uuid)
to service_role;

create or replace function public.service_school_admin_suspension_blockers_14c(p_user uuid)
returns table(school_id uuid, school_name text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select distinct target.school_id, school.name
  from public.institutional_memberships target
  join public.schools school on school.id=target.school_id
  where target.person_id=p_user
    and target.role='school_admin'
    and target.status='active'
    and target.valid_from<=now()
    and (target.valid_to is null or target.valid_to>now())
    and not exists (
      select 1
      from public.institutional_memberships alternative
      join public.profiles profile on profile.id=alternative.person_id
      where alternative.school_id=target.school_id
        and alternative.person_id<>p_user
        and alternative.role='school_admin'
        and alternative.status='active'
        and alternative.valid_from<=now()
        and (alternative.valid_to is null or alternative.valid_to>now())
        and profile.account_status='active'
    );
$$;

revoke all on function public.service_school_admin_suspension_blockers_14c(uuid)
from public, anon, authenticated;
grant execute on function public.service_school_admin_suspension_blockers_14c(uuid)
to service_role;
