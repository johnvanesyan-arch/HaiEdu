-- Execute as a rollback-only probe after migration 0105. No fixture data persists.
begin;
do $$
declare v_school uuid; v_admin uuid; v_membership uuid; v_teacher uuid;
  v_year uuid; v_class uuid; v_program uuid; v_denied boolean;
begin
  select m.school_id,m.person_id into v_school,v_admin
    from public.institutional_memberships m
    join public.profiles p on p.id=m.person_id
    where m.role='school_admin' and m.status='active'
      and m.valid_from<=now() and (m.valid_to is null or m.valid_to>now())
      and p.role='school_admin' and p.account_status='active'
    limit 1;
  select m.id,m.person_id into v_membership,v_teacher
    from public.institutional_memberships m
    join public.profiles p on p.id=m.person_id
    where m.school_id=v_school and m.role='teacher' and m.status='active'
      and m.valid_from<=now() and (m.valid_to is null or m.valid_to>now())
      and p.role='teacher' and p.account_status='active'
    limit 1;
  select p.id into v_program from public.teacher_subject_authorizations g
    join public.subject_programs p on p.subject_id=g.subject_id
    where g.teacher_membership_id=v_membership and g.status='active'
      and g.valid_from<=now() and (g.valid_to is null or g.valid_to>now())
      and p.status::text='published' limit 1;
  if v_school is null or v_admin is null or v_membership is null or v_program is null then
    raise exception 'missing_ready_qa_staff';
  end if;

  v_year := public.service_create_school_year_14b(
    v_admin,v_school,'QA-2026-2027',date '2026-09-01',date '2027-08-31');
  v_class := public.service_create_teacher_class_14b(
    v_teacher,v_membership,v_year,v_program,'QA 7A');
  if not exists(select 1 from public.classes
      where id=v_class and school_id=v_school and academic_year_id=v_year
        and teacher_id=v_teacher and join_code is null) or
     not exists(select 1 from public.teacher_assignments
      where class_id=v_class and teacher_membership_id=v_membership
        and subject_program_id=v_program and status='active') then
    raise exception 'class_assignment_not_atomic';
  end if;
  if not public.service_set_teacher_class_active_14b(v_teacher,v_class,false) or
     not exists(select 1 from public.classes where id=v_class and is_active=false) then
    raise exception 'archive_failed';
  end if;
  if not public.service_set_teacher_class_active_14b(v_teacher,v_class,true) or
     not exists(select 1 from public.classes where id=v_class and is_active=true) then
    raise exception 'activation_failed';
  end if;

  v_denied:=false;
  begin
    perform public.service_create_teacher_class_14b(v_admin,v_membership,v_year,v_program,'wrong role');
  exception when others then v_denied:=true; end;
  if not v_denied then raise exception 'admin_created_teacher_class'; end if;

  v_denied:=false;
  begin
    perform public.service_create_teacher_class_14b(
      v_teacher,v_membership,gen_random_uuid(),v_program,'wrong year');
  exception when others then v_denied:=true; end;
  if not v_denied then raise exception 'invalid_year_accepted'; end if;

  v_denied:=false;
  begin
    perform public.service_set_teacher_class_active_14b(v_admin,v_class,false);
  exception when others then v_denied:=true; end;
  if not v_denied then raise exception 'admin_changed_teacher_class'; end if;

  if has_table_privilege('authenticated','public.academic_years','INSERT') or
     has_table_privilege('authenticated','public.teacher_assignments','INSERT') or
     has_function_privilege('authenticated',
       'public.service_create_teacher_class_14b(uuid,uuid,uuid,uuid,text)','EXECUTE') then
    raise exception 'client_write_permission_leak';
  end if;
end $$;
rollback;
