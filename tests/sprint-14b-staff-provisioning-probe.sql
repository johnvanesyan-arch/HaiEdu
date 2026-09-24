-- No email is sent. Auth rows, schools, memberships and grants all roll back.
begin;
create temporary table _staff_fixture (
  platform_admin uuid, first_admin uuid, teacher_id uuid, physics_id uuid,
  school_id uuid, teacher_membership uuid, subject_grant uuid
) on commit drop;
do $$
declare master uuid; first_admin uuid:=gen_random_uuid(); teacher uuid:=gen_random_uuid(); physics uuid;
begin
  select id into master from public.profiles where role='admin' and account_status='active' limit 1;
  select id into physics from public.subjects where code='physics' and status::text='published';
  if master is null or physics is null then raise exception 'staff_fixture_missing'; end if;
  insert into auth.users(id,instance_id,aud,role,email,encrypted_password,created_at,updated_at)
    values(first_admin,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
      'staff-admin-14b@example.invalid','',now(),now()),
      (teacher,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
      'staff-teacher-14b@example.invalid','',now(),now());
  if (select role::text from public.profiles where id=first_admin)<>'student' or
     (select role::text from public.profiles where id=teacher)<>'student' then
    raise exception 'new_account_profile_not_student'; end if;
  insert into _staff_fixture(platform_admin,first_admin,teacher_id,physics_id)
    values(master,first_admin,teacher,physics);
end $$;
grant select,update on _staff_fixture to service_role;
set local role service_role;
do $$
declare f record; req uuid; denied boolean:=false;
begin
  select * into f from _staff_fixture;
  if public.service_authorize_staff_invite_14b(f.first_admin,'school_admin',null,null) or
     not public.service_authorize_staff_invite_14b(f.platform_admin,'school_admin',null,null) then
    raise exception 'master_invite_authorization_failed'; end if;
  req:=public.service_register_staff_invite_14b(f.platform_admin,f.first_admin,
    'staff-admin-14b@example.invalid','school_admin',null,null,'QA Staff School','QA-STAFF-14B');
  if not exists(select 1 from public.academic_identity_events
       where row_id=req and table_name='staff_account_provisioning'
         and operation='INSERT' and actor_id=f.platform_admin) then
    raise exception 'invite_issuer_audit_missing'; end if;
  begin perform public.service_accept_staff_invite_14b(f.teacher_id,req);
  exception when raise_exception then denied:=true; end;
  if not denied then raise exception 'wrong_recipient_accepted_staff_invite'; end if;
end $$;
reset role;
update auth.users set email_confirmed_at=now() where id=(select first_admin from _staff_fixture);
set local role service_role;
do $$
declare f record; activated jsonb; req uuid;
begin
  select * into f from _staff_fixture;
  activated:=public.service_accept_staff_invite_14b(f.first_admin);
  update _staff_fixture set school_id=(activated->>'schoolId')::uuid;
  if (select role::text from public.profiles where id=f.first_admin)<>'school_admin' or
     not exists(select 1 from public.institutional_memberships
       where id=(activated->>'membershipId')::uuid and person_id=f.first_admin
         and role='school_admin' and status='active') then
    raise exception 'first_admin_activation_failed'; end if;
  if public.service_authorize_staff_invite_14b(f.platform_admin,'teacher',
       (activated->>'schoolId')::uuid,f.physics_id) or
     not public.service_authorize_staff_invite_14b(f.first_admin,'teacher',
       (activated->>'schoolId')::uuid,f.physics_id) then
    raise exception 'teacher_invite_scope_failed'; end if;
  req:=public.service_register_staff_invite_14b(f.first_admin,f.teacher_id,
    'staff-teacher-14b@example.invalid','teacher',(activated->>'schoolId')::uuid,
    f.physics_id,null,null);
end $$;
reset role;
update auth.users set email_confirmed_at=now() where id=(select teacher_id from _staff_fixture);
set local role service_role;
do $$
declare f record; activated jsonb; authz uuid; denied boolean:=false;
  prog uuid; subj uuid; grade uuid; yr uuid; cls uuid; assignment uuid;
begin
  select * into f from _staff_fixture;
  activated:=public.service_accept_staff_invite_14b(f.teacher_id);
  select id into authz from public.teacher_subject_authorizations
    where teacher_membership_id=(activated->>'membershipId')::uuid and subject_id=f.physics_id;
  update _staff_fixture set teacher_membership=(activated->>'membershipId')::uuid,
    subject_grant=authz;
  if (select role::text from public.profiles where id=f.teacher_id)<>'teacher' or
     authz is null then raise exception 'teacher_subject_activation_failed'; end if;
  begin perform public.service_accept_staff_invite_14b(f.teacher_id);
  exception when raise_exception then denied:=true; end;
  if not denied then raise exception 'staff_invite_replay_accepted'; end if;
  select id,subject_id,grade_id into prog,subj,grade from public.subject_programs
    where subject_id=f.physics_id limit 1;
  insert into public.academic_years(school_id,label,starts_on,ends_on,status,created_by)
    values(f.school_id,'14B staff','2026-09-01','2027-08-31','active',f.first_admin)
    returning id into yr;
  insert into public.classes(school_id,academic_year_id,teacher_id,subject_id,grade_id,name)
    values(f.school_id,yr,f.teacher_id,subj,grade,'14B staff fixture') returning id into cls;
  insert into public.teacher_assignments
    (school_id,academic_year_id,class_id,teacher_membership_id,subject_program_id,valid_from,status,created_by)
    values(f.school_id,yr,cls,(activated->>'membershipId')::uuid,prog,now(),'active',f.first_admin)
    returning id into assignment;
  if public.service_revoke_teacher_subject_14b(f.platform_admin,authz) or
     not public.service_revoke_teacher_subject_14b(f.first_admin,authz) then
    raise exception 'subject_revoke_authorization_failed'; end if;
  if (select status from public.teacher_assignments where id=assignment)<>'ended' then
    raise exception 'subject_revoke_or_assignment_cascade_failed'; end if;
end $$;
rollback;
