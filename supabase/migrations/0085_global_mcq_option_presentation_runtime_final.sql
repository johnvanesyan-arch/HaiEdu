-- Sprint 12.5Z — final MCQ presentation-integrity runtime provenance.
-- Source implementation through 4b551f6e068457d11e8644fd2f60b95eca8ca2bd.

insert into public.runtime_builds(build_key,source_commit,implementation_manifest,notes)
values (
  'runtime-2026-09-23-r16',
  '4b551f6e068457d11e8644fd2f60b95eca8ca2bd',
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
      'refreshResumeStable',true,
      'learnerPresentationKeysDecoupledFromCanonicalKeys',true,
      'serverCanonicalGrading',true,
      'masteryDelegatesCanonicalizedGrading',true,
      'fixedOrderExceptionRequiresExplicitRationale',true,
      'answeredHistoricalPresentationFabricated',false,
      'activePreRolloutUnansweredItemsGrandfatheredCanonical',true
    )
  ),
  'Sprint 12.5Z final MCQ presentation integrity runtime: global persisted randomization plus governed fixed-order semantic exception; no learning-parameter change.'
)
on conflict (build_key) do nothing;

update public.learning_model_runtime_bindings b
set runtime_build_id=rb.id,
    updated_at=now(),
    notes='Sprint 12.5Z final: global persisted MCQ option presentation with governed fixed-order semantic exception; no learning-parameter change.'
from public.runtime_builds rb
where b.status='active'
  and rb.build_key='runtime-2026-09-23-r16';
