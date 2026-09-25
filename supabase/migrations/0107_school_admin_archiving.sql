-- Reversible, school-scoped archiving for the school administrator workspace.
-- Archived teachers retain their grants and assignments so restoration does not
-- destroy historical relationships. Active access still requires an active
-- institutional membership in every protected service.

alter table public.institutional_memberships
  drop constraint institutional_memberships_status_check;
alter table public.institutional_memberships
  add constraint institutional_memberships_status_check
  check (status in ('pending','active','archived','ended','revoked'));

create or replace function public.end_teacher_subjects_on_membership_14b()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  if old.role='teacher'
     and old.status in ('active','archived')
     and new.status not in ('active','archived') then
    update public.teacher_subject_authorizations
      set status='revoked',valid_to=greatest(now(),valid_from+interval '1 microsecond'),
        ended_by=new.ended_by
      where teacher_membership_id=new.id and status='active';
  end if;
  return new;
end $$;

create or replace function public.service_set_school_year_archived_14b(
  p_actor uuid, p_school uuid, p_year uuid, p_archived boolean
) returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_year record;
begin
  if p_actor is null or p_school is null or p_year is null or p_archived is null
     or not private.active_school_admin_14b(p_actor,p_school) then
    raise exception 'school_year_unavailable' using errcode='P0001';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('school-year:'||p_school::text,0));
  select * into v_year from public.academic_years
    where id=p_year and school_id=p_school for update;
  if not found then
    raise exception 'school_year_unavailable' using errcode='P0001';
  end if;

  if p_archived then
    if v_year.status='closed' then return true; end if;
    if v_year.status<>'active' then
      raise exception 'school_year_unavailable' using errcode='P0001';
    end if;
    update public.academic_years set status='closed' where id=v_year.id;
    return true;
  end if;

  if v_year.status='active' then return true; end if;
  if v_year.status<>'closed'
     or v_year.starts_on>current_date or v_year.ends_on<current_date then
    raise exception 'school_year_restore_unavailable' using errcode='P0001';
  end if;
  if exists(
    select 1 from public.academic_years y
    where y.school_id=p_school and y.id<>v_year.id and y.status='active'
      and daterange(y.starts_on,y.ends_on,'[]')
        && daterange(v_year.starts_on,v_year.ends_on,'[]')
  ) then
    raise exception 'school_year_overlap' using errcode='P0001';
  end if;
  update public.academic_years set status='active' where id=v_year.id;
  return true;
end $$;

create or replace function public.service_set_school_teacher_archived_14b(
  p_actor uuid, p_school uuid, p_membership uuid, p_archived boolean
) returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_member record;
begin
  if p_actor is null or p_school is null or p_membership is null or p_archived is null
     or not private.active_school_admin_14b(p_actor,p_school) then
    raise exception 'school_teacher_unavailable' using errcode='P0001';
  end if;
  select * into v_member from public.institutional_memberships
    where id=p_membership and school_id=p_school and role='teacher' for update;
  if not found or v_member.person_id=p_actor then
    raise exception 'school_teacher_unavailable' using errcode='P0001';
  end if;

  if p_archived then
    if v_member.status='archived' then return true; end if;
    if v_member.status<>'active' or v_member.valid_from>now()
       or (v_member.valid_to is not null and v_member.valid_to<=now()) then
      raise exception 'school_teacher_unavailable' using errcode='P0001';
    end if;
    update public.institutional_memberships
      set status='archived',ended_by=null,end_reason=null
      where id=v_member.id;
    return true;
  end if;

  if v_member.status='active' and v_member.valid_from<=now()
     and (v_member.valid_to is null or v_member.valid_to>now()) then return true; end if;
  if v_member.status<>'archived' or v_member.valid_from>now()
     or (v_member.valid_to is not null and v_member.valid_to<=now())
     or not exists(select 1 from public.profiles
       where id=v_member.person_id and role='teacher' and account_status='active') then
    raise exception 'school_teacher_restore_unavailable' using errcode='P0001';
  end if;
  if exists(select 1 from public.institutional_memberships m
    where m.id<>v_member.id and m.school_id=p_school
      and m.person_id=v_member.person_id and m.role='teacher'
      and m.status='active' and m.valid_from<=now()
      and (m.valid_to is null or m.valid_to>now())) then
    raise exception 'school_teacher_conflict' using errcode='P0001';
  end if;
  update public.institutional_memberships
    set status='active',ended_by=null,end_reason=null
    where id=v_member.id;
  return true;
