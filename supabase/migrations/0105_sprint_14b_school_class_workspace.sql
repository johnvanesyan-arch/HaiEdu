-- School-scoped academic year and class setup. The legacy join code path remains isolated.
create or replace function public.service_create_school_year_14b(
  p_actor uuid, p_school uuid, p_label text, p_starts date, p_ends date
) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid; v_label text := btrim(coalesce(p_label,''));
begin
  if p_school is null or p_starts is null or p_ends is null
     or length(v_label) < 4 or length(v_label) > 32
     or p_starts > current_date or p_ends < current_date
     or p_ends <= p_starts or p_ends - p_starts > 400
     or not private.active_school_admin_14b(p_actor,p_school) then
    raise exception 'school_year_unavailable' using errcode='P0001';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('school-year:'||p_school::text,0));
  if exists(
    select 1 from public.academic_years
      where school_id=p_school and status='active'
        and daterange(starts_on,ends_on,'[]') && daterange(p_starts,p_ends,'[]')
  ) then raise exception 'school_year_overlap' using errcode='P0001'; end if;
  insert into public.academic_years
    (school_id,label,starts_on,ends_on,status,created_by)
  values (p_school,v_label,p_starts,p_ends,'active',p_actor)
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.service_create_teacher_class_14b(
  p_actor uuid, p_membership uuid, p_year uuid, p_program uuid, p_name text
) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_member record; v_year record; v_program record; v_grant uuid;
  v_class uuid; v_name text := btrim(coalesce(p_name,''));
begin
  if p_actor is null or p_membership is null or p_year is null or p_program is null
    or length(v_name) < 2 or length(v_name) > 120
    or not exists(select 1 from public.profiles
      where id=p_actor and role='teacher' and account_status='active') then
    raise exception 'teacher_class_unavailable' using errcode='P0001';
  end if;
  select * into v_member from public.institutional_memberships
    where id=p_membership and person_id=p_actor and role='teacher'
      and status='active' and valid_from<=now()
      and (valid_to is null or valid_to>now()) for share;
  if not found then raise exception 'teacher_class_unavailable' using errcode='P0001'; end if;
  select * into v_year from public.academic_years
    where id=p_year and school_id=v_member.school_id and status='active'
      and starts_on<=current_date and ends_on>=current_date for share;
  if not found then raise exception 'school_year_unavailable' using errcode='P0001'; end if;
  select p.* into v_program from public.subject_programs p
    join public.subjects s on s.id=p.subject_id
    where p.id=p_program and p.status::text='published'
      and s.status::text='published' for share of p,s;
  if not found then raise exception 'subject_program_unavailable' using errcode='P0001'; end if;
  select id into v_grant from public.teacher_subject_authorizations
    where teacher_membership_id=v_member.id and school_id=v_member.school_id
      and subject_id=v_program.subject_id and status='active'
      and valid_from<=now() and (valid_to is null or valid_to>now()) for share;
  if v_grant is null then raise exception 'teacher_subject_unavailable' using errcode='P0001'; end if;
  insert into public.classes
    (school_id,academic_year_id,teacher_id,subject_id,grade_id,name,academic_year,join_code,is_active)
  values (v_member.school_id,v_year.id,p_actor,v_program.subject_id,
    v_program.grade_id,v_name,v_year.label,null,true)
  returning id into v_class;
  insert into public.teacher_assignments
    (school_id,academic_year_id,class_id,teacher_membership_id,subject_program_id,
     status,valid_from,valid_to,created_by)
  values (v_member.school_id,v_year.id,v_class,v_member.id,v_program.id,
    'active',now(),v_member.valid_to,p_actor);
  insert into public.academic_identity_events
    (table_name,row_id,operation,new_value,actor_id)
  values ('classes',v_class,'INSERT',
    jsonb_build_object('school_id',v_member.school_id,'academic_year_id',v_year.id,
      'subject_program_id',v_program.id),p_actor);
  return v_class;
end $$;

create or replace function public.service_set_teacher_class_active_14b(
  p_actor uuid, p_class uuid, p_active boolean
) returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_class record; v_member record; v_assignment record; v_grant uuid;
begin
  if p_actor is null or p_class is null or p_active is null
    or not exists(select 1 from public.profiles
      where id=p_actor and role='teacher' and account_status='active') then
    raise exception 'teacher_class_unavailable' using errcode='P0001';
  end if;
  select * into v_class from public.classes
    where id=p_class and teacher_id=p_actor and school_id is not null for update;
  if not found then raise exception 'teacher_class_unavailable' using errcode='P0001'; end if;
  select a.* into v_assignment from public.teacher_assignments a
    where a.class_id=v_class.id and a.school_id=v_class.school_id
      and a.academic_year_id=v_class.academic_year_id and a.status='active'
      and a.valid_from<=now() and (a.valid_to is null or a.valid_to>now())
    order by a.valid_from desc limit 1 for share;
  if not found then raise exception 'teacher_class_unavailable' using errcode='P0001'; end if;
  select * into v_member from public.institutional_memberships
    where id=v_assignment.teacher_membership_id and person_id=p_actor and role='teacher'
      and school_id=v_class.school_id and status='active' and valid_from<=now()
      and (valid_to is null or valid_to>now()) for share;
  if not found then raise exception 'teacher_class_unavailable' using errcode='P0001'; end if;
  if p_active then
    if not exists(select 1 from public.academic_years
      where id=v_class.academic_year_id and school_id=v_class.school_id
        and status='active' and starts_on<=current_date and ends_on>=current_date)
      or not exists(select 1 from public.subject_programs
        where id=v_assignment.subject_program_id and status::text='published') then
      raise exception 'school_year_unavailable' using errcode='P0001';
    end if;
    select id into v_grant from public.teacher_subject_authorizations
      where teacher_membership_id=v_member.id and school_id=v_member.school_id
        and subject_id=v_class.subject_id and status='active'
        and valid_from<=now() and (valid_to is null or valid_to>now()) for share;
    if v_grant is null then raise exception 'teacher_subject_unavailable' using errcode='P0001'; end if;
  end if;
  if v_class.is_active=p_active then return true; end if;
  update public.classes set is_active=p_active where id=v_class.id;
  insert into public.academic_identity_events
    (table_name,row_id,operation,old_value,new_value,actor_id)
  values ('classes',v_class.id,'UPDATE',
    jsonb_build_object('is_active',v_class.is_active),
    jsonb_build_object('is_active',p_active),p_actor);
  return true;
end $$;

revoke all on function public.service_create_school_year_14b(uuid,uuid,text,date,date),
  public.service_create_teacher_class_14b(uuid,uuid,uuid,uuid,text),
  public.service_set_teacher_class_active_14b(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.service_create_school_year_14b(uuid,uuid,text,date,date),
  public.service_create_teacher_class_14b(uuid,uuid,uuid,uuid,text),
  public.service_set_teacher_class_active_14b(uuid,uuid,boolean) to service_role;
