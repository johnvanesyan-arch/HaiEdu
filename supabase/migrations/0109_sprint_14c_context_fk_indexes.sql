-- Cover the foreign-key lookups introduced by Sprint 14C. These indexes do
-- not change access or evidence semantics.

create index institutional_enrollment_teacher_assignment_14c_idx
  on public.institutional_class_enrollments(teacher_assignment_id);
create index institutional_enrollment_subject_program_14c_idx
  on public.institutional_class_enrollments(subject_program_id);
create index student_account_acceptances_student_14c_idx
  on public.student_account_acceptances(student_id);

create index learning_sessions_academic_year_school_14c_idx
  on public.learning_sessions(academic_year_id,school_id);
create index learning_sessions_class_scope_14c_idx
  on public.learning_sessions(class_id,school_id,academic_year_id);
create index learning_sessions_teacher_assignment_14c_idx
  on public.learning_sessions(teacher_assignment_id);
create index learning_sessions_subject_program_14c_idx
  on public.learning_sessions(subject_program_id);
