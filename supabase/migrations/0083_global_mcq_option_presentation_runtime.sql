-- Sprint 12.5Z — MCQ presentation integrity runtime provenance and advisor cleanup.
-- Source implementation through activation commit 6498b893ce6f224765aa6bb24b396cc16f9d8dfe.

create index if not exists idx_lsi_option_orders_session
  on private.learning_session_item_option_orders(session_id);

create index if not exists idx_lsi_option_orders_item
  on private.learning_session_item_option_orders(item_id);

insert into public.runtime_builds(build_key,source_commit,implementation_manifest,notes)
values (
  'runtime-2026-09-23-r15',
  '6498b893ce6f224765aa6bb24b396cc16f9d8dfe',
  jsonb_build_object(
    'functions',jsonb_build_object(
      'submit-answer',14,
      'start-learning-session',19,
      'get-session-item',13,
      'get-student-dashboard',18,
      'submit-mastery-answer',5,
      'get-mastery-check-status',9,
      'get-remediation-help',9,
      'record-recommendation-event',2,
      'get-chapter-mastery-lifecycle',1,
      'get-teacher-dashboard',6,
      'get-teacher-student',6
    ),
    'learningParametersChanged',false,
    'chapterMasteryLifecyclePolicyVersion','chapter-mastery-review-2026-r1',
    'mcqOptionPresentationPolicyVersion','mcq-option-order-v1',
    'mcqOptionPresentation',jsonb_build_object(
      'scope',jsonb_build_array('diagnostic','practice','mastery_check','chapter_review'),
      'globalSessionItemBoundary',true,
      'persistedPrivateOrder',true,
      'serverRandomized',true,
      'immediateSameOrderRepeatPrevented',true,
      'learnerPresentationKeysDecoupledFromCanonicalKeys',true,
      'serverCanonicalGrading',true,
      'refreshResumeStable',true,
      'answeredHistoricalPresentationFabricated',false,
      'activePreRolloutUnansweredItemsGrandfatheredCanonical',true
    )
  ),
  'Sprint 12.5Z global MCQ option-presentation integrity: persisted private randomized order, positional learner labels, canonical server grading; no learning-parameter change.'
)
on conflict (build_key) do nothing;

update public.learning_model_runtime_bindings b
set runtime_build_id=rb.id,
    updated_at=now(),
    notes='Sprint 12.5Z: global persisted MCQ option-presentation integrity; no learning-parameter change.'
from public.runtime_builds rb
where b.status='active'
  and rb.build_key='runtime-2026-09-23-r15';
