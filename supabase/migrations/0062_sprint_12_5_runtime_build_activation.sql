-- Sprint 12.5A-B runtime bundle activation.
-- Learning parameters remain unchanged; this build adds the governed mastery lifecycle.

insert into public.runtime_builds(build_key,source_commit,implementation_manifest,notes)
values (
  'runtime-2026-09-21-r4',
  '2002e22fd95bc861be94c6e17a5aa2b1f857beeb',
  jsonb_build_object(
    'functions',jsonb_build_object(
      'submit-answer',11,
      'start-learning-session',14,
      'get-session-item',11,
      'get-student-dashboard',17,
      'submit-mastery-answer',5,
      'get-mastery-check-status',7,
      'get-remediation-help',7,
      'record-recommendation-event',2
    ),
    'learningParametersChanged',false,
    'sprint12_5Foundation',jsonb_build_array(
      'versioned_mastery_policy',
      'chapter_mastery_state_machine',
      'authoritative_attempt_records',
      'atomic_mastery_creation',
      'atomic_mastery_finalization',
      'three_attempt_ceiling'
    )
  ),
  'Sprint 12.5A-B lifecycle foundation. Baseline learning parameters remain unchanged.'
)
on conflict (build_key) do nothing;

update public.learning_model_runtime_bindings b
set runtime_build_id=rb.id,
    updated_at=now(),
    notes='Sprint 12.5A-B governed mastery lifecycle; baseline learning model unchanged.'
from public.runtime_builds rb
where b.status='active' and rb.build_key='runtime-2026-09-21-r4';
