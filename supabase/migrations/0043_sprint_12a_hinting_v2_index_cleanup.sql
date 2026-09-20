-- Sprint 12A — remove duplicate remediation-events index introduced by 0042.
drop index if exists public.remediation_events_student_created_idx;
