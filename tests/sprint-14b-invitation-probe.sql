-- Rollback-only 14B transaction probe. Run against an environment with one
-- active admin, teacher, two students and a subject programme.
begin;
create temporary table _14b_fixture (
  school_a uuid, school_b uuid, class_a uuid, class_b uuid,
  assignment_a uuid, admin_id uuid, teacher_id uuid,
  student_a uuid, student_b uuid
) on commit drop;
do $$
declare a uuid; b uuid; ya uuid; yb uuid; ca uuid; cb uuid; ta uuid;
  adm uuid; teach uuid; sa uuid; sb uuid; prog uuid; subj uuid; grade uuid; tm uuid;
begin
  select id into adm from public.profiles where role='admin' and account_status='active' limit 1;
  select id into teach from public.profiles where role='teacher' and account_status='active' limit 1;
  select id into sa from public.profiles where role='student' and account_status='active' order by id limit 1;
  select id into sb from public.profiles where role='student' and account_status='active' order by id offset 1 limit 1;
  select id,subject_id,grade_id into prog,subj,grade from public.subject_programs limit 1;
  if adm is null or teach is null or sa is null or sb is null or prog is null then
    raise exception 'fixture_profiles_or_programme_missing';
  end if;
  insert into public.schools(name,school_code,created_by)
    values ('14B rollback A','QA-14B-INV-A',adm) returning id into a;
  insert into public.schools(name,school_code,created_by)
    values ('14B rollback B','QA-14B-INV-B',adm) returning id into b;
  insert into public.academic_years(school_id,label,starts_on,ends_on,status)
    values(a,'14B','2026-09-01','2027-08-31','active') returning id into ya;
  insert into public.academic_years(school_id,label,starts_on,ends_on,status)
    values(b,'14B','2026-09-01','2027-08-31','active') returning id into yb;
  insert into public.classes(school_id,academic_year_id,teacher_id,subject_id,grade_id,name)
    values(a,ya,teach,subj,grade,'A') returning id into ca;
  insert into public.classes(school_id,academic_year_id,teacher_id,subject_id,grade_id,name)
    values(b,yb,teach,subj,grade,'B') returning id into cb;
  insert into public.institutional_memberships(school_id,person_id,role,valid_from,status)
    values(a,adm,'school_admin',now()-interval '1 day','active');
  insert into public.institutional_memberships(school_id,person_id,role,valid_from,status)
    values(a,teach,'teacher',now()-interval '1 day','active') returning id into tm;
  insert into public.teacher_subject_authorizations
    (school_id,teacher_membership_id,subject_id,created_by)
    values(a,tm,subj,adm);
  insert into public.teacher_assignments
    (school_id,academic_year_id,class_id,teacher_membership_id,subject_program_id,valid_from,status)
    values(a,ya,ca,tm,prog,now()-interval '1 hour','active') returning id into ta;
  insert into _14b_fixture values(a,b,ca,cb,ta,adm,teach,sa,sb);
end $$;
grant select on _14b_fixture to service_role;
set local role service_role;
do $$
declare f record; ia uuid; ib uuid; ic uuid; result jsonb;
  denied boolean := false; wrong_user boolean := false; replay boolean := false;
  revoked_denied boolean := false;
begin
  select * into f from _14b_fixture;
  begin
    perform public.service_issue_institutional_invitation_14b(
      f.teacher_id,f.student_a,f.school_b,'student',f.class_b,null,
      repeat('d',64),now()+interval '1 day');
  exception when raise_exception then denied := true;
  end;
  if not denied then raise exception 'cross_school_issue_accepted'; end if;

  ia:=public.service_issue_institutional_invitation_14b(
    f.admin_id,f.student_a,f.school_a,'student',f.class_a,null,
    repeat('a',64),now()+interval '1 day');
  begin
    perform public.service_redeem_institutional_invitation_14b(f.student_b,repeat('a',64));
  exception when raise_exception then wrong_user := true;
  end;
  if not wrong_user then raise exception 'wrong_recipient_accepted'; end if;

  result:=public.service_redeem_institutional_invitation_14b(f.student_a,repeat('a',64));
  if (result->>'schoolId')::uuid<>f.school_a or
     not exists(select 1 from public.institutional_class_enrollments
       where invitation_id=ia and school_id=f.school_a) then
    raise exception 'atomic_enrollment_missing';
  end if;
  begin
    perform public.service_redeem_institutional_invitation_14b(f.student_a,repeat('a',64));
  exception when raise_exception then replay := true;
  end;
  if not replay then raise exception 'single_use_replay_accepted'; end if;

  ib:=public.service_issue_institutional_invitation_14b(
    f.teacher_id,f.student_b,f.school_a,'student',f.class_a,f.assignment_a,
    repeat('b',64),now()+interval '1 day');
  perform public.service_redeem_institutional_invitation_14b(f.student_b,repeat('b',64));
  ic:=public.service_issue_institutional_invitation_14b(
    f.admin_id,f.teacher_id,f.school_a,'teacher',null,null,
    repeat('c',64),now()+interval '1 day');
  if not public.service_revoke_institutional_invitation_14b(f.admin_id,ic) then
    raise exception 'revoke_failed';
  end if;
  begin
    perform public.service_redeem_institutional_invitation_14b(f.teacher_id,repeat('c',64));
  exception when raise_exception then revoked_denied := true;
  end;
  if not revoked_denied then raise exception 'revoked_invitation_accepted'; end if;
  if (select count(*) from public.institutional_class_enrollments
      where school_id=f.school_a)<>2 or
     exists(select 1 from public.class_memberships
       where class_id in(f.class_a,f.class_b)) then
    raise exception 'enrollment_boundary_failed';
  end if;
end $$;
rollback;