end $$;

create or replace function public.service_list_school_teachers_14b(
  p_actor uuid, p_school uuid
) returns table(
  person_id uuid, membership_id uuid, display_name text, email text,
  account_status text, membership_status text, subjects jsonb, classes jsonb
) language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
  if p_actor is null or p_school is null
     or not private.active_school_admin_14b(p_actor,p_school) then
    raise exception 'school_teachers_unavailable' using errcode='P0001';
  end if;

  return query
  with selected_memberships as (
    select distinct on (m.person_id) m.*
    from public.institutional_memberships m
    where m.school_id=p_school and m.role='teacher'
    order by m.person_id,
      (m.status='active' and m.valid_from<=now()
       and (m.valid_to is null or m.valid_to>now())) desc,
      (m.status='archived') desc,m.created_at desc
  )
  select m.person_id,m.id,p.display_name,u.email::text,p.account_status,
    case
      when m.status='active' and m.valid_from<=now()
        and (m.valid_to is null or m.valid_to>now()) then 'active'
      when m.status='archived' then 'archived'
      else 'ended'
    end,
    coalesce(grants.subjects,'[]'::jsonb),
    coalesce(assigned.classes,'[]'::jsonb)
  from selected_memberships m
  left join public.profiles p on p.id=m.person_id
  left join auth.users u on u.id=m.person_id
  left join lateral (
    select jsonb_agg(jsonb_build_object('nameHy',s.name_hy)
      order by s.name_hy) as subjects
    from public.teacher_subject_authorizations g
    join public.subjects s on s.id=g.subject_id
    where g.teacher_membership_id=m.id and g.school_id=m.school_id
      and g.status='active' and g.valid_from<=now()
      and (g.valid_to is null or g.valid_to>now())
  ) grants on true
  left join lateral (
    select jsonb_agg(jsonb_build_object(
      'name',c.name,'subjectName',s.name_hy,'gradeNumber',gr.grade_number,
      'isActive',(c.is_active and y.status='active'
        and y.starts_on<=current_date and y.ends_on>=current_date),
      'academicYear',y.label)
      order by c.created_at desc) as classes
    from public.teacher_assignments a
    join public.classes c on c.id=a.class_id and c.school_id=m.school_id
      and c.teacher_id=m.person_id
    join public.academic_years y on y.id=c.academic_year_id and y.school_id=m.school_id
    join public.subjects s on s.id=c.subject_id
    join public.grades gr on gr.id=c.grade_id
    where a.teacher_membership_id=m.id and a.school_id=m.school_id
      and a.status='active' and a.valid_from<=now()
      and (a.valid_to is null or a.valid_to>now())
  ) assigned on true
  order by (m.status='active' and m.valid_from<=now()
    and (m.valid_to is null or m.valid_to>now())) desc,
    (m.status='archived') desc,u.email;
end $$;

revoke all on function public.service_set_school_year_archived_14b(uuid,uuid,uuid,boolean)
  from public,anon,authenticated;
grant execute on function public.service_set_school_year_archived_14b(uuid,uuid,uuid,boolean)
  to service_role;
revoke all on function public.service_set_school_teacher_archived_14b(uuid,uuid,uuid,boolean)
  from public,anon,authenticated;
grant execute on function public.service_set_school_teacher_archived_14b(uuid,uuid,uuid,boolean)
  to service_role;
revoke all on function public.service_list_school_teachers_14b(uuid,uuid)
  from public,anon,authenticated;
grant execute on function public.service_list_school_teachers_14b(uuid,uuid)
  to service_role;
