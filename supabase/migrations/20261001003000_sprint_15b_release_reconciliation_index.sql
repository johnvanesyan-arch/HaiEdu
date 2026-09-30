-- Sprint 15B.1 advisor closure: the composite reconciliation/unit foreign key
-- needs one covering index in the same column order.

drop index if exists public.curriculum_release_reconciliations_run_idx;

create index if not exists curriculum_release_reconciliations_run_unit_idx
  on public.curriculum_release_reconciliations(reconciliation_id, unit_id);
