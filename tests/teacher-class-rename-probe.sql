-- Rollback-only verification for the teacher-owned institutional classroom rename.
begin;
do $$
declare
  v_actor uuid;
  v_class uuid;
  v_original text;
  v_new text;
  v_result text;
  v_denied boolean := false;
begin
  select c.teacher_id,c.id,c.name
    into v_actor,v_class,v_original
    from public.classes c
    join public.teacher_assignments a on a.class_id=c.id
      and a.school_id=c.school_id
      and a.academic_year_id=c.academic_year_id
      and a.status='active'
      and a.valid_from<=now()
      and (a.valid_to is null or a.valid_to>now())
    join public.institutional_memberships m on m.id=a.teacher_membership_id
      and m.person_id=c.teacher_id
      and m.school_id=c.school_id
      and m.role='teacher'
      and m.status='active'
      and m.valid_from<=now()
      and (m.valid_to is null or m.valid_to>now())
    join public.profiles p on p.id=c.teacher_id
      and p.role='teacher' and p.account_status='active'
    where c.school_id is not null
    limit 1;

  if v_class is null then raise exception 'missing_teacher_class_fixture'; end if;

  v_new := left(v_original,115) || ' QA';
  v_result := public.service_rename_teacher_class_14b(v_actor,v_class,v_new);
  if v_result<>v_new or not exists(
    select 1 from public.classes where id=v_class and name=v_new
  ) then raise exception 'rename_failed'; end if;

  if not exists(
    select 1 from public.academic_identity_events
    where table_name='classes' and row_id=v_class and actor_id=v_actor
      and operation='UPDATE' and new_value->>'name'=v_new
  ) then raise exception 'rename_audit_missing'; end if;

  begin
    perform public.service_rename_teacher_class_14b(gen_random_uuid(),v_class,'Denied name');
  exception when others then v_denied := true; end;
  if not v_denied then raise exception 'cross_teacher_rename_allowed'; end if;

  if has_function_privilege('authenticated',
    'public.service_rename_teacher_class_14b(uuid,uuid,text)','EXECUTE') then
    raise exception 'rename_function_exposed_to_clients';
  end if;
end $$;
rollback;
