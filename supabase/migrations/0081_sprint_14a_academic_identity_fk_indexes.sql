-- Cover new foreign keys that are not leftmost in 14A lookup indexes.
create index academic_years_created_by_idx on public.academic_years(created_by);
create index institutional_memberships_created_by_idx on public.institutional_memberships(created_by);
create index institutional_memberships_ended_by_idx on public.institutional_memberships(ended_by);
create index teacher_assignments_class_school_year_idx
  on public.teacher_assignments(class_id, school_id, academic_year_id);
create index teacher_assignments_membership_school_idx
  on public.teacher_assignments(teacher_membership_id, school_id);
create index teacher_assignments_year_school_idx
  on public.teacher_assignments(academic_year_id, school_id);
create index teacher_assignments_created_by_idx on public.teacher_assignments(created_by);
create index teacher_assignments_program_idx on public.teacher_assignments(subject_program_id);
