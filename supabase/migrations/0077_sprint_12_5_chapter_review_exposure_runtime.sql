-- Sprint 12.5 Chapter Review exposure integration runtime provenance.

insert into public.runtime_builds(build_key,source_commit,implementation_manifest,notes)
values (
  'runtime-2026-09-22-r11',
  '3336ff5c32aa396e1ea61a82f332f6c73ea78c91',
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
    'chapterReviewExposureIntegration',jsonb_build_object(
      'studentItemExposurePurpose','chapter_review',
      'serveExposure',true,
      'answerExposureFinalization',true,
      'helpExposure',true
    )
  ),
  'Sprint 12.5 Chapter Review exposure integration correction; no learning parameter change.'
)
on conflict (build_key) do nothing;

update public.learning_model_runtime_bindings b
set runtime_build_id=rb.id,updated_at=now(),
    notes='Sprint 12.5 Chapter Review exposure integration correction.'
from public.runtime_builds rb
where b.status='active' and rb.build_key='runtime-2026-09-22-r11';
