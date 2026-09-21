-- Sprint 12.5C-D provenance-corrected runtime activation.

insert into public.runtime_builds(build_key,source_commit,implementation_manifest,notes)
values (
  'runtime-2026-09-21-r6',
  '8387b4ef9b4a9ab9e1d153f4f184120119d9ec47',
  jsonb_build_object(
    'functions',jsonb_build_object(
      'submit-answer',12,'start-learning-session',16,'get-session-item',12,
      'get-student-dashboard',17,'submit-mastery-answer',5,
      'get-mastery-check-status',8,'get-remediation-help',8,
      'record-recommendation-event',2
    ),
    'learningParametersChanged',false,
    'chapterReviewBlueprintPurpose','chapter_review',
    'sprint12_5ChapterReviewGate',jsonb_build_array(
      'chapter_review_mode','review_requirements','required_review_completion',
      'retry_ready_transition','optional_review_terminal_state_preservation',
      'review_hint_support','distinct_review_blueprint'
    )
  ),
  'Sprint 12.5C-D Chapter Review gate with distinct assessment blueprint provenance.'
)
on conflict (build_key) do nothing;

update public.learning_model_runtime_bindings b
set runtime_build_id=rb.id,updated_at=now(),
    notes='Sprint 12.5C-D provenance-corrected Chapter Review gate.'
from public.runtime_builds rb
where b.status='active' and rb.build_key='runtime-2026-09-21-r6';
