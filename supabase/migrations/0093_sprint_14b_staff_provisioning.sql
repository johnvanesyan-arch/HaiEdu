-- An emailed Auth invitation conveys account ownership only. Institutional
-- authority is created later, after confirmed sign-in and database revalidation.
create table public.staff_account_provisioning (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete restrict,
  issued_by uuid not null references public.profiles(id) on delete restrict,
  kind text not null check(kind in ('school_admin','teacher')),
  school_id uuid references public.schools(id) on delete restrict,
  school_name text,
  school_code text,
  subject_id uuid references public.subjects(id) on delete restrict,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  constraint staff_provisioning_scope check(
    (kind='school_admin' and school_id is null and subject_id is null
      and school_name is not null and school_code is not null) or
    (kind='teacher' and school_id is not null and subject_id is not null
      and school_name is null and school_code is null)),
  constraint staff_provisioning_expiry check(
    expires_at>created_at and expires_at<=created_at+interval '7 days'),
  constraint staff_provisioning_lifecycle check(accepted_at is null or revoked_at is null)
);
create unique index staff_provisioning_one_pending_per_recipient
 on public.staff_account_provisioning(recipient_id)
 where accepted_at is null and revoked_at is null;
create index staff_provisioning_issuer_idx on public.staff_account_provisioning(issued_by);
create index staff_provisioning_school_idx on public.staff_account_provisioning(school_id)
 where school_id is not null;
create index staff_provisioning_subject_idx on public.staff_account_provisioning(subject_id)
 where subject_id is not null;
create trigger audit_staff_provisioning_14b after insert or update
 on public.staff_account_provisioning for each row
 execute function public.audit_academic_identity_14a();
alter table public.staff_account_provisioning enable row level security;
revoke all on public.staff_account_provisioning from public,anon,authenticated,service_role;
grant select on public.staff_account_provisioning to service_role;

create table public.teacher_subject_authorizations (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  teacher_membership_id uuid not null,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  status text not null default 'active' check(status in ('active','revoked')),
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  ended_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint teacher_subject_period check(valid_to is null or valid_to>valid_from),
  constraint teacher_subject_membership foreign key(teacher_membership_id,school_id)
    references public.institutional_memberships(id,school_id) on delete restrict
);
create unique index teacher_subject_one_active
 on public.teacher_subject_authorizations(teacher_membership_id,subject_id)
 where status='active';
create index teacher_subject_school_idx on public.teacher_subject_authorizations(school_id,status);
create index teacher_subject_subject_idx on public.teacher_subject_authorizations(subject_id);
create index teacher_subject_created_by_idx on public.teacher_subject_authorizations(created_by);
create index teacher_subject_ended_by_idx on public.teacher_subject_authorizations(ended_by)
 where ended_by is not null;
create trigger audit_teacher_subject_14b after insert or update
 on public.teacher_subject_authorizations for each row
 execute function public.audit_academic_identity_14a();
alter table public.teacher_subject_authorizations enable row level security;
revoke all on public.teacher_subject_authorizations from public,anon,authenticated,service_role;
grant select on public.teacher_subject_authorizations to service_role;

create function private.active_school_admin_14b(p_actor uuid,p_school uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select exists(select 1 from public.institutional_memberships m
    join public.profiles p on p.id=m.person_id
    where m.school_id=p_school and m.person_id=p_actor and m.role='school_admin'
      and m.status='active' and m.valid_from<=now()
      and (m.valid_to is null or m.valid_to>now())
      and p.role='school_admin' and p.account_status='active');
$$;
revoke all on function private.active_school_admin_14b(uuid,uuid) from public,anon,authenticated;

create function public.service_authorize_staff_invite_14b(
  p_actor uuid,p_kind text,p_school uuid,p_subject uuid
) returns boolean language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
  if p_kind='school_admin' then
    return p_school is null and p_subject is null and exists(
      select 1 from public.profiles where id=p_actor and role='admin' and account_status='active');
  elsif p_kind='teacher' then
    return p_school is not null and p_subject is not null
      and private.active_school_admin_14b(p_actor,p_school)
      and exists(select 1 from public.subjects where id=p_subject and status::text='published');
  end if;
  return false;
end $$;

create function public.service_register_staff_invite_14b(
  p_actor uuid,p_recipient uuid,p_email text,p_kind text,p_school uuid,
  p_subject uuid,p_school_name text,p_school_code text
) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid; v_role text;
begin
  if not public.service_authorize_staff_invite_14b(p_actor,p_kind,p_school,p_subject)
    or p_recipient is null or p_email is null or length(btrim(p_email))<3 then
    raise exception 'staff_invite_unavailable' using errcode='P0001'; end if;
  if p_kind='school_admin' and (p_school_name is null or length(btrim(p_school_name))<3
      or length(btrim(p_school_name))>160 or p_school_code is null
      or p_school_code !~ '^[A-Z0-9][A-Z0-9-]{2,31}$') then
    raise exception 'staff_invite_unavailable' using errcode='P0001'; end if;
  if p_kind='teacher' and (p_school_name is not null or p_school_code is not null) then
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
    case when p_kind='school_admin' then p_school_code end,now()+interval '7 days')
  returning id into v_id;
  return v_id;
end $$;

create function public.service_accept_staff_invite_14b(p_recipient uuid,p_request uuid)
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
       or exists(select 1 from public.class_memberships where student_id=p_recipient)
       or exists(select 1 from public.institutional_memberships where person_id=p_recipient)
       or exists(select 1 from public.student_skill_mastery where student_id=p_recipient) then
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

revoke all on function public.service_authorize_staff_invite_14b(uuid,text,uuid,uuid),
 public.service_register_staff_invite_14b(uuid,uuid,text,text,uuid,uuid,text,text),
 public.service_accept_staff_invite_14b(uuid,uuid) from public,anon,authenticated;
grant execute on function public.service_authorize_staff_invite_14b(uuid,text,uuid,uuid),
 public.service_register_staff_invite_14b(uuid,uuid,text,text,uuid,uuid,text,text),
 public.service_accept_staff_invite_14b(uuid,uuid) to service_role;
