-- Sprint 14C correction: only the actively assigned teacher may issue a
-- student invitation for the exact school/year/class/programme assignment.
-- School administrators retain roster visibility and teacher provisioning,
-- but are not student-invitation actors.

revoke all on function public.service_authorize_student_invite_14c(uuid,uuid,uuid)
  from public,anon,authenticated,service_role;
drop function public.service_authorize_student_invite_14c(uuid,uuid,uuid);

create function public.service_authorize_student_invite_14c(
  p_actor uuid,p_school uuid,p_class uuid,p_assignment uuid
) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select exists(
    select 1
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
      and sp.status::text='published' and s.status::text='published'
  );
$$;

create or replace function public.service_list_student_onboarding_classes_14c(
  p_actor uuid,p_school uuid
) returns table(
  class_id uuid,class_name text,academic_year_id uuid,academic_year_label text,
  teacher_assignment_id uuid,subject_program_id uuid,subject_name text,grade_number integer
) language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
  if not exists(
    select 1 from public.profiles p
    join public.institutional_memberships tm on tm.person_id=p.id
    where p.id=p_actor and p.role='teacher' and p.account_status='active'
      and tm.school_id=p_school and tm.role='teacher' and tm.status='active'
      and tm.valid_from<=now() and (tm.valid_to is null or tm.valid_to>now())
  ) then
    raise exception 'student_onboarding_unavailable' using errcode='P0001';
  end if;
  return query
  select c.id,c.name,y.id,y.label,a.id,sp.id,
         coalesce(s.name_hy,s.name_en,s.code),g.grade_number::integer
  from public.classes c
  join public.academic_years y
    on y.id=c.academic_year_id and y.school_id=c.school_id
  join public.teacher_assignments a
    on a.class_id=c.id and a.school_id=c.school_id
   and a.academic_year_id=c.academic_year_id
  join public.subject_programs sp on sp.id=a.subject_program_id
  join public.subjects s on s.id=sp.subject_id
  join public.grades g on g.id=sp.grade_id
  join public.institutional_memberships tm
    on tm.id=a.teacher_membership_id and tm.school_id=a.school_id
  where c.school_id=p_school and c.is_active
    and tm.person_id=p_actor
    and y.status='active' and current_date between y.starts_on and y.ends_on
    and a.status='active' and a.valid_from<=now()
    and (a.valid_to is null or a.valid_to>now())
    and tm.role='teacher' and tm.status='active' and tm.valid_from<=now()
    and (tm.valid_to is null or tm.valid_to>now())
    and sp.subject_id=c.subject_id and sp.grade_id=c.grade_id
    and sp.status::text='published' and s.status::text='published'
  order by g.grade_number,s.name_hy,c.name,a.valid_from desc;
end;
$$;

create or replace function public.service_issue_institutional_invitation_14b(
  p_actor uuid, p_recipient uuid, p_school uuid, p_role text,
  p_class uuid, p_assignment uuid, p_token_digest text, p_expires_at timestamptz
) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_class record; v_recipient record; v_year uuid;
  v_assignment_id uuid; v_subject_program_id uuid;
  v_admin boolean:=false; v_id uuid;
begin
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
$$;

create or replace function public.service_redeem_institutional_invitation_14b(
  p_recipient uuid,p_token_digest text
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_inv record; v_member uuid; v_enrollment uuid;
  v_issuer_admin boolean; v_issuer_teacher boolean;
begin
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
$$;

revoke all on function public.service_authorize_student_invite_14c(uuid,uuid,uuid,uuid),
  public.service_list_student_onboarding_classes_14c(uuid,uuid),
  public.service_issue_institutional_invitation_14b(uuid,uuid,uuid,text,uuid,uuid,text,timestamptz),
  public.service_redeem_institutional_invitation_14b(uuid,text)
  from public,anon,authenticated;
grant execute on function public.service_authorize_student_invite_14c(uuid,uuid,uuid,uuid),
  public.service_list_student_onboarding_classes_14c(uuid,uuid),
  public.service_issue_institutional_invitation_14b(uuid,uuid,uuid,text,uuid,uuid,text,timestamptz),
  public.service_redeem_institutional_invitation_14b(uuid,text)
  to service_role;
