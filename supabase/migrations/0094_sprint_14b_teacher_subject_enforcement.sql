create function public.service_grant_teacher_subject_14b(
 p_actor uuid,p_teacher_membership uuid,p_subject uuid
) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_member record; v_id uuid;
begin
  select * into v_member from public.institutional_memberships
    where id=p_teacher_membership for share;
  if not found or v_member.role<>'teacher' or v_member.status<>'active'
    or v_member.valid_from>now() or (v_member.valid_to is not null and v_member.valid_to<=now())
    or not private.active_school_admin_14b(p_actor,v_member.school_id)
    or not exists(select 1 from public.subjects where id=p_subject and status::text='published') then
    raise exception 'teacher_subject_unavailable' using errcode='P0001'; end if;
  insert into public.teacher_subject_authorizations
    (school_id,teacher_membership_id,subject_id,created_by)
  values(v_member.school_id,p_teacher_membership,p_subject,p_actor)
  returning id into v_id;
  return v_id;
end $$;

create function public.service_revoke_teacher_subject_14b(
 p_actor uuid,p_authorization uuid
) returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v record;
begin
  select * into v from public.teacher_subject_authorizations
    where id=p_authorization for update;
  if not found or v.status<>'active' or
     not private.active_school_admin_14b(p_actor,v.school_id) then return false; end if;
  update public.teacher_assignments a
    set status='ended',valid_to=greatest(now(),a.valid_from+interval '1 microsecond'),
      ended_by=p_actor,end_reason='role_change'
    from public.subject_programs p
    where a.teacher_membership_id=v.teacher_membership_id and a.school_id=v.school_id
      and a.subject_program_id=p.id and p.subject_id=v.subject_id and a.status='active';
  update public.teacher_subject_authorizations
    set status='revoked',valid_to=greatest(now(),valid_from+interval '1 microsecond'),
      ended_by=p_actor where id=p_authorization;
  return true;
end $$;

create or replace function public.validate_teacher_assignment_14a() returns trigger
language plpgsql set search_path=public,pg_temp as $$
declare m record; c record; p record; v_grant uuid;
begin
  select role,status,valid_from,valid_to into m from public.institutional_memberships
    where id=new.teacher_membership_id and school_id=new.school_id for share;
  select subject_id,grade_id into c from public.classes
    where id=new.class_id and school_id=new.school_id and academic_year_id=new.academic_year_id;
  select subject_id,grade_id into p from public.subject_programs where id=new.subject_program_id;
  if m.role is distinct from 'teacher' or c.subject_id is distinct from p.subject_id
     or c.grade_id is distinct from p.grade_id or c.subject_id is null then
    raise exception 'assignment_identity_mismatch' using errcode='23514'; end if;
  if new.status='active' then
    if m.status is distinct from 'active' or m.valid_from>now()
       or (m.valid_to is not null and m.valid_to<=now()) or new.valid_from<m.valid_from
       or (m.valid_to is not null and (new.valid_to is null or new.valid_to>m.valid_to)) then
      raise exception 'assignment_outside_teacher_membership' using errcode='23514'; end if;
    select id into v_grant from public.teacher_subject_authorizations
      where teacher_membership_id=new.teacher_membership_id
        and school_id=new.school_id and subject_id=p.subject_id
        and status='active' and valid_from<=now()
        and (valid_to is null or valid_to>now()) for share;
    if v_grant is null then
      raise exception 'assignment_outside_subject_authorization' using errcode='23514'; end if;
  end if;
  return new;
end $$;

create function public.end_teacher_subjects_on_membership_14b() returns trigger
language plpgsql set search_path=public,pg_temp as $$
begin
  if old.role='teacher' and old.status='active' and new.status<>'active' then
    update public.teacher_subject_authorizations
      set status='revoked',valid_to=greatest(now(),valid_from+interval '1 microsecond'),
        ended_by=new.ended_by
      where teacher_membership_id=new.id and status='active';
  end if;
  return new;
end $$;
create trigger end_teacher_subjects_on_membership_14b
 after update of status on public.institutional_memberships
 for each row execute function public.end_teacher_subjects_on_membership_14b();

revoke all on function public.service_grant_teacher_subject_14b(uuid,uuid,uuid),
 public.service_revoke_teacher_subject_14b(uuid,uuid),
 public.end_teacher_subjects_on_membership_14b() from public,anon,authenticated;
grant execute on function public.service_grant_teacher_subject_14b(uuid,uuid,uuid),
 public.service_revoke_teacher_subject_14b(uuid,uuid) to service_role;
