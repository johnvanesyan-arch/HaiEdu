-- Sprint 14A: additive academic identities. No existing class or session is backfilled.
create extension if not exists btree_gist with schema extensions;
set search_path = public, extensions;

create table public.academic_years (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete restrict,
  label text not null check (length(btrim(label)) > 0),
  starts_on date not null,
  ends_on date not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'closed')),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  constraint academic_year_dates check (ends_on > starts_on),
  constraint academic_year_school_label unique (school_id, label),
  constraint academic_year_id_school unique (id, school_id)
);

create table public.institutional_memberships (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete restrict,
  person_id uuid not null references public.profiles(id) on delete restrict,
  role text not null check (role in ('student', 'teacher', 'school_admin')),
  valid_from timestamptz not null,
  valid_to timestamptz,
  status text not null default 'pending' check (status in ('pending', 'active', 'ended', 'revoked')),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  ended_by uuid references public.profiles(id) on delete set null,
  constraint institutional_membership_period check (valid_to is null or valid_to > valid_from),
  constraint institutional_membership_id_school unique (id, school_id),
  constraint institutional_membership_active_period_no_overlap exclude using gist
    (school_id with =, person_id with =, role with =,
     tstzrange(valid_from, valid_to, '[)') with &&) where (status = 'active')
);

alter table public.classes add column academic_year_id uuid;
alter table public.classes add constraint classes_academic_year_school_fkey
  foreign key (academic_year_id, school_id)
  references public.academic_years(id, school_id) on delete restrict;
alter table public.classes add constraint classes_academic_year_school_pair
  check ((school_id is null and academic_year_id is null) or
         (school_id is not null and academic_year_id is not null));
alter table public.classes add constraint classes_id_school_year_unique
  unique (id, school_id, academic_year_id);

create table public.teacher_assignments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  academic_year_id uuid not null,
  class_id uuid not null,
  teacher_membership_id uuid not null,
  subject_program_id uuid not null references public.subject_programs(id) on delete restrict,
  valid_from timestamptz not null,
  valid_to timestamptz,
  status text not null default 'draft' check (status in ('draft', 'active', 'ended', 'revoked')),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  constraint teacher_assignment_period check (valid_to is null or valid_to > valid_from),
  constraint teacher_assignment_year foreign key (academic_year_id, school_id)
    references public.academic_years(id, school_id) on delete restrict,
  constraint teacher_assignment_class foreign key (class_id, school_id, academic_year_id)
    references public.classes(id, school_id, academic_year_id) on delete restrict,
  constraint teacher_assignment_membership foreign key (teacher_membership_id, school_id)
    references public.institutional_memberships(id, school_id) on delete restrict,
  constraint teacher_assignment_active_period_no_overlap exclude using gist
    (class_id with =, teacher_membership_id with =, subject_program_id with =,
     tstzrange(valid_from, valid_to, '[)') with &&) where (status = 'active')
);

-- A service-role writer must still supply a teacher membership and matching
-- class/programme identity. Active assignments require an active membership.
create function public.validate_teacher_assignment_14a() returns trigger
language plpgsql set search_path = public as $$
declare m record; c record; p record;
begin
  select role, status, valid_from, valid_to into m
  from public.institutional_memberships where id = new.teacher_membership_id;
  select subject_id, grade_id into c from public.classes where id = new.class_id;
  select subject_id, grade_id into p from public.subject_programs where id = new.subject_program_id;
  if m.role is distinct from 'teacher' or
     c.subject_id is distinct from p.subject_id or c.grade_id is distinct from p.grade_id then
    raise exception 'assignment_identity_mismatch' using errcode = '23514';
  end if;
  if new.status = 'active' and
     (m.status is distinct from 'active' or new.valid_from < m.valid_from or
      (m.valid_to is not null and (new.valid_to is null or new.valid_to > m.valid_to))) then
    raise exception 'assignment_outside_teacher_membership' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger validate_teacher_assignment_14a
before insert or update on public.teacher_assignments
for each row execute function public.validate_teacher_assignment_14a();

create index institutional_memberships_person_school_period_idx
  on public.institutional_memberships(person_id, school_id, status, valid_from desc);
create index teacher_assignments_membership_class_period_idx
  on public.teacher_assignments(teacher_membership_id, class_id, status, valid_from desc);
create index teacher_assignments_school_year_idx
  on public.teacher_assignments(school_id, academic_year_id, status);
create index classes_academic_year_id_idx on public.classes(academic_year_id)
  where academic_year_id is not null;

create table public.academic_identity_events (
  id bigint generated always as identity primary key,
  table_name text not null,
  row_id uuid not null,
  operation text not null,
  old_value jsonb,
  new_value jsonb,
  recorded_at timestamptz not null default now(),
  actor_id uuid
);
-- Tables without ended_by use the same audit function via JSON, rather than
-- referencing a column absent on academic_years or teacher_assignments.
create function public.audit_academic_identity_14a() returns trigger
language plpgsql set search_path = public as $$
declare v jsonb := to_jsonb(new);
begin
  insert into public.academic_identity_events
    (table_name, row_id, operation, old_value, new_value, actor_id)
  values (tg_table_name, new.id, tg_op, to_jsonb(old), v,
          coalesce(nullif(v->>'ended_by','')::uuid,
                   nullif(v->>'created_by','')::uuid, auth.uid()));
  return new;
end $$;
create trigger audit_academic_year_14a after insert or update on public.academic_years
  for each row execute function public.audit_academic_identity_14a();
create trigger audit_institutional_membership_14a after insert or update on public.institutional_memberships
  for each row execute function public.audit_academic_identity_14a();
create trigger audit_teacher_assignment_14a after insert or update on public.teacher_assignments
  for each row execute function public.audit_academic_identity_14a();

alter table public.academic_years enable row level security;
alter table public.institutional_memberships enable row level security;
alter table public.teacher_assignments enable row level security;
alter table public.academic_identity_events enable row level security;
revoke all on public.academic_years, public.institutional_memberships, public.teacher_assignments
  from anon, authenticated;
revoke all on public.academic_identity_events from anon, authenticated;
grant select, insert, update on public.academic_years, public.institutional_memberships,
  public.teacher_assignments to service_role;
grant select, insert on public.academic_identity_events to service_role;
revoke delete, truncate on public.academic_years, public.institutional_memberships,
  public.teacher_assignments, public.academic_identity_events from service_role;
revoke update on public.academic_identity_events from service_role;
revoke execute on function public.validate_teacher_assignment_14a() from public, anon, authenticated;
revoke execute on function public.audit_academic_identity_14a() from public, anon, authenticated;
reset search_path;
