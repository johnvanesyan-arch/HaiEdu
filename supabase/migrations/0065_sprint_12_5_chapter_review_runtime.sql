-- Sprint 12.5C-D runtime bundle activation.

insert into public.runtime_builds(build_key,source_commit,implementation_manifest,notes)
values (
  'runtime-2026-09-21-r5',
  'bb2b691ad17f19d5883efddbfee0c70f35ae8dfc',
  jsonb_build_object(
    'functions',jsonb_build_object(
      'submit-answer',12,
      'start-learning-session',15,
      'get-session-item',12,
      'get-student-dashboard',17,
      'submit-mastery-answer',5,
      'get-mastery-check-status',8,
      'get-remediation-help',8,
      'record-recommendation-event',2
    ),
    'learningParametersChanged',false,
    'sprint12_5ChapterReviewGate',jsonb_build_array(
      'chapter_review_mode',
      'review_requirements',
      'required_review_completion',
      'retry_ready_transition',
      'optional_review_terminal_state_preservation',
      'review_hint_support'
    )
  ),
  'Sprint 12.5C-D first-class Chapter Review and qualifying retry gate.'
)
on conflict (build_key) do nothing;

update public.learning_model_runtime_bindings b
set runtime_build_id=rb.id,updated_at=now(),
    notes='Sprint 12.5C-D Chapter Review gate; baseline learning model unchanged.'
from public.runtime_builds rb
where b.status='active' and rb.build_key='runtime-2026-09-21-r5';
