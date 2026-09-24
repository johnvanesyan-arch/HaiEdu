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
    values ('14B rollback A','QA-14B-TERM-A',adm) returning id into a;
  insert into public.schools(name,school_code,created_by)
    values ('14B rollback B','QA-14B-TERM-B',adm) returning id into b;
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
declare f record; ia uuid; ib uuid; ea uuid; eb uuid; ma uuid; mb uuid; tm uuid;
begin
  select * into f from _14b_fixture;
  ia:=public.service_issue_institutional_invitation_14b(
    f.admin_id,f.student_a,f.school_a,'student',f.class_a,null,repeat('e',64),now()+interval '1 day');
  ib:=public.service_issue_institutional_invitation_14b(
    f.admin_id,f.student_b,f.school_a,'student',f.class_a,null,repeat('f',64),now()+interval '1 day');
  perform public.service_redeem_institutional_invitation_14b(f.student_a,repeat('e',64));
  perform public.service_redeem_institutional_invitation_14b(f.student_b,repeat('f',64));
  select id,student_membership_id into ea,ma from public.institutional_class_enrollments where invitation_id=ia;
  select id,student_membership_id into eb,mb from public.institutional_class_enrollments where invitation_id=ib;
  if public.service_end_institutional_enrollment_14b(f.student_b,ea,'withdrawn') or
     public.service_end_institutional_membership_14b(f.teacher_id,ma,'transfer') then
    raise exception 'unauthorized_termination_accepted';
  end if;
  if not public.service_end_institutional_enrollment_14b(f.teacher_id,ea,'withdrawn') then
    raise exception 'assigned_teacher_cannot_end_enrollment';
  end if;
  if (select status from public.institutional_memberships where id=ma)<>'active' or
     (select actor_id from public.academic_identity_events where row_id=ea and operation='UPDATE'
      order by id desc limit 1)<>f.teacher_id then
    raise exception 'enrollment_end_or_audit_failed';
  end if;
  if public.service_end_institutional_enrollment_14b(f.teacher_id,ea,'withdrawn') or
     public.service_end_institutional_membership_14b(f.admin_id,mb,'invalid') then
    raise exception 'repeat_or_invalid_reason_accepted';
  end if;
  if not public.service_end_institutional_membership_14b(f.admin_id,mb,'transfer') then
    raise exception 'student_membership_end_failed';
  end if;
  if (select status from public.institutional_class_enrollments where id=eb)<>'ended' or
     (select ended_by from public.institutional_class_enrollments where id=eb)<>f.admin_id or
     (select actor_id from public.academic_identity_events where row_id=mb and operation='UPDATE'
      order by id desc limit 1)<>f.admin_id then
    raise exception 'student_membership_cascade_failed';
  end if;
  select teacher_membership_id into tm from public.teacher_assignments where id=f.assignment_a;
  if not public.service_end_institutional_membership_14b(f.admin_id,tm,'role_change') then
    raise exception 'teacher_membership_end_failed';
  end if;
  if (select status from public.teacher_assignments where id=f.assignment_a)<>'ended' or
     (select ended_by from public.teacher_assignments where id=f.assignment_a)<>f.admin_id then
    raise exception 'teacher_assignment_cascade_failed';
  end if;
  if public.service_end_institutional_membership_14b(f.admin_id,tm,'role_change') or
     exists(select 1 from public.class_memberships where class_id in(f.class_a,f.class_b)) then
    raise exception 'repeat_or_legacy_boundary_failed';
  end if;
end $$;
rollback;
