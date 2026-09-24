-- Two-school isolation and revocation are checked inside a rollback.
begin;
create temporary table _staff_manage_fixture (
  actor uuid, admin_a uuid, admin_b uuid, teacher_a uuid, teacher_b uuid,
  school_admin_invitee uuid, school_a uuid, school_b uuid, subject_id uuid,
  invite_a uuid, invite_b uuid, invite_master uuid
) on commit drop;
do $$
declare f record; a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid();
  t_a uuid:=gen_random_uuid(); t_b uuid:=gen_random_uuid(); m uuid:=gen_random_uuid();
  actor uuid; physics uuid;
begin
  select id into actor from public.profiles where role='admin' and account_status='active' limit 1;
  select id into physics from public.subjects where code='physics' and status::text='published';
  if actor is null or physics is null then raise exception 'staff_manage_fixture_missing'; end if;
  insert into auth.users(id,instance_id,aud,role,email,encrypted_password,created_at,updated_at,email_confirmed_at)
    values
    (a,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','manage-a@example.invalid','',now(),now(),now()),
    (b,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','manage-b@example.invalid','',now(),now(),now()),
    (t_a,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','teacher-a-manage@example.invalid','',now(),now(),null),
    (t_b,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','teacher-b-manage@example.invalid','',now(),now(),null),
    (m,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','admin-manage@example.invalid','',now(),now(),null);
  insert into _staff_manage_fixture(actor,admin_a,admin_b,teacher_a,teacher_b,school_admin_invitee,subject_id)
    values(actor,a,b,t_a,t_b,m,physics);
end $$;
grant select,update on _staff_manage_fixture to service_role;
set local role service_role;
do $$
declare f record; result jsonb; v_school_a uuid; v_school_b uuid; a uuid; b uuid; m uuid;
begin
  select * into f from _staff_manage_fixture;
  result:=public.service_bootstrap_school_14b(f.actor,f.admin_a,'QA Manage A',null);
  v_school_a:=(result->>'schoolId')::uuid;
  result:=public.service_bootstrap_school_14b(f.actor,f.admin_b,'QA Manage B',null);
  v_school_b:=(result->>'schoolId')::uuid;
  a:=public.service_register_staff_invite_14b(f.admin_a,f.teacher_a,'teacher-a-manage@example.invalid',
    'teacher',v_school_a,f.subject_id,null,null);
  b:=public.service_register_staff_invite_14b(f.admin_b,f.teacher_b,'teacher-b-manage@example.invalid',
    'teacher',v_school_b,f.subject_id,null,null);
  m:=public.service_register_staff_invite_14b(f.actor,f.school_admin_invitee,'admin-manage@example.invalid',
    'school_admin',null,null,'QA Manage C',null);
  update _staff_manage_fixture set school_a=v_school_a,school_b=v_school_b,
    invite_a=a,invite_b=b,invite_master=m;
end $$;
reset role;
update public.staff_account_provisioning
  set created_at=now()-interval '3 minutes',expires_at=now()+interval '6 days'
  where id in (select invite_a from _staff_manage_fixture
    union all select invite_b from _staff_manage_fixture
    union all select invite_master from _staff_manage_fixture);
do $$
begin
  if has_function_privilege('authenticated','public.service_list_staff_invites_14b(uuid)','execute')
     or has_function_privilege('authenticated','public.service_revoke_staff_invite_14b(uuid,uuid)','execute')
     or has_function_privilege('authenticated','public.service_claim_staff_invite_resend_14b(uuid,uuid)','execute') then
    raise exception 'ordinary_client_rpc_access';
  end if;
end $$;
set local role service_role;
do $$
declare f record;
begin
  select * into f from _staff_manage_fixture;
  if (select count(*) from public.service_list_staff_invites_14b(f.admin_a))<>1
     or (select count(*) from public.service_list_staff_invites_14b(f.admin_b))<>1
     or (select count(*) from public.service_list_staff_invites_14b(f.actor)
       where invitation_id in (f.invite_a,f.invite_b,f.invite_master))<>3
     or (select count(*) from public.service_list_staff_invites_14b(f.teacher_a))<>0 then
    raise exception 'staff_invite_list_scope_failed'; end if;
  -- Each claim changes only the existing invitation and is limited by school,
  -- confirmation state, expiration, count and a 15-minute cooldown.
  if (select count(*) from public.service_claim_staff_invite_resend_14b(f.admin_b,f.invite_a))<>0
     or (select count(*) from public.service_claim_staff_invite_resend_14b(f.admin_a,f.invite_master))<>0 then
    raise exception 'staff_invite_cross_school_resend_allowed'; end if;
  if (select count(*) from public.service_claim_staff_invite_resend_14b(f.admin_a,f.invite_a))<>1 then
    raise exception 'staff_invite_authorized_resend_denied'; end if;
  if (select count(*) from public.service_claim_staff_invite_resend_14b(f.admin_a,f.invite_a))<>0 then
    raise exception 'staff_invite_resend_cooldown_failed'; end if;
  if (select count(*) from public.service_claim_staff_invite_resend_14b(f.actor,f.invite_master))<>1
     or not exists(select 1 from public.academic_identity_events
       where row_id=f.invite_a and operation='RESEND_REQUESTED' and actor_id=f.admin_a)
     or (select resend_attempts from public.staff_account_provisioning where id=f.invite_a)<>1 then
    raise exception 'staff_invite_resend_audit_failed'; end if;
  if public.service_revoke_staff_invite_14b(f.admin_b,f.invite_a)
     or public.service_revoke_staff_invite_14b(f.admin_a,f.invite_master)
     or not public.service_revoke_staff_invite_14b(f.admin_a,f.invite_a)
     or public.service_revoke_staff_invite_14b(f.admin_a,f.invite_a) then
    raise exception 'staff_invite_revoke_scope_failed'; end if;
  if (select count(*) from public.service_claim_staff_invite_resend_14b(f.admin_a,f.invite_a))<>0
     or exists(select 1 from public.service_list_staff_invites_14b(f.admin_a))
     or not exists(select 1 from public.academic_identity_events
       where row_id=f.invite_a and operation='UPDATE' and actor_id=f.admin_a)
     or (select revoked_by from public.staff_account_provisioning where id=f.invite_a) is distinct from f.admin_a then
    raise exception 'staff_invite_revocation_audit_failed'; end if;
  declare denied boolean:=false;
  begin
    begin perform public.service_accept_staff_invite_14b(f.teacher_a,f.invite_a);
    exception when sqlstate 'P0001' then denied:=true; end;
    if not denied then raise exception 'revoked_invite_accepted'; end if;
  end;
  if not public.service_revoke_staff_invite_14b(f.actor,f.invite_master) then
    raise exception 'platform_admin_revoke_failed'; end if;
end $$;
reset role;
update public.staff_account_provisioning
  set resend_attempts=3,last_resend_attempt_at=now()-interval '1 hour'
  where id=(select invite_b from _staff_manage_fixture);
set local role service_role;
do $$
declare f record;
begin
  select * into f from _staff_manage_fixture;
  if (select count(*) from public.service_claim_staff_invite_resend_14b(f.admin_b,f.invite_b))<>0 then
    raise exception 'staff_invite_resend_cap_failed'; end if;
end $$;
rollback;
