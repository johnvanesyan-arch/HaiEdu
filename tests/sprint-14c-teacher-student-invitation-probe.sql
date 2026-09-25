begin;

do $$
declare
  v_scope record;
  v_school_admin uuid;
  v_student uuid;
  v_invitation uuid;
  v_admin_denied boolean:=false;
  v_token_digest text:=md5(gen_random_uuid()::text)||md5(clock_timestamp()::text);
begin
  select a.id as assignment_id,a.school_id,a.class_id,m.person_id as teacher_id
    into v_scope
  from public.teacher_assignments a
  join public.institutional_memberships m on m.id=a.teacher_membership_id
  join public.classes c on c.id=a.class_id and c.school_id=a.school_id
  join public.academic_years y on y.id=a.academic_year_id and y.school_id=a.school_id
  where a.status='active' and a.valid_from<=now()
    and (a.valid_to is null or a.valid_to>now())
    and m.role='teacher' and m.status='active' and m.valid_from<=now()
    and (m.valid_to is null or m.valid_to>now())
    and c.is_active and y.status='active'
    and current_date between y.starts_on and y.ends_on
  order by a.valid_from desc limit 1;

  if v_scope.assignment_id is null then
    raise exception 'teacher_invitation_probe_scope_missing';
  end if;

  select m.person_id into v_school_admin
  from public.institutional_memberships m
  where m.school_id=v_scope.school_id and m.role='school_admin'
    and m.status='active' and m.valid_from<=now()
    and (m.valid_to is null or m.valid_to>now())
  limit 1;
  select p.id into v_student from public.profiles p
  where p.role='student' and p.account_status='active'
  order by p.created_at limit 1;
  if v_school_admin is null or v_student is null then
    raise exception 'teacher_invitation_probe_actor_missing';
  end if;

  if not public.service_authorize_student_invite_14c(
    v_scope.teacher_id,v_scope.school_id,v_scope.class_id,v_scope.assignment_id
  ) then raise exception 'assigned_teacher_was_denied'; end if;
  if public.service_authorize_student_invite_14c(
    v_school_admin,v_scope.school_id,v_scope.class_id,v_scope.assignment_id
  ) then raise exception 'school_admin_was_authorized'; end if;

  begin
    perform public.service_issue_institutional_invitation_14b(
      v_school_admin,v_student,v_scope.school_id,'student',v_scope.class_id,
      v_scope.assignment_id,v_token_digest,now()+interval '1 hour'
    );
  exception when sqlstate 'P0001' then
    v_admin_denied:=true;
  end;
  if not v_admin_denied then raise exception 'school_admin_issue_was_not_denied'; end if;

  v_invitation:=public.service_issue_institutional_invitation_14b(
    v_scope.teacher_id,v_student,v_scope.school_id,'student',v_scope.class_id,
    v_scope.assignment_id,v_token_digest,now()+interval '1 hour'
  );
  if v_invitation is null then raise exception 'assigned_teacher_issue_failed'; end if;
  if not public.service_revoke_institutional_invitation_14b(
    v_scope.teacher_id,v_invitation
  ) then raise exception 'assigned_teacher_revoke_failed'; end if;
end;
$$;

rollback;
