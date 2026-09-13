-- Move RLS helper functions out of the exposed public schema and explicitly lock down schools.
-- This migration mirrors the live Supabase security hardening applied after advisor review.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create or replace function private.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function private.is_teacher_of_student(student_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.classes c
    join public.class_memberships cm on cm.class_id = c.id
    where c.teacher_id = auth.uid() and cm.student_id = student_uuid
  );
$$;

create or replace function private.is_class_member(class_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.class_memberships
    where class_id = class_uuid and student_id = auth.uid()
  );
$$;

create or replace function private.is_class_teacher(class_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.classes
    where id = class_uuid and teacher_id = auth.uid()
  );
$$;

grant execute on function private.current_user_role() to authenticated, service_role;
grant execute on function private.is_teacher_of_student(uuid) to authenticated, service_role;
grant execute on function private.is_class_member(uuid) to authenticated, service_role;
grant execute on function private.is_class_teacher(uuid) to authenticated, service_role;

-- Exposed SECURITY DEFINER helper RPCs are not intended as public APIs.
revoke all on function public.current_user_role() from public, anon, authenticated;
revoke all on function public.is_teacher_of_student(uuid) from public, anon, authenticated;
revoke all on function public.is_class_member(uuid) from public, anon, authenticated;
revoke all on function public.is_class_teacher(uuid) from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- The live project also rebuilt existing RLS policies to call the private helpers.
-- Keep subsequent policy definitions pointed at private.current_user_role(),
-- private.is_teacher_of_student(), private.is_class_member(), and private.is_class_teacher().

create policy "schools_admin_read" on public.schools for select to authenticated
using (private.current_user_role() in ('admin','content_admin'));

create policy "schools_admin_write" on public.schools for all to authenticated
using (private.current_user_role() = 'admin')
with check (private.current_user_role() = 'admin');
