-- Sprint 12.5P-W integrity, coverage and reporting runtime activation.

insert into public.runtime_builds(build_key,source_commit,implementation_manifest,notes)
values (
  'runtime-2026-09-22-r10',
  '29cb3352680b0ff8e36bc7f63fba78bca2fb758a',
  jsonb_build_object(
    'functions',jsonb_build_object(
      'submit-answer',13,'start-learning-session',18,'get-session-item',12,
      'get-student-dashboard',18,'submit-mastery-answer',5,
      'get-mastery-check-status',8,'get-remediation-help',8,
      'record-recommendation-event',2,'get-chapter-mastery-lifecycle',1,
      'get-teacher-dashboard',5,'get-teacher-student',5
    ),
    'learningParametersChanged',false,
    'chapterMasteryLifecyclePolicyVersion','chapter-mastery-review-2026-r1',
    'sprint12_5IntegrityAndCoverage',jsonb_build_array(
      'retry_link_database_guard','attempt_identity_immutable',
      'ordinary_practice_not_retry_gate','assessment_purpose_eligibility',
      'protected_mastery_unseen_first','chapter_review_hinting_v2',
      'cycle_and_lifetime_coverage','legacy_ambiguity_explicit',
      'service_only_reporting_views'
    )
  ),
  'Sprint 12.5P-W attempt integrity, protected exposure, Hinting v2, coverage, provenance and reporting.'
)
on conflict (build_key) do nothing;

update public.learning_model_runtime_bindings b
set runtime_build_id=rb.id,updated_at=now(),
    notes='Sprint 12.5P-W integrity, protected assessment exposure, Review coverage and reporting.'
from public.runtime_builds rb
where b.status='active' and rb.build_key='runtime-2026-09-22-r10';
