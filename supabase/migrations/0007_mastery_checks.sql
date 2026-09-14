-- Sprint 6: separate mastery checks and explicit assessment result state.

alter table public.learning_sessions drop constraint if exists learning_sessions_mode_check;
alter table public.learning_sessions
  add constraint learning_sessions_mode_check
  check (mode in ('diagnostic','practice','mastery_check'));

alter table public.learning_sessions
  add column if not exists assessment_result text
    check (assessment_result in ('passed','failed')),
  add column if not exists score_percent numeric
    check (score_percent is null or (score_percent >= 0 and score_percent <= 100));

create index if not exists idx_learning_sessions_mastery_checks
  on public.learning_sessions(student_id, unit_code, mode, completed_at desc)
  where mode = 'mastery_check';
