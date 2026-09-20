-- Sprint 12A — index immutable learning-model configuration foreign keys.
create index if not exists learning_model_configurations_predecessor_idx
  on public.learning_model_configurations (predecessor_id)
  where predecessor_id is not null;

create index if not exists learning_model_configurations_reference_release_idx
  on public.learning_model_configurations (reference_curriculum_release_id)
  where reference_curriculum_release_id is not null;
