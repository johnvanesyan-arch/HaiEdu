-- Restore optional, one-use student join codes for institutional classrooms.
-- Email invitations remain the primary recipient-bound path. Codes are a
-- separate fallback for students who already have an account.

create table if not exists public.institutional_join_codes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete restrict,
  academic_year_id uuid not null,
  class_id uuid not null,
  teacher_assignment_id uuid not null references public.teacher_assignments(id) on delete restrict,
  subject_program_id uuid not null references public.subject_programs(id) on delete restrict,
  code_digest text not null unique
    check (code_digest ~ '^[0-9a-f]{64}$'),
  issued_by uuid not null references public.profiles(id) on delete restrict,
  expires_at timestamptz not null,
  used_by uuid references public.profiles(id) on delete restrict,
  used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint institutional_join_code_class_scope
    foreign key (class_id,school_id,academic_year_id)
    references public.classes(id,school_id,academic_year_id) on delete restrict,
  constraint institutional_join_code_expiry
    check (expires_at>created_at and expires_at<=created_at+interval '7 days'),
  constraint institutional_join_code_use_identity
    check ((used_at is null and used_by is null)
      or (used_at is not null and used_by is not null)),
  constraint institutional_join_code_lifecycle
    check (used_at is null or revoked_at is null)
);

create index if not exists institutional_join_codes_pending_scope_idx
  on public.institutional_join_codes
  (issued_by,school_id,class_id,teacher_assignment_id,created_at desc)
  where used_at is null and revoked_at is null;
create index if not exists institutional_join_codes_class_scope_idx
  on public.institutional_join_codes(class_id,school_id,academic_year_id);
create index if not exists institutional_join_codes_school_idx
  on public.institutional_join_codes(school_id);
create index if not exists institutional_join_codes_assignment_idx
  on public.institutional_join_codes(teacher_assignment_id);
create index if not exists institutional_join_codes_program_idx
  on public.institutional_join_codes(subject_program_id);
create index if not exists institutional_join_codes_used_by_idx
  on public.institutional_join_codes(used_by)
  where used_by is not null;

alter table public.institutional_join_codes enable row level security;
revoke all on table public.institutional_join_codes from public,anon,authenticated;
grant select,insert,update on table public.institutional_join_codes to service_role;

create or replace function public.service_issue_institutional_join_code_14c(
  p_actor uuid,p_school uuid,p_class uuid,p_assignment uuid,
  p_code_digest text,p_expires_at timestamptz
) returns uuid
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_year uuid;
  v_program uuid;
  v_id uuid;
begin
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
$$;

create or replace function public.service_revoke_institutional_join_code_14c(
  p_actor uuid,p_code uuid
) returns boolean
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_code public.institutional_join_codes%rowtype;
begin
  select * into v_code
  from public.institutional_join_codes
  where id=p_code
  for update;

  if not found or v_code.used_at is not null or v_code.revoked_at is not null then
    return false;
  end if;

  if p_actor<>v_code.issued_by and not exists(
    select 1
    from public.institutional_memberships m
    join public.profiles p on p.id=m.person_id
    where m.school_id=v_code.school_id and m.person_id=p_actor
      and m.role='school_admin' and m.status='active'
      and m.valid_from<=now() and (m.valid_to is null or m.valid_to>now())
      and p.role='school_admin' and p.account_status='active'
  ) then
    return false;
  end if;

  update public.institutional_join_codes
  set revoked_at=now()
  where id=v_code.id;

  return true;
end;
$$;

create or replace function public.service_redeem_institutional_join_code_14c(
  p_recipient uuid,p_code_digest text
) returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_code public.institutional_join_codes%rowtype;
  v_invitation_digest text;
  v_invitation_id uuid;
  v_result jsonb;
begin
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
$$;

revoke all on function public.service_issue_institutional_join_code_14c(
  uuid,uuid,uuid,uuid,text,timestamptz
) from public,anon,authenticated,service_role;
revoke all on function public.service_revoke_institutional_join_code_14c(
  uuid,uuid
) from public,anon,authenticated,service_role;
revoke all on function public.service_redeem_institutional_join_code_14c(
  uuid,text
) from public,anon,authenticated,service_role;

grant execute on function public.service_issue_institutional_join_code_14c(
  uuid,uuid,uuid,uuid,text,timestamptz
) to service_role;
grant execute on function public.service_revoke_institutional_join_code_14c(
  uuid,uuid
) to service_role;
grant execute on function public.service_redeem_institutional_join_code_14c(
  uuid,text
) to service_role;
