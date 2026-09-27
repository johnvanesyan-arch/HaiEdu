-- Sprint 14B: school-scoped offboarding and final effective administrator guards.
-- No production identities or historical learning evidence are rewritten.
create or replace function private.assert_school_admin_successor_14b(
  p_school uuid, p_excluded_membership uuid default null, p_excluded_person uuid default null
) returns void language plpgsql security definer set search_path='' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('school-admin-closure:'||p_school::text,0));
  if not exists (select 1 from public.institutional_memberships m join public.profiles p on p.id=m.person_id
    where m.school_id=p_school and m.role='school_admin' and m.status='active'
      and m.valid_from<=now() and (m.valid_to is null or m.valid_to>now())
      and p.role::text='school_admin' and p.account_status='active'
      and (p_excluded_membership is null or m.id<>p_excluded_membership)
      and (p_excluded_person is null or m.person_id<>p_excluded_person)) then
    raise exception 'last_active_school_admin_protected' using errcode='P0001';
  end if;
end $$;
revoke all on function private.assert_school_admin_successor_14b(uuid,uuid,uuid) from public,anon,authenticated;

create or replace function private.guard_school_admin_membership_14b()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if old.role='school_admin' and old.status='active' and old.valid_from<=now()
     and (old.valid_to is null or old.valid_to>now())
     and exists(select 1 from public.profiles p where p.id=old.person_id
       and p.role::text='school_admin' and p.account_status='active') then
    if tg_op='UPDATE' and new.school_id=old.school_id and new.person_id=old.person_id
       and new.role='school_admin' and new.status='active' and new.valid_from<=now()
       and (new.valid_to is null or new.valid_to>now()) then return new; end if;
    perform private.assert_school_admin_successor_14b(old.school_id,old.id,null);
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
revoke all on function private.guard_school_admin_membership_14b() from public,anon,authenticated;
create trigger protect_last_school_admin_membership_14b before update or delete on public.institutional_memberships
for each row execute function private.guard_school_admin_membership_14b();

create or replace function private.guard_school_admin_profile_14b()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_school uuid;
begin
  if old.role::text='school_admin' and old.account_status='active' then
    if tg_op='UPDATE' and new.role::text='school_admin' and new.account_status='active' then return new; end if;
    -- Same lock used by membership removal; UUID order is stable for multi-school administrators.
    for v_school in select distinct m.school_id from public.institutional_memberships m
      where m.person_id=old.id and m.role='school_admin' and m.status='active'
        and m.valid_from<=now() and (m.valid_to is null or m.valid_to>now()) order by m.school_id loop
      perform private.assert_school_admin_successor_14b(v_school,null,old.id);
    end loop;
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
revoke all on function private.guard_school_admin_profile_14b() from public,anon,authenticated;
create trigger protect_last_school_admin_profile_14b before update or delete on public.profiles
for each row execute function private.guard_school_admin_profile_14b();

-- Invitation issue/redemption and offboarding use this same lock before row locks.
create or replace function private.lock_teacher_offboarding_14b(p_membership uuid)
returns void language plpgsql security invoker set search_path='' as $$
begin
  if p_membership is not null then
    perform pg_advisory_xact_lock(hashtextextended('teacher-offboarding:'||p_membership::text,0));
  end if;
end $$;
revoke all on function private.lock_teacher_offboarding_14b(uuid) from public,anon,authenticated;

