-- Activate the closure-corrected implementation bundle independently of the
-- unchanged baseline learning-model configuration.

insert into public.runtime_builds(build_key, source_commit, implementation_manifest, notes)
values (
  'runtime-2026-09-20-r3',
  '0b666a73c8f297c745d542ddbe11c6236073aefa',
  jsonb_build_object(
    'functions', jsonb_build_object(
      'submit-answer', 11,
      'start-learning-session', 13,
      'get-session-item', 11,
      'get-student-dashboard', 17,
      'submit-mastery-answer', 4,
      'get-mastery-check-status', 6,
      'get-remediation-help', 7,
      'record-recommendation-event', 2
    ),
    'learningParametersChanged', false,
    'closureCorrections', jsonb_build_array(
      'runtime_provenance',
      'session_identity_immutability',
      'append_only_privileges',
      'atomic_hint_recording',
      'visible_unclassified_evidence',
      'recommendation_action_confirmation'
    )
  ),
  'Closure-corrected runtime. Learning parameters remain baseline-2026-09-20-r1.'
)
on conflict (build_key) do nothing;

update public.learning_model_runtime_bindings b
set runtime_build_id=rb.id,
    updated_at=now(),
    notes='Sprint 12A closure-corrected runtime; baseline learning model unchanged.'
from public.runtime_builds rb
where b.status='active'
  and rb.build_key='runtime-2026-09-20-r3';
