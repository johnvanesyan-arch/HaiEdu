-- Sprint 12A.5 advisor follow-up.

create index calibration_decision_protocols_predecessor_idx
  on public.calibration_decision_protocols (predecessor_id)
  where predecessor_id is not null;

