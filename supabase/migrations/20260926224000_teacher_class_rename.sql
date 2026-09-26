-- Teacher-owned institutional classroom rename with school-scope validation and audit.
create or replace function public.service_rename_teacher_class_14b(
  p_actor uuid, p_class uuid, p_name text
) returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_class record;
  v_member record;
  v_assignment record;
  v_name text := btrim(coalesce(p_name,''));
begin
  if p_actor is null or p_class is null
    or length(v_name) < 2 or length(v_name) > 120
    or not exists(
      select 1 from public.profiles
      where id=p_actor and role='teacher' and account_status='active'
    ) then
    raise exception 'teacher_class_unavailable' using errcode='P0001';
  end if;

  select id,school_id,academic_year_id,teacher_id,name
    into v_class
    from public.classes
    where id=p_class and teacher_id=p_actor and school_id is not null
    for update;
  if not found then
    raise exception 'teacher_class_unavailable' using errcode='P0001';
  end if;

  select a.*
    into v_assignment
    from public.teacher_assignments a
    where a.class_id=v_class.id
      and a.school_id=v_class.school_id
      and a.academic_year_id=v_class.academic_year_id
      and a.status='active'
      and a.valid_from<=now()
      and (a.valid_to is null or a.valid_to>now())
    order by a.valid_from desc
    limit 1
    for share;
  if not found then
    raise exception 'teacher_class_unavailable' using errcode='P0001';
  end if;

  select *
    into v_member
    from public.institutional_memberships
    where id=v_assignment.teacher_membership_id
      and person_id=p_actor
      and role='teacher'
      and school_id=v_class.school_id
      and status='active'
      and valid_from<=now()
      and (valid_to is null or valid_to>now())
    for share;
  if not found then
    raise exception 'teacher_class_unavailable' using errcode='P0001';
  end if;

  if v_class.name=v_name then
    return v_name;
  end if;

  update public.classes set name=v_name where id=v_class.id;
  insert into public.academic_identity_events
    (table_name,row_id,operation,old_value,new_value,actor_id)
  values (
    'classes',v_class.id,'UPDATE',
    jsonb_build_object('name',v_class.name),
    jsonb_build_object('name',v_name),
    p_actor
  );
  return v_name;
end $$;

revoke all on function public.service_rename_teacher_class_14b(uuid,uuid,text)
  from public,anon,authenticated;
grant execute on function public.service_rename_teacher_class_14b(uuid,uuid,text)
  to service_role;
