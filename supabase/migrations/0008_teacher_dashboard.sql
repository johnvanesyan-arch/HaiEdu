-- Sprint 7: Teacher Dashboard v1
-- Adds class join codes, teacher-managed class membership, and teacher read access
-- to bounded learning-session evidence. Teacher-facing aggregate reads are served
-- through authenticated Edge Functions that re-check class ownership.

alter table public.classes add column if not exists join_code text;
alter table public.classes add column if not exists is_active boolean not null default true;

create unique index if not exists classes_join_code_unique
  on public.classes(join_code) where join_code is not null;
create index if not exists classes_teacher_subject_grade_idx
  on public.classes(teacher_id, subject_id, grade_id);
create index if not exists class_memberships_student_idx
  on public.class_memberships(student_id, class_id);
create index if not exists attempts_student_created_idx
  on public.attempts(student_id, created_at desc);
create index if not exists mastery_student_skill_idx
  on public.student_skill_mastery(student_id, skill_id);

-- Teachers may create and manage only their own classes; admins retain full access.
drop policy if exists classes_teacher_insert on public.classes;
create policy classes_teacher_insert on public.classes
for insert to authenticated
with check (
  teacher_id = auth.uid()
  and private.current_user_role() in ('teacher'::user_role, 'admin'::user_role)
);

drop policy if exists classes_teacher_update on public.classes;
create policy classes_teacher_update on public.classes
for update to authenticated
using (teacher_id = auth.uid() or private.current_user_role() = 'admin'::user_role)
with check (teacher_id = auth.uid() or private.current_user_role() = 'admin'::user_role);

drop policy if exists classes_teacher_delete on public.classes;
create policy classes_teacher_delete on public.classes
for delete to authenticated
using (teacher_id = auth.uid() or private.current_user_role() = 'admin'::user_role);

-- Teachers may manage memberships only for classes they own.
drop policy if exists memberships_teacher_insert on public.class_memberships;
create policy memberships_teacher_insert on public.class_memberships
for insert to authenticated
with check (private.is_class_teacher(class_id) or private.current_user_role() = 'admin'::user_role);

drop policy if exists memberships_teacher_delete on public.class_memberships;
create policy memberships_teacher_delete on public.class_memberships
for delete to authenticated
using (private.is_class_teacher(class_id) or private.current_user_role() = 'admin'::user_role);

-- Teachers can inspect session evidence for students in their own classes.
drop policy if exists learning_sessions_student_or_teacher_read on public.learning_sessions;
drop policy if exists students_read_own_learning_sessions on public.learning_sessions;
create policy learning_sessions_student_or_teacher_read on public.learning_sessions
for select to authenticated
using (
  student_id = auth.uid()
  or private.is_teacher_of_student(student_id)
  or private.current_user_role() = 'admin'::user_role
);

drop policy if exists learning_session_items_student_or_teacher_read on public.learning_session_items;
drop policy if exists students_read_own_learning_session_items on public.learning_session_items;
create policy learning_session_items_student_or_teacher_read on public.learning_session_items
for select to authenticated
using (
  exists (
    select 1 from public.learning_sessions s
    where s.id = learning_session_items.session_id
      and (
        s.student_id = auth.uid()
        or private.is_teacher_of_student(s.student_id)
        or private.current_user_role() = 'admin'::user_role
      )
  )
);
