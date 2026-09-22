-- Sprint 12.5G-K learner lifecycle and UX runtime activation.

insert into public.runtime_builds(build_key,source_commit,implementation_manifest,notes)
values (
  'runtime-2026-09-22-r8',
  'f7bf36baa11b3ffa691c17bb1f647b4cbdabe2e1',
  jsonb_build_object(
    'functions',jsonb_build_object(
      'submit-answer',12,'start-learning-session',17,'get-session-item',12,
      'get-student-dashboard',17,'submit-mastery-answer',5,
      'get-mastery-check-status',8,'get-remediation-help',8,
      'record-recommendation-event',2,'get-chapter-mastery-lifecycle',1
    ),
    'learningParametersChanged',false,
    'chapterMasteryLifecyclePolicyVersion','chapter-mastery-review-2026-r1',
    'sprint12_5LearnerLifecycle',jsonb_build_array(
      'pass_on_attempt_1_2_or_3','required_review_after_failures_1_and_2',
      'attempt_4_prohibited','optional_review_after_pass',
      'optional_review_after_final_failure','natural_armenian_states',
      'whole_chapter_review_explanation','internal_reason_codes_hidden'
    )
  ),
  'Sprint 12.5G-K learner lifecycle contract and Armenian Review/retry UX.'
)
on conflict (build_key) do nothing;

update public.learning_model_runtime_bindings b
set runtime_build_id=rb.id,updated_at=now(),
    notes='Sprint 12.5G-K authenticated lifecycle contract and learner Review/retry UX.'
from public.runtime_builds rb
where b.status='active' and rb.build_key='runtime-2026-09-22-r8';
