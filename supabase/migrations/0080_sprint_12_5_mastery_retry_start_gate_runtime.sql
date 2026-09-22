-- Sprint 12.5 authenticated lifecycle QA correction:
-- governed mastery retry state must also bypass the Attempt-1 skill gate
-- at the actual session-start boundary.

insert into public.runtime_builds(build_key,source_commit,implementation_manifest,notes)
values (
  'runtime-2026-09-22-r14',
  '56806f16feb7a03465bc951fd00cb7fa99dd7c2e',
  jsonb_build_object(
    'functions',jsonb_build_object(
      'submit-answer',13,'start-learning-session',19,'get-session-item',12,
      'get-student-dashboard',18,'submit-mastery-answer',5,
      'get-mastery-check-status',9,'get-remediation-help',8,
      'record-recommendation-event',2,'get-chapter-mastery-lifecycle',1,
      'get-teacher-dashboard',6,'get-teacher-student',6
    ),
    'learningParametersChanged',false,
    'chapterMasteryLifecyclePolicyVersion','chapter-mastery-review-2026-r1',
    'masteryRetryStartGateQa',jsonb_build_object(
      'attempt1SkillGatePreserved',true,
      'retry2And3BypassInitialSkillGate',true,
      'requiredReviewStillBlocksStart',true,
      'finalFailureStillBlocksStart',true,
      'atomicLifecycleStartRemainsAuthoritative',true
    )
  ),
  'Sprint 12.5 authenticated QA correction: mastery retry session start now follows governed lifecycle after qualifying Review; no learning parameter change.'
)
on conflict (build_key) do nothing;

update public.learning_model_runtime_bindings b
set runtime_build_id=rb.id,updated_at=now(),
    notes='Sprint 12.5 retry start-gate QA correction; governed Review lifecycle remains authoritative.'
from public.runtime_builds rb
where b.status='active' and rb.build_key='runtime-2026-09-22-r14';
