-- Sprint 12.5 teacher UI/localization QA correction runtime provenance.

insert into public.runtime_builds(build_key,source_commit,implementation_manifest,notes)
values (
  'runtime-2026-09-22-r12',
  'eb0b72a74de8db93e22e820879f1328e3990ed2e',
  jsonb_build_object(
    'functions',jsonb_build_object(
      'submit-answer',13,'start-learning-session',18,'get-session-item',12,
      'get-student-dashboard',18,'submit-mastery-answer',5,
      'get-mastery-check-status',8,'get-remediation-help',8,
      'record-recommendation-event',2,'get-chapter-mastery-lifecycle',1,
      'get-teacher-dashboard',6,'get-teacher-student',6
    ),
    'learningParametersChanged',false,
    'chapterMasteryLifecyclePolicyVersion','chapter-mastery-review-2026-r1',
    'teacherLocalizationQa',jsonb_build_object(
      'reviewMasteryTerminologyLocalized',true,
      'recentAccuracyLabelClarified',true,
      'rawAssessmentResultLocalized',true
    )
  ),
  'Sprint 12.5 teacher-facing Armenian localization and metric-label QA correction; no learning or analytics logic change.'
)
on conflict (build_key) do nothing;

update public.learning_model_runtime_bindings b
set runtime_build_id=rb.id,updated_at=now(),
    notes='Sprint 12.5 teacher localization QA correction; no learning parameter change.'
from public.runtime_builds rb
where b.status='active' and rb.build_key='runtime-2026-09-22-r12';
