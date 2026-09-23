-- Sprint 14B: targeted, single-use institutional invitations. No school is seeded.
create table public.institutional_invitations (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete restrict,
  academic_year_id uuid,
  class_id uuid,
  teacher_assignment_id uuid references public.teacher_assignments(id) on delete restrict,
  recipient_user_id uuid not null references public.profiles(id) on delete restrict,
  invited_role text not null check (invited_role in ('student', 'teacher')),
  token_digest text not null unique check (token_digest ~ '^[0-9a-f]{64}$'),
  issued_by uuid not null references public.profiles(id) on delete restrict,
  expires_at timestamptz not null,
  used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint institutional_invitation_class_scope check (
    (academic_year_id is null and class_id is null and teacher_assignment_id is null) or
    (academic_year_id is not null and class_id is not null and invited_role = 'student')
  ),
  constraint institutional_invitation_class_fk foreign key (class_id, school_id, academic_year_id)
    references public.classes(id, school_id, academic_year_id) on delete restrict,
  constraint institutional_invitation_expiry check (expires_at > created_at and expires_at <= created_at + interval '7 days'),
  constraint institutional_invitation_lifecycle check (used_at is null or revoked_at is null)
);
create index institutional_invitations_recipient_idx
  on public.institutional_invitations(recipient_user_id, expires_at desc);
create index institutional_invitations_school_pending_idx
  on public.institutional_invitations(school_id, expires_at)
  where used_at is null and revoked_at is null;
create index institutional_invitations_issuer_idx on public.institutional_invitations(issued_by);
create index institutional_invitations_class_scope_idx
  on public.institutional_invitations(class_id, school_id, academic_year_id)
  where class_id is not null;
create index institutional_invitations_assignment_idx
  on public.institutional_invitations(teacher_assignment_id)
  where teacher_assignment_id is not null;

create table public.institutional_class_enrollments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  academic_year_id uuid not null,
  class_id uuid not null,
  student_membership_id uuid not null,
  student_id uuid not null references public.profiles(id) on delete restrict,
  invitation_id uuid not null unique references public.institutional_invitations(id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'ended', 'revoked')),
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid not null references public.profiles(id) on delete restrict,
  constraint institutional_enrollment_period check (valid_to is null or valid_to > valid_from),
  constraint institutional_enrollment_class foreign key (class_id, school_id, academic_year_id)
    references public.classes(id, school_id, academic_year_id) on delete restrict,
  constraint institutional_enrollment_membership foreign key (student_membership_id, school_id)
    references public.institutional_memberships(id, school_id) on delete restrict
);
create unique index institutional_enrollment_one_active
  on public.institutional_class_enrollments(class_id, student_id) where status = 'active';
create index institutional_enrollment_student_school_idx
  on public.institutional_class_enrollments(student_id, school_id, status);
create index institutional_enrollment_membership_school_idx
  on public.institutional_class_enrollments(student_membership_id, school_id);
create index institutional_enrollment_class_school_year_idx
  on public.institutional_class_enrollments(class_id, school_id, academic_year_id);
create index institutional_enrollment_created_by_idx
  on public.institutional_class_enrollments(created_by);

create trigger audit_institutional_invitation_14b
after insert or update on public.institutional_invitations
for each row execute function public.audit_academic_identity_14a();
create trigger audit_institutional_enrollment_14b
after insert or update on public.institutional_class_enrollments
for each row execute function public.audit_academic_identity_14a();

alter table public.institutional_invitations enable row level security;
alter table public.institutional_class_enrollments enable row level security;
revoke all on public.institutional_invitations, public.institutional_class_enrollments
  from public, anon, authenticated, service_role;
grant select on public.institutional_invitations, public.institutional_class_enrollments to service_role;

create function public.service_issue_institutional_invitation_14b(
  p_actor uuid, p_recipient uuid, p_school uuid, p_role text,
  p_class uuid, p_assignment uuid, p_token_digest text, p_expires_at timestamptz
) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_class record; v_assignment record; v_recipient record; v_year uuid;
  v_admin boolean; v_teacher boolean; v_id uuid;
