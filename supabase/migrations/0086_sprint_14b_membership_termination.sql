-- Sprint 14B: audited termination of institutional access.
alter table public.institutional_memberships add column end_reason text
  check (end_reason in ('withdrawn','transfer','year_end','role_change','administrative'));
alter table public.teacher_assignments add column ended_by uuid references public.profiles(id) on delete set null;
alter table public.teacher_assignments add column end_reason text
  check (end_reason in ('withdrawn','transfer','year_end','role_change','administrative'));
alter table public.institutional_class_enrollments add column ended_by uuid references public.profiles(id) on delete set null;
alter table public.institutional_class_enrollments add column end_reason text
  check (end_reason in ('withdrawn','transfer','year_end','role_change','administrative'));
create index teacher_assignments_ended_by_idx on public.teacher_assignments(ended_by) where ended_by is not null;
create index institutional_enrollments_ended_by_idx on public.institutional_class_enrollments(ended_by) where ended_by is not null;

-- Lock the parent while inserting an active enrollment. A concurrent end
-- waits on this lock and subsequently ends every enrollment in one transaction.
create function public.validate_institutional_enrollment_14b() returns trigger
language plpgsql set search_path = public, pg_temp as $$
declare v_member record; v_inv record;
begin
  if new.status <> 'active' then return new; end if;
  select person_id, role, school_id, status, valid_from, valid_to into v_member
    from public.institutional_memberships where id=new.student_membership_id for share;
  select recipient_user_id, school_id, class_id, academic_year_id, used_at, revoked_at
    into v_inv from public.institutional_invitations where id=new.invitation_id;
  if v_member.person_id is distinct from new.student_id or v_member.role is distinct from 'student'
     or v_member.school_id is distinct from new.school_id or v_member.status is distinct from 'active'
     or v_member.valid_from > now() or (v_member.valid_to is not null and v_member.valid_to <= now())
     or v_inv.recipient_user_id is distinct from new.student_id
     or v_inv.school_id is distinct from new.school_id
     or v_inv.class_id is distinct from new.class_id
     or v_inv.academic_year_id is distinct from new.academic_year_id
     or v_inv.revoked_at is not null then
    raise exception 'enrollment_identity_invalid' using errcode='23514';
  end if;
  return new;
end $$;
create trigger validate_institutional_enrollment_14b
before insert or update on public.institutional_class_enrollments
for each row execute function public.validate_institutional_enrollment_14b();
revoke all on function public.validate_institutional_enrollment_14b() from public, anon, authenticated;

create function public.service_end_institutional_enrollment_14b(
  p_actor uuid, p_enrollment uuid, p_reason text
) returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_row record;
begin
  if p_reason is null or p_reason not in ('withdrawn','transfer','year_end','role_change','administrative')
    then return false; end if;
  select * into v_row from public.institutional_class_enrollments where id=p_enrollment for update;
  if not found or v_row.status <> 'active' or
     not exists(select 1 from public.profiles where id=p_actor and account_status='active') then
    return false;
  end if;
  if not exists(select 1 from public.institutional_memberships m
     where m.school_id=v_row.school_id and m.person_id=p_actor and m.role='school_admin'
       and m.status='active' and m.valid_from<=now() and (m.valid_to is null or m.valid_to>now()))
    and not exists(select 1 from public.teacher_assignments a
      join public.institutional_memberships m on m.id=a.teacher_membership_id and m.school_id=a.school_id
      where a.school_id=v_row.school_id and a.class_id=v_row.class_id
        and a.academic_year_id=v_row.academic_year_id and a.status='active'
        and a.valid_from<=now() and (a.valid_to is null or a.valid_to>now())
        and m.person_id=p_actor and m.role='teacher' and m.status='active'
        and m.valid_from<=now() and (m.valid_to is null or m.valid_to>now())) then
    return false;
  end if;
  update public.institutional_class_enrollments
    set status='ended', valid_to=greatest(now(),valid_from+interval '1 microsecond'),
        ended_by=p_actor,end_reason=p_reason where id=p_enrollment;
  return true;
end $$;

create function public.service_end_institutional_membership_14b(
  p_actor uuid, p_membership uuid, p_reason text
) returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_row record;
begin
  if p_reason is null or p_reason not in ('withdrawn','transfer','year_end','role_change','administrative')
    then return false; end if;
  select * into v_row from public.institutional_memberships where id=p_membership for update;
  if not found or v_row.status <> 'active' or v_row.person_id=p_actor or
     not exists(select 1 from public.profiles where id=p_actor and account_status='active') or
     not exists(select 1 from public.institutional_memberships m
       where m.school_id=v_row.school_id and m.person_id=p_actor and m.role='school_admin'
         and m.status='active' and m.valid_from<=now() and (m.valid_to is null or m.valid_to>now()))
    then return false; end if;
  update public.institutional_class_enrollments
    set status='ended', valid_to=greatest(now(),valid_from+interval '1 microsecond'),
        ended_by=p_actor,end_reason=p_reason
    where student_membership_id=p_membership and status='active';
  update public.teacher_assignments
    set status='ended', valid_to=greatest(now(),valid_from+interval '1 microsecond'),
        ended_by=p_actor,end_reason=p_reason
    where teacher_membership_id=p_membership and status='active';
  update public.institutional_memberships
    set status='ended',valid_to=greatest(now(),valid_from+interval '1 microsecond'),
        ended_by=p_actor,end_reason=p_reason where id=p_membership;
  return true;
end $$;
revoke all on function public.service_end_institutional_enrollment_14b(uuid,uuid,text),
  public.service_end_institutional_membership_14b(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.service_end_institutional_enrollment_14b(uuid,uuid,text),
  public.service_end_institutional_membership_14b(uuid,uuid,text) to service_role;
