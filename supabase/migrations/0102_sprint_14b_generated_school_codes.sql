-- Generate a school identifier when the first admin accepts.
-- Older pending invitations, if present, receive a fresh code on acceptance.
alter table public.staff_account_provisioning
  drop constraint staff_provisioning_scope;
alter table public.staff_account_provisioning
  add constraint staff_provisioning_scope check (
    (kind='school_admin' and school_id is null and subject_id is null
      and school_name is not null) or
    (kind='teacher' and school_id is not null and subject_id is not null
      and school_name is null and school_code is null));

CREATE OR REPLACE FUNCTION public.service_bootstrap_school_14b(p_actor uuid, p_first_admin uuid, p_name text, p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_target record; v_school uuid; v_membership uuid; v_code text;
  v_attempt integer; v_constraint text;
begin
  if p_actor is null or p_first_admin is null or p_actor=p_first_admin
     or p_name is null or length(btrim(p_name))<3 or length(btrim(p_name))>160
     or p_code is not null
     or not exists(select 1 from public.profiles where id=p_actor
       and role='admin' and account_status='active') then
    raise exception 'school_bootstrap_unavailable' using errcode='P0001';
  end if;
  select p.id,p.role::text as role,p.account_status,u.email_confirmed_at
    into v_target from public.profiles p join auth.users u on u.id=p.id
    where p.id=p_first_admin for update of p;
  if not found or v_target.account_status is distinct from 'active'
     or v_target.email_confirmed_at is null
     or v_target.role not in ('student','school_admin') then
    raise exception 'school_bootstrap_unavailable' using errcode='P0001';
  end if;
  -- Converting a new account must not relabel a learner's historical identity.
  if v_target.role='student' then
    if exists(select 1 from public.learning_sessions where student_id=p_first_admin)
       or exists(select 1 from public.attempts where student_id=p_first_admin)
       or exists(select 1 from public.chapter_mastery_states where student_id=p_first_admin)
       or exists(select 1 from public.student_skill_mastery where student_id=p_first_admin)
       or exists(select 1 from public.student_skill_mastery_by_release where student_id=p_first_admin)
       or exists(select 1 from public.student_item_exposure_events where student_id=p_first_admin)
       or exists(select 1 from public.remediation_events where student_id=p_first_admin)
       or exists(select 1 from public.recommendation_events where student_id=p_first_admin)
       or exists(select 1 from public.pilot_participants where student_id=p_first_admin)
       or exists(select 1 from public.institutional_class_enrollments where student_id=p_first_admin)
       or exists(select 1 from private.learning_session_item_option_orders where student_id=p_first_admin)
       or exists(select 1 from public.class_memberships where student_id=p_first_admin)
       or exists(select 1 from public.institutional_memberships where person_id=p_first_admin)
       or exists(select 1 from public.institutional_invitations where recipient_user_id=p_first_admin)
    then raise exception 'school_bootstrap_unavailable' using errcode='P0001'; end if;
    update public.profiles set role='school_admin',updated_at=now() where id=p_first_admin;
  end if;
  -- A school code is an identifier, not an access credential.
  for v_attempt in 1..8 loop
    v_code := 'SCH-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,16));
    begin
      insert into public.schools(name,school_code,created_by)
        values(btrim(p_name),v_code,p_actor) returning id into v_school;
      exit;
    exception when unique_violation then
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint <> 'schools_school_code_unique' then raise; end if;
    end;
  end loop;
  if v_school is null then
    raise exception 'school_code_generation_failed' using errcode='P0001';
  end if;
  if v_target.role='student' then
    insert into public.academic_identity_events
      (table_name,row_id,operation,old_value,new_value,actor_id)
    values('profiles',p_first_admin,'SCHOOL_ADMIN_BOOTSTRAP_ROLE',
      jsonb_build_object('role','student'),
      jsonb_build_object('role','school_admin','school_id',v_school),p_actor);
  end if;
  insert into public.institutional_memberships
    (school_id,person_id,role,valid_from,status,created_by)
    values(v_school,p_first_admin,'school_admin',now(),'active',p_actor)
    returning id into v_membership;
  return jsonb_build_object('schoolId',v_school,'membershipId',v_membership,'schoolCode',v_code);
end $function$;


CREATE OR REPLACE FUNCTION public.service_register_staff_invite_14b(p_actor uuid, p_recipient uuid, p_email text, p_kind text, p_school uuid, p_subject uuid, p_school_name text, p_school_code text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_id uuid; v_role text;
begin
  if not public.service_authorize_staff_invite_14b(p_actor,p_kind,p_school,p_subject)
    or p_recipient is null or p_email is null or length(btrim(p_email))<3 then
    raise exception 'staff_invite_unavailable' using errcode='P0001'; end if;
  if p_kind='school_admin' and (p_school_name is null or length(btrim(p_school_name))<3
      or length(btrim(p_school_name))>160) then
    raise exception 'staff_invite_unavailable' using errcode='P0001'; end if;
  if p_school_code is not null or (p_kind='teacher' and p_school_name is not null) then
    raise exception 'staff_invite_unavailable' using errcode='P0001'; end if;
  select p.role::text into v_role from public.profiles p join auth.users u on u.id=p.id
   where p.id=p_recipient and p.account_status='active'
     and lower(u.email)=lower(btrim(p_email)) and u.created_at>now()-interval '1 hour'
   for update of p;
  if v_role is distinct from 'student' or
    exists(select 1 from public.learning_sessions where student_id=p_recipient) or
    exists(select 1 from public.class_memberships where student_id=p_recipient) or
    exists(select 1 from public.institutional_memberships where person_id=p_recipient) then
    raise exception 'staff_invite_unavailable' using errcode='P0001'; end if;
  update public.staff_account_provisioning set revoked_at=now()
    where recipient_id=p_recipient and accepted_at is null and revoked_at is null
      and expires_at<=now();
  insert into public.staff_account_provisioning
    (recipient_id,issued_by,kind,school_id,subject_id,school_name,school_code,expires_at)
  values(p_recipient,p_actor,p_kind,p_school,p_subject,
    case when p_kind='school_admin' then btrim(p_school_name) end,
    null,now()+interval '7 days')
  returning id into v_id;
  return v_id;
end $function$;


CREATE OR REPLACE FUNCTION public.service_accept_staff_invite_14b(p_recipient uuid, p_request uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v record; v_result jsonb; v_membership uuid;
begin
  select * into v from public.staff_account_provisioning where id=p_request for update;
  if not found or v.recipient_id is distinct from p_recipient
    or v.accepted_at is not null or v.revoked_at is not null or v.expires_at<=now()
    or not exists(select 1 from public.profiles p join auth.users u on u.id=p.id
      where p.id=p_recipient and p.role='student' and p.account_status='active'
        and u.email_confirmed_at is not null) then
    raise exception 'staff_invite_unavailable' using errcode='P0001'; end if;
  if v.kind='school_admin' then
    v_result:=public.service_bootstrap_school_14b(
      v.issued_by,p_recipient,v.school_name,null);
  else
    if not private.active_school_admin_14b(v.issued_by,v.school_id)
       or not exists(select 1 from public.subjects
         where id=v.subject_id and status::text='published')
       or exists(select 1 from public.learning_sessions where student_id=p_recipient)
       or exists(select 1 from public.attempts where student_id=p_recipient)
       or exists(select 1 from public.chapter_mastery_states where student_id=p_recipient)
       or exists(select 1 from public.student_skill_mastery where student_id=p_recipient)
       or exists(select 1 from public.student_skill_mastery_by_release where student_id=p_recipient)
       or exists(select 1 from public.student_item_exposure_events where student_id=p_recipient)
       or exists(select 1 from public.remediation_events where student_id=p_recipient)
       or exists(select 1 from public.recommendation_events where student_id=p_recipient)
       or exists(select 1 from public.pilot_participants where student_id=p_recipient)
       or exists(select 1 from public.institutional_class_enrollments where student_id=p_recipient)
       or exists(select 1 from private.learning_session_item_option_orders where student_id=p_recipient)
       or exists(select 1 from public.class_memberships where student_id=p_recipient)
       or exists(select 1 from public.institutional_memberships where person_id=p_recipient)
       or exists(select 1 from public.institutional_invitations where recipient_user_id=p_recipient) then
      raise exception 'staff_invite_unavailable' using errcode='P0001'; end if;
    update public.profiles set role='teacher',updated_at=now() where id=p_recipient;
    insert into public.institutional_memberships
      (school_id,person_id,role,valid_from,status,created_by)
    values(v.school_id,p_recipient,'teacher',now(),'active',v.issued_by)
    returning id into v_membership;
    insert into public.teacher_subject_authorizations
      (school_id,teacher_membership_id,subject_id,created_by)
    values(v.school_id,v_membership,v.subject_id,v.issued_by);
    insert into public.academic_identity_events
      (table_name,row_id,operation,old_value,new_value,actor_id)
    values('profiles',p_recipient,'TEACHER_ACCOUNT_ACTIVATION',
      jsonb_build_object('role','student'),
      jsonb_build_object('role','teacher','school_id',v.school_id,'subject_id',v.subject_id),v.issued_by);
    v_result:=jsonb_build_object('schoolId',v.school_id,'membershipId',v_membership);
  end if;
  update public.staff_account_provisioning set accepted_at=now() where id=p_request;
  return v_result;
end $function$;