-- Security definer is required because invitation ledgers intentionally grant service_role
-- SELECT only. Every call verifies the acting school administrator against the exact school.
create or replace function public.service_offboard_school_teacher_14b(
  p_actor uuid,p_school uuid,p_membership uuid,p_action text,
  p_reason text default 'administrative',p_expected_revision text default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_member public.institutional_memberships%rowtype;
  v_assignments jsonb; v_subjects jsonb; v_invitations jsonb; v_codes jsonb; v_revision text; v_summary jsonb;
begin
  if p_actor is null or p_school is null or p_membership is null
     or p_action is null or p_action not in ('preview','offboard')
     or p_reason is null or p_reason not in ('withdrawn','transfer','year_end','role_change','administrative')
     or not private.active_school_admin_14b(p_actor,p_school) then
    raise exception 'school_teacher_unavailable' using errcode='P0001';
  end if;
  perform private.lock_teacher_offboarding_14b(p_membership);
  select * into v_member from public.institutional_memberships
    where id=p_membership and school_id=p_school and role='teacher' for update;
  if not found or v_member.person_id=p_actor or v_member.status not in ('active','archived')
     or not private.active_school_admin_14b(p_actor,p_school) then
    raise exception 'school_teacher_unavailable' using errcode='P0001';
  end if;
  -- Locking the membership also serializes assignment/subject creation through existing guards.
  select coalesce(jsonb_agg(a.id order by a.id),'[]'::jsonb) into v_assignments
    from public.teacher_assignments a where a.teacher_membership_id=p_membership
      and a.school_id=p_school and a.status='active';
  select coalesce(jsonb_agg(g.id order by g.id),'[]'::jsonb) into v_subjects
    from public.teacher_subject_authorizations g where g.teacher_membership_id=p_membership
      and g.school_id=p_school and g.status='active';
  select coalesce(jsonb_agg(i.id order by i.id),'[]'::jsonb) into v_invitations
    from public.institutional_invitations i join public.teacher_assignments a on a.id=i.teacher_assignment_id
    where a.teacher_membership_id=p_membership and i.school_id=p_school
      and i.issued_by=v_member.person_id and i.invited_role='student'
      and i.used_at is null and i.revoked_at is null;
  select coalesce(jsonb_agg(c.id order by c.id),'[]'::jsonb) into v_codes
    from public.institutional_join_codes c join public.teacher_assignments a on a.id=c.teacher_assignment_id
    where a.teacher_membership_id=p_membership and c.school_id=p_school
      and c.issued_by=v_member.person_id and c.used_at is null and c.revoked_at is null;
  v_revision:=md5(jsonb_build_array(v_member.id,v_member.status,v_member.valid_from,v_member.valid_to,
    v_assignments,v_subjects,v_invitations,v_codes)::text);
  v_summary:=jsonb_build_object('membershipId',v_member.id,'schoolId',p_school,'revision',v_revision,
    'activeAssignments',jsonb_array_length(v_assignments),'activeSubjectGrants',jsonb_array_length(v_subjects),
    'unusedInvitations',jsonb_array_length(v_invitations),'unusedJoinCodes',jsonb_array_length(v_codes));
  if p_action='preview' then return v_summary; end if;
  if p_expected_revision is distinct from v_revision then
    raise exception 'teacher_offboarding_preview_changed' using errcode='P0001';
  end if;

  update public.institutional_invitations set revoked_at=now()
    where id in (select value::uuid from jsonb_array_elements_text(v_invitations));
  update public.institutional_join_codes set revoked_at=now()
    where id in (select value::uuid from jsonb_array_elements_text(v_codes));
  update public.teacher_assignments set status='ended',
    valid_to=greatest(now(),valid_from+interval '1 microsecond'),ended_by=p_actor,end_reason=p_reason
    where id in (select value::uuid from jsonb_array_elements_text(v_assignments));
  update public.teacher_subject_authorizations set status='revoked',
    valid_to=greatest(now(),valid_from+interval '1 microsecond'),ended_by=p_actor
    where id in (select value::uuid from jsonb_array_elements_text(v_subjects));
  update public.institutional_memberships set status='ended',
    valid_to=greatest(now(),valid_from+interval '1 microsecond'),ended_by=p_actor,end_reason=p_reason
    where id=p_membership;
  insert into public.academic_identity_events(table_name,row_id,operation,old_value,new_value,actor_id)
    values('teacher_offboarding',p_membership,'OFFBOARD',null,v_summary||jsonb_build_object('reason',p_reason),p_actor);
  return v_summary||jsonb_build_object('ended',true);
end $$;
revoke all on function public.service_offboard_school_teacher_14b(uuid,uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.service_offboard_school_teacher_14b(uuid,uuid,uuid,text,text,text) to service_role;

-- Preserve all existing authorization and content checks; serialize with offboarding.
CREATE OR REPLACE FUNCTION public.service_issue_institutional_invitation_14b(p_actor uuid, p_recipient uuid, p_school uuid, p_role text, p_class uuid, p_assignment uuid, p_token_digest text, p_expires_at timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_class record; v_recipient record; v_year uuid;
  v_assignment_id uuid; v_subject_program_id uuid;
  v_admin boolean:=false; v_id uuid;
begin
  perform private.lock_teacher_offboarding_14b((select teacher_membership_id from public.teacher_assignments where id=p_assignment));
  if p_actor is null or p_recipient is null or p_school is null or
     p_token_digest !~ '^[0-9a-f]{64}$' or p_role not in ('student','teacher') or
     p_expires_at<=now() or p_expires_at>now()+interval '7 days' then
    raise exception 'invitation_invalid' using errcode='P0001';
  end if;
  select role,account_status into v_recipient from public.profiles where id=p_recipient;
  if not found or v_recipient.role::text is distinct from p_role
     or v_recipient.account_status is distinct from 'active'
     or not exists(select 1 from public.profiles where id=p_actor and account_status='active') then
    raise exception 'invitation_invalid' using errcode='P0001';
  end if;

  if p_role='student' then
    if p_class is null or p_assignment is null then
      raise exception 'invitation_invalid' using errcode='P0001';
    end if;
    select c.id,c.academic_year_id,c.subject_id,c.grade_id into v_class
    from public.classes c
    join public.academic_years y
      on y.id=c.academic_year_id and y.school_id=c.school_id
    where c.id=p_class and c.school_id=p_school and c.is_active
      and y.status='active' and current_date between y.starts_on and y.ends_on;
    if not found then raise exception 'invitation_invalid' using errcode='P0001'; end if;
    v_year:=v_class.academic_year_id;

    select a.id,a.subject_program_id into v_assignment_id,v_subject_program_id
    from public.teacher_assignments a
    join public.subject_programs sp on sp.id=a.subject_program_id
    join public.institutional_memberships tm
      on tm.id=a.teacher_membership_id and tm.school_id=a.school_id
    join public.profiles p on p.id=tm.person_id
    where a.id=p_assignment and a.school_id=p_school
      and a.academic_year_id=v_year and a.class_id=p_class
      and a.status='active' and a.valid_from<=now()
      and (a.valid_to is null or a.valid_to>now())
      and tm.person_id=p_actor and tm.role='teacher' and tm.status='active'
      and tm.valid_from<=now() and (tm.valid_to is null or tm.valid_to>now())
      and p.role='teacher' and p.account_status='active'
      and sp.subject_id=v_class.subject_id and sp.grade_id=v_class.grade_id
      and sp.status::text='published';
    if not found then
      raise exception 'invitation_not_authorized' using errcode='P0001';
    end if;
  else
    if p_class is not null or p_assignment is not null then
      raise exception 'invitation_invalid' using errcode='P0001';
    end if;
    select private.active_school_admin_14b(p_actor,p_school) into v_admin;
    if not v_admin then
      raise exception 'invitation_not_authorized' using errcode='P0001';
    end if;
  end if;

  insert into public.institutional_invitations
    (school_id,academic_year_id,class_id,teacher_assignment_id,subject_program_id,
     recipient_user_id,invited_role,token_digest,issued_by,expires_at)
  values(p_school,v_year,p_class,v_assignment_id,v_subject_program_id,
     p_recipient,p_role,p_token_digest,p_actor,p_expires_at)
  returning id into v_id;
  return v_id;
end;
$function$;


-- Preserve all existing authorization and content checks; serialize with offboarding.
CREATE OR REPLACE FUNCTION public.service_issue_institutional_join_code_14c(p_actor uuid, p_school uuid, p_class uuid, p_assignment uuid, p_code_digest text, p_expires_at timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_year uuid;
  v_program uuid;
  v_id uuid;
begin
  perform private.lock_teacher_offboarding_14b((select teacher_membership_id from public.teacher_assignments where id=p_assignment));
  if p_actor is null or p_school is null or p_class is null or p_assignment is null
     or p_code_digest !~ '^[0-9a-f]{64}$'
     or p_expires_at<=now() or p_expires_at>now()+interval '7 days' then
    raise exception 'institutional_join_code_invalid' using errcode='P0001';
  end if;

  select c.academic_year_id,a.subject_program_id
    into v_year,v_program
  from public.classes c
  join public.academic_years y
    on y.id=c.academic_year_id and y.school_id=c.school_id
  join public.teacher_assignments a
    on a.id=p_assignment and a.class_id=c.id and a.school_id=c.school_id
   and a.academic_year_id=c.academic_year_id
  join public.subject_programs sp on sp.id=a.subject_program_id
  join public.subjects s on s.id=sp.subject_id
  join public.institutional_memberships tm
    on tm.id=a.teacher_membership_id and tm.school_id=a.school_id
  join public.profiles p on p.id=tm.person_id
  where p.id=p_actor and p.role='teacher' and p.account_status='active'
    and c.id=p_class and c.school_id=p_school and c.is_active
    and y.status='active' and current_date between y.starts_on and y.ends_on
    and a.status='active' and a.valid_from<=now()
    and (a.valid_to is null or a.valid_to>now())
    and tm.role='teacher' and tm.status='active' and tm.valid_from<=now()
    and (tm.valid_to is null or tm.valid_to>now())
    and sp.subject_id=c.subject_id and sp.grade_id=c.grade_id
    and sp.status::text='published' and s.status::text='published';

  if not found then
    raise exception 'institutional_join_code_not_authorized' using errcode='P0001';
  end if;

  insert into public.institutional_join_codes
    (school_id,academic_year_id,class_id,teacher_assignment_id,
     subject_program_id,code_digest,issued_by,expires_at)
  values
    (p_school,v_year,p_class,p_assignment,v_program,
     p_code_digest,p_actor,p_expires_at)
  returning id into v_id;

  return v_id;
end;
$function$;


-- Preserve all existing authorization and content checks; serialize with offboarding.
CREATE OR REPLACE FUNCTION public.service_redeem_institutional_invitation_14b(p_recipient uuid, p_token_digest text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_inv record; v_member uuid; v_enrollment uuid;
  v_issuer_admin boolean; v_issuer_teacher boolean;
begin
  perform private.lock_teacher_offboarding_14b((select a.teacher_membership_id from public.institutional_invitations i join public.teacher_assignments a on a.id=i.teacher_assignment_id where i.token_digest=p_token_digest));
  select * into v_inv from public.institutional_invitations
   where token_digest=p_token_digest for update;
  if not found or v_inv.recipient_user_id<>p_recipient
     or v_inv.expires_at<=now() or v_inv.used_at is not null or v_inv.revoked_at is not null
     or not exists(select 1 from public.profiles where id=p_recipient
       and account_status='active' and role::text=v_inv.invited_role) then
    raise exception 'invitation_unavailable' using errcode='P0001';
  end if;
  select exists(select 1 from public.institutional_memberships m
    join public.profiles p on p.id=m.person_id
    where m.person_id=v_inv.issued_by and m.school_id=v_inv.school_id
      and m.role='school_admin' and m.status='active' and m.valid_from<=now()
      and (m.valid_to is null or m.valid_to>now())
      and p.role='school_admin' and p.account_status='active') into v_issuer_admin;
  select exists(select 1 from public.teacher_assignments a
    join public.institutional_memberships m
      on m.id=a.teacher_membership_id and m.school_id=a.school_id
    join public.profiles p on p.id=m.person_id
    where a.id=v_inv.teacher_assignment_id and a.school_id=v_inv.school_id
      and a.class_id=v_inv.class_id and a.academic_year_id=v_inv.academic_year_id
      and a.subject_program_id=v_inv.subject_program_id
      and a.status='active' and a.valid_from<=now()
      and (a.valid_to is null or a.valid_to>now())
      and m.person_id=v_inv.issued_by and m.role='teacher' and m.status='active'
      and m.valid_from<=now() and (m.valid_to is null or m.valid_to>now())
      and p.role='teacher' and p.account_status='active') into v_issuer_teacher;
  if (v_inv.invited_role='student' and not v_issuer_teacher)
     or (v_inv.invited_role='teacher' and not v_issuer_admin)
     or v_inv.invited_role not in ('student','teacher') then
    raise exception 'invitation_unavailable' using errcode='P0001';
  end if;
  if v_inv.invited_role='student' and not exists(
    select 1 from public.classes c
    join public.academic_years y on y.id=c.academic_year_id and y.school_id=c.school_id
    join public.teacher_assignments a on a.id=v_inv.teacher_assignment_id
      and a.school_id=c.school_id and a.class_id=c.id
      and a.academic_year_id=c.academic_year_id
    join public.subject_programs sp on sp.id=v_inv.subject_program_id
      and sp.id=a.subject_program_id
    where c.id=v_inv.class_id and c.school_id=v_inv.school_id and c.is_active
      and y.id=v_inv.academic_year_id and y.status='active'
      and current_date between y.starts_on and y.ends_on
      and a.status='active' and a.valid_from<=now()
      and (a.valid_to is null or a.valid_to>now())
      and sp.subject_id=c.subject_id and sp.grade_id=c.grade_id
  ) then raise exception 'invitation_unavailable' using errcode='P0001'; end if;
  if v_inv.invited_role='teacher' and
     (v_inv.class_id is not null or v_inv.teacher_assignment_id is not null
      or v_inv.subject_program_id is not null) then
    raise exception 'invitation_unavailable' using errcode='P0001';
  end if;
  select id into v_member from public.institutional_memberships
    where school_id=v_inv.school_id and person_id=p_recipient and role=v_inv.invited_role
      and status='active' and valid_from<=now() and (valid_to is null or valid_to>now())
    order by valid_from desc limit 1;
  if v_member is null then
    insert into public.institutional_memberships
      (school_id,person_id,role,valid_from,status,created_by)
    values(v_inv.school_id,p_recipient,v_inv.invited_role,now(),'active',v_inv.issued_by)
    returning id into v_member;
  end if;
  if v_inv.invited_role='student' then
    if exists(select 1 from public.institutional_class_enrollments
      where class_id=v_inv.class_id and student_id=p_recipient and status='active') then
      raise exception 'already_enrolled' using errcode='P0001';
    end if;
    insert into public.institutional_class_enrollments
      (school_id,academic_year_id,class_id,student_membership_id,student_id,
       invitation_id,teacher_assignment_id,subject_program_id,created_by)
    values(v_inv.school_id,v_inv.academic_year_id,v_inv.class_id,v_member,p_recipient,
       v_inv.id,v_inv.teacher_assignment_id,v_inv.subject_program_id,v_inv.issued_by)
    returning id into v_enrollment;
  end if;
  update public.institutional_invitations set used_at=now() where id=v_inv.id;
  return jsonb_build_object('schoolId',v_inv.school_id,'membershipId',v_member,
    'classEnrollmentId',v_enrollment,'subjectProgramId',v_inv.subject_program_id);
end;
$function$;


-- Preserve all existing authorization and content checks; serialize with offboarding.
CREATE OR REPLACE FUNCTION public.service_accept_student_invitation_14c(p_recipient uuid, p_token_digest text, p_display_name text, p_acceptance_version text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_name text:=regexp_replace(btrim(coalesce(p_display_name,'')),'\s+',' ','g');
  v_invitation uuid; v_result jsonb;
begin
  perform private.lock_teacher_offboarding_14b((select a.teacher_membership_id from public.institutional_invitations i join public.teacher_assignments a on a.id=i.teacher_assignment_id where i.token_digest=p_token_digest));
  if p_recipient is null or p_token_digest !~ '^[0-9a-f]{64}$'
     or length(v_name) not between 2 and 80
     or p_acceptance_version<>'student-school-access-v1' then
    raise exception 'student_invitation_unavailable' using errcode='P0001';
  end if;
  select id into v_invitation from public.institutional_invitations
    where token_digest=p_token_digest and recipient_user_id=p_recipient
      and invited_role='student' for update;
  if v_invitation is null then
    raise exception 'student_invitation_unavailable' using errcode='P0001';
  end if;
  v_result:=public.service_redeem_institutional_invitation_14b(p_recipient,p_token_digest);
  update public.profiles set display_name=v_name,updated_at=now()
    where id=p_recipient and role='student' and account_status='active';
  if not found then raise exception 'student_invitation_unavailable' using errcode='P0001'; end if;
  insert into public.student_account_acceptances
    (student_id,invitation_id,acceptance_version,display_name_at_acceptance)
  values(p_recipient,v_invitation,p_acceptance_version,v_name);
  return v_result||jsonb_build_object('displayName',v_name);
end;
$function$;


-- Preserve all existing authorization and content checks; serialize with offboarding.
CREATE OR REPLACE FUNCTION public.service_redeem_institutional_join_code_14c(p_recipient uuid, p_code_digest text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_code public.institutional_join_codes%rowtype;
  v_invitation_digest text;
  v_invitation_id uuid;
  v_result jsonb;
begin
  perform private.lock_teacher_offboarding_14b((select a.teacher_membership_id from public.institutional_join_codes c join public.teacher_assignments a on a.id=c.teacher_assignment_id where c.code_digest=p_code_digest));
  if p_recipient is null or p_code_digest !~ '^[0-9a-f]{64}$' then
    raise exception 'institutional_join_code_unavailable' using errcode='P0001';
  end if;

  select * into v_code
  from public.institutional_join_codes
  where code_digest=p_code_digest
  for update;

  if not found then
    return null;
  end if;

  if v_code.expires_at<=now() or v_code.used_at is not null
     or v_code.revoked_at is not null
     or not exists(
       select 1 from public.profiles
       where id=p_recipient and role='student' and account_status='active'
     )
     or not exists(
       select 1
       from public.classes c
       join public.academic_years y
         on y.id=c.academic_year_id and y.school_id=c.school_id
       join public.teacher_assignments a
         on a.id=v_code.teacher_assignment_id and a.class_id=c.id
        and a.school_id=c.school_id and a.academic_year_id=c.academic_year_id
        and a.subject_program_id=v_code.subject_program_id
       join public.subject_programs sp on sp.id=a.subject_program_id
       join public.subjects s on s.id=sp.subject_id
       join public.institutional_memberships tm
         on tm.id=a.teacher_membership_id and tm.school_id=a.school_id
       join public.profiles p on p.id=tm.person_id
       where c.id=v_code.class_id and c.school_id=v_code.school_id
         and c.academic_year_id=v_code.academic_year_id and c.is_active
         and y.status='active' and current_date between y.starts_on and y.ends_on
         and a.status='active' and a.valid_from<=now()
         and (a.valid_to is null or a.valid_to>now())
         and tm.person_id=v_code.issued_by and tm.role='teacher'
         and tm.status='active' and tm.valid_from<=now()
         and (tm.valid_to is null or tm.valid_to>now())
         and p.role='teacher' and p.account_status='active'
         and sp.subject_id=c.subject_id and sp.grade_id=c.grade_id
         and sp.status::text='published' and s.status::text='published'
     ) then
    raise exception 'institutional_join_code_unavailable' using errcode='P0001';
  end if;

  if exists(
    select 1 from public.institutional_class_enrollments e
    where e.class_id=v_code.class_id and e.student_id=p_recipient
      and e.status='active' and e.valid_from<=now()
      and (e.valid_to is null or e.valid_to>now())
  ) then
    update public.institutional_join_codes
    set used_by=p_recipient,used_at=now()
    where id=v_code.id;
    return jsonb_build_object(
      'schoolId',v_code.school_id,
      'classId',v_code.class_id,
      'subjectProgramId',v_code.subject_program_id,
      'joinCodeId',v_code.id,
      'alreadyEnrolled',true
    );
  end if;

  v_invitation_digest:=encode(extensions.digest(
    convert_to('institutional-code:'||v_code.id::text||':'||p_recipient::text,'UTF8'),
    'sha256'
  ),'hex');

  begin
    v_invitation_id:=public.service_issue_institutional_invitation_14b(
      v_code.issued_by,p_recipient,v_code.school_id,'student',
      v_code.class_id,v_code.teacher_assignment_id,
      v_invitation_digest,v_code.expires_at
    );
    v_result:=public.service_redeem_institutional_invitation_14b(
      p_recipient,v_invitation_digest
    );
  exception when raise_exception then
    if sqlerrm<>'already_enrolled' then
      raise;
    end if;
    v_result:=jsonb_build_object(
      'schoolId',v_code.school_id,
      'classId',v_code.class_id,
      'subjectProgramId',v_code.subject_program_id,
      'alreadyEnrolled',true
    );
  end;

  update public.institutional_join_codes
  set used_by=p_recipient,used_at=now()
  where id=v_code.id;

  return coalesce(v_result,'{}'::jsonb)||jsonb_build_object(
    'classId',v_code.class_id,
    'joinCodeId',v_code.id,
    'invitationId',v_invitation_id,
    'alreadyEnrolled',coalesce((v_result->>'alreadyEnrolled')::boolean,false)
  );
end;
$function$;


-- Existing membership termination now uses the same complete teacher offboarding transaction.
CREATE OR REPLACE FUNCTION public.service_end_institutional_membership_14b(p_actor uuid, p_membership uuid, p_reason text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_row record; v_preview jsonb;
begin
  if p_reason is null or p_reason not in ('withdrawn','transfer','year_end','role_change','administrative')
    then return false; end if;
  perform private.lock_teacher_offboarding_14b(p_membership);
  select * into v_row from public.institutional_memberships where id=p_membership for update;
  if not found or (v_row.status <> 'active' and not (v_row.role='teacher' and v_row.status='archived')) or v_row.person_id=p_actor or
     not private.active_school_admin_14b(p_actor,v_row.school_id)
    then return false; end if;
  if v_row.role='teacher' then
    v_preview:=public.service_offboard_school_teacher_14b(p_actor,v_row.school_id,p_membership,'preview',p_reason,null);
    perform public.service_offboard_school_teacher_14b(p_actor,v_row.school_id,p_membership,'offboard',p_reason,v_preview->>'revision');
    return true;
  end if;
  update public.institutional_class_enrollments
    set status='ended', valid_to=greatest(now(),valid_from+interval '1 microsecond'),
        ended_by=p_actor,end_reason=p_reason
    where student_membership_id=p_membership and status='active';
  update public.teacher_assignments
    set status='ended', valid_to=greatest(now(),valid_from+interval '1 microsecond'),
        ended_by=p_actor,end_reason=p_reason
    where teacher_membership_id=p_membership and status='active';
  update public.institutional_memberships
    set status='ended',valid_to=greatest(now(),valid_from+interval '1 microsecond'),
        ended_by=p_actor,end_reason=p_reason where id=p_membership;
  return true;
end $function$;
