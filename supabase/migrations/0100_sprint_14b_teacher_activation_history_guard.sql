-- A teacher invite must not relabel a learner with any historical evidence.
create or replace function public.service_accept_staff_invite_14b(p_recipient uuid,p_request uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
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
      v.issued_by,p_recipient,v.school_name,v.school_code);
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
end $$;