begin
  if p_actor is null or p_recipient is null or p_school is null or
     p_token_digest !~ '^[0-9a-f]{64}$' or p_role not in ('student','teacher') or
     p_expires_at <= now() or p_expires_at > now() + interval '7 days' then
    raise exception 'invitation_invalid' using errcode = 'P0001';
  end if;
  select role, account_status into v_recipient from public.profiles where id=p_recipient;
  if not found then raise exception 'invitation_invalid' using errcode='P0001'; end if;
  if v_recipient.role is distinct from p_role or v_recipient.account_status is distinct from 'active' or
     not exists (select 1 from public.profiles where id=p_actor and account_status='active') then
    raise exception 'invitation_invalid' using errcode = 'P0001';
  end if;
  select exists (select 1 from public.institutional_memberships m
    where m.person_id=p_actor and m.school_id=p_school and m.role='school_admin'
      and m.status='active' and m.valid_from<=now() and (m.valid_to is null or m.valid_to>now())) into v_admin;
  if p_class is not null then
    if p_role <> 'student' then raise exception 'invitation_invalid' using errcode='P0001'; end if;
    select id, academic_year_id, is_active into v_class from public.classes
      where id=p_class and school_id=p_school;
    if not found then raise exception 'invitation_invalid' using errcode='P0001'; end if;
    if not v_class.is_active or v_class.academic_year_id is null or
       not exists (select 1 from public.academic_years y
         where y.id=v_class.academic_year_id and y.school_id=p_school and y.status='active'
           and current_date between y.starts_on and y.ends_on) then
      raise exception 'invitation_invalid' using errcode='P0001';
    end if;
    v_year := v_class.academic_year_id;
  elsif p_assignment is not null then
    raise exception 'invitation_invalid' using errcode='P0001';
  end if;
  if p_assignment is not null then
    select a.id, a.school_id, a.class_id, a.academic_year_id into v_assignment
    from public.teacher_assignments a join public.institutional_memberships m
      on m.id=a.teacher_membership_id and m.school_id=a.school_id
    where a.id=p_assignment and a.school_id=p_school and a.class_id=p_class
      and a.academic_year_id=v_year and a.status='active'
      and a.valid_from<=now() and (a.valid_to is null or a.valid_to>now())
      and m.person_id=p_actor and m.role='teacher' and m.status='active'
      and m.valid_from<=now() and (m.valid_to is null or m.valid_to>now());
    v_teacher := found;
  else v_teacher := false;
  end if;
  if not v_admin and not v_teacher then
    raise exception 'invitation_not_authorized' using errcode='P0001';
  end if;
  insert into public.institutional_invitations
    (school_id, academic_year_id, class_id, teacher_assignment_id,
     recipient_user_id, invited_role, token_digest, issued_by, expires_at)
  values (p_school, v_year, p_class, p_assignment,
          p_recipient, p_role, p_token_digest, p_actor, p_expires_at)
  returning id into v_id;
  return v_id;
end $$;

