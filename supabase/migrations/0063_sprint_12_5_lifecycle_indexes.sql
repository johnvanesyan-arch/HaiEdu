-- Sprint 12.5A-B index hardening identified by database advisers.

create index chapter_mastery_states_policy_idx
  on public.chapter_mastery_states(academic_mastery_policy_id);
create index chapter_mastery_states_release_idx
  on public.chapter_mastery_states(curriculum_release_id);
create index learning_sessions_mastery_policy_idx
  on public.learning_sessions(academic_mastery_policy_id)
  where academic_mastery_policy_id is not null;
create index mastery_check_attempts_policy_idx
  on public.mastery_check_attempts(academic_mastery_policy_id);
