-- Sprint 10: Security, Privacy & Administration
-- Adds account status, privacy preferences, deletion requests, audit logging,
-- and service-role-only student data erasure support.

alter table public.profiles
  add column if not exists account_status text not null default 'active',
  add column if not exists status_changed_at timestamptz not null default now();

alter table public.profiles drop constraint if exists profiles_account_status_check;
alter table public.profiles add constraint profiles_account_status_check
  check (account_status in ('active','suspended','deletion_pending'));

create index if not exists profiles_role_status_idx
  on public.profiles(role, account_status);

create table if not exists public.privacy_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  product_analytics_opt_in boolean not null default false,
  research_use_opt_in boolean not null default false,
  policy_version text not null default 'pilot-v1',
  updated_at timestamptz not null default now()
);

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  auth_user_id uuid,
  requester_user_id uuid references public.profiles(id) on delete set null,
  status text not null default 'pending',
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null,
  resolution_code text,
  constraint account_deletion_requests_status_check
    check (status in ('pending','processing','completed','rejected','cancelled'))
);

create unique index if not exists one_open_deletion_request_per_user
  on public.account_deletion_requests(user_id)
  where user_id is not null and status in ('pending','processing');
create index if not exists deletion_requests_status_requested_idx
  on public.account_deletion_requests(status, requested_at desc);

create table if not exists public.security_audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid references public.profiles(id) on delete set null,
  actor_role text,
  action text not null,
  outcome text not null default 'success',
  target_user_id uuid references public.profiles(id) on delete set null,
  target_type text,
  target_key text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint security_audit_outcome_check check (outcome in ('success','denied','failed'))
);

create index if not exists security_audit_created_idx on public.security_audit_log(created_at desc);
create index if not exists security_audit_actor_idx on public.security_audit_log(actor_user_id, created_at desc);
create index if not exists security_audit_target_idx on public.security_audit_log(target_user_id, created_at desc);

alter table public.privacy_preferences enable row level security;
alter table public.account_deletion_requests enable row level security;
alter table public.security_audit_log enable row level security;

create or replace function private.current_user_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select account_status = 'active' from public.profiles where id = auth.uid()), false);
$$;

grant execute on function private.current_user_active() to authenticated, service_role;
revoke all on function private.current_user_active() from public, anon;

drop policy if exists privacy_preferences_owner_read on public.privacy_preferences;
create policy privacy_preferences_owner_read on public.privacy_preferences
for select to authenticated
using (user_id = auth.uid() or private.current_user_role() = 'admin'::user_role);

drop policy if exists privacy_preferences_owner_insert on public.privacy_preferences;
create policy privacy_preferences_owner_insert on public.privacy_preferences
for insert to authenticated
with check (user_id = auth.uid() and private.current_user_active());

drop policy if exists privacy_preferences_owner_update on public.privacy_preferences;
create policy privacy_preferences_owner_update on public.privacy_preferences
for update to authenticated
using (user_id = auth.uid() and private.current_user_active())
with check (user_id = auth.uid() and private.current_user_active());

drop policy if exists deletion_requests_owner_read on public.account_deletion_requests;
create policy deletion_requests_owner_read on public.account_deletion_requests
for select to authenticated
using (
  user_id = auth.uid()
  or requester_user_id = auth.uid()
  or private.current_user_role() = 'admin'::user_role
);

drop policy if exists security_audit_admin_read on public.security_audit_log;
create policy security_audit_admin_read on public.security_audit_log
for select to authenticated
using (private.current_user_role() = 'admin'::user_role and private.current_user_active());

drop policy if exists profiles_select_self_or_teacher on public.profiles;
create policy profiles_select_self_or_teacher on public.profiles
for select to authenticated
using (
  private.current_user_active()
  and (
    id = auth.uid()
    or private.is_teacher_of_student(id)
    or private.current_user_role() in ('admin'::user_role, 'content_admin'::user_role)
  )
);

