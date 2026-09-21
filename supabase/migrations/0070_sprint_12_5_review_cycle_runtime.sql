-- Sprint 12.5E-F runtime activation.

insert into public.runtime_builds(build_key,source_commit,implementation_manifest,notes)
values (
  'runtime-2026-09-21-r7',
  '83b9c3beefe4ef254b6e81b5f17ae156f38a33f2',
  jsonb_build_object(
    'functions',jsonb_build_object(
      'submit-answer',12,'start-learning-session',17,'get-session-item',12,
      'get-student-dashboard',17,'submit-mastery-answer',5,
      'get-mastery-check-status',8,'get-remediation-help',8,
      'record-recommendation-event',2
    ),
    'learningParametersChanged',false,
    'reviewSelectionPolicyVersion','12.5E-F-v1',
    'sprint12_5ReviewCycles',jsonb_build_array(
      'whole_chapter_rotation','failed_skill_weighting','weak_independent_weighting',
      'unseen_first','least_recent_first','variant_diversity','pool_exhaustion_guard',
      'immutable_item_selection_provenance','deterministic_ordering'
    )
  ),
  'Sprint 12.5E-F durable Review cycles and deterministic item-level selection provenance.'
)
on conflict (build_key) do nothing;

update public.learning_model_runtime_bindings b
set runtime_build_id=rb.id,updated_at=now(),
    notes='Sprint 12.5E-F deterministic Review-cycle selection and provenance.'
from public.runtime_builds rb
where b.status='active' and rb.build_key='runtime-2026-09-21-r7';
