-- Sprint 11J follow-up: cover reconciliation and verification foreign-key access paths.

create index if not exists learning_outcomes_topic_idx
  on public.learning_outcomes(topic_id);

create index if not exists skill_outcomes_learning_outcome_idx
  on public.skill_outcomes(learning_outcome_id);

create index if not exists item_curriculum_scopes_unit_idx
  on public.item_curriculum_scopes(unit_id);

create index if not exists skill_outcome_curriculum_mappings_run_outcome_idx
  on public.skill_outcome_curriculum_mappings(reconciliation_id, learning_outcome_id);

create index if not exists item_family_curriculum_reconciliations_run_outcome_idx
  on public.item_family_curriculum_reconciliations(reconciliation_id, primary_learning_outcome_id);
