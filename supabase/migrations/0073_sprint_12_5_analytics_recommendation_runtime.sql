-- Sprint 12.5L-O analytics, evidence separation and recommendation runtime activation.

insert into public.runtime_builds(build_key,source_commit,implementation_manifest,notes)
values (
  'runtime-2026-09-22-r9',
  'a6f5586f47e1a65879409705017d25f45ae9cbf5',
  jsonb_build_object(
    'functions',jsonb_build_object(
      'submit-answer',12,'start-learning-session',17,'get-session-item',12,
      'get-student-dashboard',18,'submit-mastery-answer',5,
      'get-mastery-check-status',8,'get-remediation-help',8,
      'record-recommendation-event',2,'get-chapter-mastery-lifecycle',1,
      'get-teacher-dashboard',4,'get-teacher-student',4
    ),
    'learningParametersChanged',false,
    'chapterMasteryLifecyclePolicyVersion','chapter-mastery-review-2026-r1',
    'sprint12_5AnalyticsAndRecommendations',jsonb_build_array(
      'teacher_review_summary','teacher_review_skill_inputs',
      'review_attention_thresholds_not_governed','review_evidence_stream_isolated',
      'required_review_before_retry','retry_after_qualifying_review',
      'optional_review_after_pass','review_after_final_failure'
    )
  ),
  'Sprint 12.5L-O teacher Review analytics, explicit evidence separation and lifecycle-aware recommendations.'
)
on conflict (build_key) do nothing;

update public.learning_model_runtime_bindings b
set runtime_build_id=rb.id,updated_at=now(),
    notes='Sprint 12.5L-O Review analytics, evidence separation and lifecycle-aware recommendation routing.'
from public.runtime_builds rb
where b.status='active' and rb.build_key='runtime-2026-09-22-r9';
