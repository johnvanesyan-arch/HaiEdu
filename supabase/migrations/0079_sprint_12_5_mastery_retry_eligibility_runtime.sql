-- Sprint 12.5 authenticated lifecycle QA correction:
-- qualifying required Chapter Review must unlock governed Mastery retries
-- without reapplying the Attempt-1 all-skills readiness gate.

insert into public.runtime_builds(build_key,source_commit,implementation_manifest,notes)
values (
  'runtime-2026-09-22-r13',
  '91e25564d62180e27e04273132cbcdfd5187f65f',
  jsonb_build_object(
    'functions',jsonb_build_object(
      'submit-answer',13,'start-learning-session',18,'get-session-item',12,
      'get-student-dashboard',18,'submit-mastery-answer',5,
      'get-mastery-check-status',9,'get-remediation-help',8,
      'record-recommendation-event',2,'get-chapter-mastery-lifecycle',1,
      'get-teacher-dashboard',6,'get-teacher-student',6
    ),
    'learningParametersChanged',false,
    'chapterMasteryLifecyclePolicyVersion','chapter-mastery-review-2026-r1',
    'masteryRetryEligibilityQa',jsonb_build_object(
      'attempt1UsesSkillReadinessGate',true,
      'retry2And3UseLifecycleReviewGate',true,
      'qualifiedReviewUnlocksRetry',true,
      'currentSkillScoresDoNotRelockQualifiedRetry',true
    )
  ),
  'Sprint 12.5 authenticated QA correction: a satisfied qualifying Chapter Review now unlocks Attempt 2/3 according to the governed lifecycle; no learning parameter change.'
)
on conflict (build_key) do nothing;

update public.learning_model_runtime_bindings b
set runtime_build_id=rb.id,updated_at=now(),
    notes='Sprint 12.5 retry eligibility QA correction; governed Review gate now authoritative for retry readiness.'
from public.runtime_builds rb
where b.status='active' and rb.build_key='runtime-2026-09-22-r13';
