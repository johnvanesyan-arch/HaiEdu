-- Sprint 12.5C-D index hardening identified by database advisers.

create index academic_mastery_policy_activation_policy_idx
  on public.academic_mastery_policy_activation(policy_id);
create index academic_mastery_policy_activation_actor_idx
  on public.academic_mastery_policy_activation(activated_by)
  where activated_by is not null;
create index chapter_review_requirements_qualifying_session_idx
  on public.chapter_review_requirements(qualifying_review_session_id)
  where qualifying_review_session_id is not null;