create function public.service_redeem_institutional_invitation_14b(
  p_recipient uuid, p_token_digest text
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_inv record; v_member uuid; v_enrollment uuid; v_issuer_admin boolean; v_issuer_teacher boolean;
begin
  select * into v_inv from public.institutional_invitations
   where token_digest=p_token_digest for update;
  if not found then raise exception 'invitation_unavailable' using errcode='P0001'; end if;
  if v_inv.recipient_user_id <> p_recipient or
     v_inv.expires_at <= now() or v_inv.used_at is not null or v_inv.revoked_at is not null or
     not exists (select 1 from public.profiles where id=p_recipient
       and account_status='active' and role::text=v_inv.invited_role) then
    raise exception 'invitation_unavailable' using errcode='P0001';
  end if;
  select exists (select 1 from public.institutional_memberships m
    where m.person_id=v_inv.issued_by and m.school_id=v_inv.school_id
      and m.role='school_admin' and m.status='active' and m.valid_from<=now()
      and (m.valid_to is null or m.valid_to>now())) into v_issuer_admin;
  select exists (select 1 from public.teacher_assignments a
    join public.institutional_memberships m
      on m.id=a.teacher_membership_id and m.school_id=a.school_id
    where a.id=v_inv.teacher_assignment_id and a.school_id=v_inv.school_id
      and a.class_id=v_inv.class_id and a.status='active'
      and a.valid_from<=now() and (a.valid_to is null or a.valid_to>now())
      and m.person_id=v_inv.issued_by and m.role='teacher' and m.status='active'
      and m.valid_from<=now() and (m.valid_to is null or m.valid_to>now())) into v_issuer_teacher;
  if not v_issuer_admin and not v_issuer_teacher or
     not exists (select 1 from public.profiles where id=v_inv.issued_by and account_status='active') then
    raise exception 'invitation_unavailable' using errcode='P0001';
  end if;
  if v_inv.class_id is not null and not exists (select 1 from public.classes c
    join public.academic_years y on y.id=c.academic_year_id and y.school_id=c.school_id
    where c.id=v_inv.class_id and c.school_id=v_inv.school_id and c.is_active
      and y.id=v_inv.academic_year_id and y.status='active'
      and current_date between y.starts_on and y.ends_on) then
    raise exception 'invitation_unavailable' using errcode='P0001';
  end if;
  select id into v_member from public.institutional_memberships
    where school_id=v_inv.school_id and person_id=p_recipient and role=v_inv.invited_role
      and status='active' and valid_from<=now() and (valid_to is null or valid_to>now())
    order by valid_from desc limit 1;
  if v_member is null then
    insert into public.institutional_memberships
      (school_id,person_id,role,valid_from,status,created_by)
    values (v_inv.school_id,p_recipient,v_inv.invited_role,now(),'active',v_inv.issued_by)
    returning id into v_member;
  end if;
  if v_inv.class_id is not null then
    if exists (select 1 from public.institutional_class_enrollments
       where class_id=v_inv.class_id and student_id=p_recipient and status='active') then
      raise exception 'already_enrolled' using errcode='P0001';
    end if;
    insert into public.institutional_class_enrollments
      (school_id,academic_year_id,class_id,student_membership_id,student_id,invitation_id,created_by)
    values (v_inv.school_id,v_inv.academic_year_id,v_inv.class_id,v_member,p_recipient,v_inv.id,v_inv.issued_by)
    returning id into v_enrollment;
  end if;
  update public.institutional_invitations set used_at=now() where id=v_inv.id;
  return jsonb_build_object('schoolId',v_inv.school_id,'membershipId',v_member,
    'classEnrollmentId',v_enrollment);
end $$;

create function public.service_revoke_institutional_invitation_14b(
  p_actor uuid, p_invitation uuid
) returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare v_inv record;
begin
  select * into v_inv from public.institutional_invitations where id=p_invitation for update;
  if not found or v_inv.used_at is not null or v_inv.revoked_at is not null then return false; end if;
  if p_actor <> v_inv.issued_by and not exists (select 1 from public.institutional_memberships m
    where m.school_id=v_inv.school_id and m.person_id=p_actor and m.role='school_admin'
      and m.status='active' and m.valid_from<=now() and (m.valid_to is null or m.valid_to>now())) then
    return false;
  end if;
  update public.institutional_invitations set revoked_at=now() where id=p_invitation;
  return true;
end $$;

revoke all on function public.service_issue_institutional_invitation_14b(uuid,uuid,uuid,text,uuid,uuid,text,timestamptz) from public, anon, authenticated;
revoke all on function public.service_redeem_institutional_invitation_14b(uuid,text) from public, anon, authenticated;
revoke all on function public.service_revoke_institutional_invitation_14b(uuid,uuid) from public, anon, authenticated;
grant execute on function public.service_issue_institutional_invitation_14b(uuid,uuid,uuid,text,uuid,uuid,text,timestamptz) to service_role;
grant execute on function public.service_redeem_institutional_invitation_14b(uuid,text) to service_role;
grant execute on function public.service_revoke_institutional_invitation_14b(uuid,uuid) to service_role;