drop policy if exists classes_teacher_or_member_read on public.classes;
create policy classes_teacher_or_member_read on public.classes
for select to authenticated
using (
  private.current_user_active()
  and (
    teacher_id = auth.uid()
    or private.is_class_member(id)
    or private.current_user_role() = 'admin'::user_role
  )
);

drop policy if exists memberships_teacher_or_self_read on public.class_memberships;
create policy memberships_teacher_or_self_read on public.class_memberships
for select to authenticated
using (
  private.current_user_active()
  and (
    student_id = auth.uid()
    or private.is_class_teacher(class_id)
    or private.current_user_role() = 'admin'::user_role
  )
);

drop policy if exists attempts_student_or_teacher_read on public.attempts;
create policy attempts_student_or_teacher_read on public.attempts
for select to authenticated
using (
  private.current_user_active()
  and (
    student_id = auth.uid()
    or private.is_teacher_of_student(student_id)
    or private.current_user_role() = 'admin'::user_role
  )
);

drop policy if exists mastery_student_or_teacher_read on public.student_skill_mastery;
create policy mastery_student_or_teacher_read on public.student_skill_mastery
for select to authenticated
using (
  private.current_user_active()
  and (
    student_id = auth.uid()
    or private.is_teacher_of_student(student_id)
    or private.current_user_role() = 'admin'::user_role
  )
);

drop policy if exists learning_sessions_student_or_teacher_read on public.learning_sessions;
create policy learning_sessions_student_or_teacher_read on public.learning_sessions
for select to authenticated
using (
  private.current_user_active()
  and (
    student_id = auth.uid()
    or private.is_teacher_of_student(student_id)
    or private.current_user_role() = 'admin'::user_role
  )
);

drop policy if exists learning_session_items_student_or_teacher_read on public.learning_session_items;
create policy learning_session_items_student_or_teacher_read on public.learning_session_items
for select to authenticated
using (
  private.current_user_active()
  and exists (
    select 1 from public.learning_sessions s
    where s.id = learning_session_items.session_id
      and (
        s.student_id = auth.uid()
        or private.is_teacher_of_student(s.student_id)
        or private.current_user_role() = 'admin'::user_role
      )
  )
);

drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles
for update to authenticated
using (private.current_user_role() = 'admin'::user_role and private.current_user_active())
with check (private.current_user_role() = 'admin'::user_role and private.current_user_active());

create or replace function public.erase_student_data(p_student_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
  v_inventory jsonb;
begin
  select role into v_role from public.profiles where id = p_student_id for update;
  if v_role is null then
    raise exception 'profile_not_found';
  end if;
  if v_role <> 'student'::public.user_role then
    raise exception 'student_only_erasure';
  end if;

  select jsonb_build_object(
    'attempts', (select count(*) from public.attempts where student_id = p_student_id),
    'sessions', (select count(*) from public.learning_sessions where student_id = p_student_id),
    'mastery_rows', (select count(*) from public.student_skill_mastery where student_id = p_student_id),
    'class_memberships', (select count(*) from public.class_memberships where student_id = p_student_id),
    'remediation_events', (select count(*) from public.remediation_events where student_id = p_student_id)
  ) into v_inventory;

  delete from public.profiles where id = p_student_id;
  return v_inventory;
end;
$$;

revoke all on function public.erase_student_data(uuid) from public, anon, authenticated;
grant execute on function public.erase_student_data(uuid) to service_role;

create or replace function private.audit_profile_security_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and (old.role is distinct from new.role or old.account_status is distinct from new.account_status) then
    insert into public.security_audit_log(actor_user_id, actor_role, action, target_user_id, target_type, details)
    values (
      auth.uid(),
      private.current_user_role()::text,
      'profile.security_changed',
      new.id,
      'user',
      jsonb_build_object('old_role', old.role::text, 'new_role', new.role::text, 'old_status', old.account_status, 'new_status', new.account_status)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_security_audit_trigger on public.profiles;
create trigger profiles_security_audit_trigger
after update of role, account_status on public.profiles
for each row execute function private.audit_profile_security_change();

insert into public.privacy_preferences(user_id)
select id from public.profiles
on conflict (user_id) do nothing;
