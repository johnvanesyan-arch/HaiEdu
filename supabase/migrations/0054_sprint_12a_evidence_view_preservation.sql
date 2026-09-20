-- Preserve all previously classified pilot evidence while adding unclassified
-- sessions as visible, fail-closed rows.

create index if not exists learning_model_runtime_bindings_runtime_build_idx
  on public.learning_model_runtime_bindings(runtime_build_id);

create or replace view public.pilot_evidence_detail_v
with (security_invoker=true) as
with classified as (
  select
    pr.id as pilot_run_id,
    pr.run_key,
    target_release.release_key as target_release_key,
    s.id as learning_session_id,
    source_release.release_key as source_release_key,
    s.mode,
    s.status as session_status,
    s.provenance_status,
    pec.classification,
    pec.reason_code,
    pec.rationale,
    pec.classification='compatible'
      and s.curriculum_release_id=pr.target_curriculum_release_id
      and s.provenance_status='exact'
      and s.status='completed'
      and not (s.metadata ? 'qaDisposition')
      and exists(select 1 from public.pilot_gate_checks g where g.pilot_run_id=pr.id and g.gate_code='participation_authorized' and g.status='passed')
      and exists(select 1 from public.pilot_gate_checks g where g.pilot_run_id=pr.id and g.gate_code='cohort_enrolled' and g.status='passed')
      as closure_eligible,
    (select count(*) from public.attempts a where a.learning_session_id=s.id) as attempt_count,
    (select count(*) from public.student_item_exposure_events e where e.session_id=s.id) as exposure_count,
    pec.classified_at,
    false as calibration_eligible,
    'metric_specific_rule_required'::text as calibration_reason
  from public.pilot_evidence_classifications pec
  join public.pilot_runs pr on pr.id=pec.pilot_run_id
  join public.learning_sessions s on s.id=pec.learning_session_id
  join public.curriculum_releases target_release on target_release.id=pr.target_curriculum_release_id
  join public.curriculum_releases source_release on source_release.id=s.curriculum_release_id
),
unclassified as (
  select
    pr.id as pilot_run_id,
    pr.run_key,
    target_release.release_key as target_release_key,
    s.id as learning_session_id,
    source_release.release_key as source_release_key,
    s.mode,
    s.status as session_status,
    s.provenance_status,
    'unclassified'::text as classification,
    'classification_pending'::text as reason_code,
    'Session is visible but excluded until pilot evidence classification is recorded.'::text as rationale,
    false as closure_eligible,
    (select count(*) from public.attempts a where a.learning_session_id=s.id) as attempt_count,
    (select count(*) from public.student_item_exposure_events e where e.session_id=s.id) as exposure_count,
    null::timestamptz as classified_at,
    false as calibration_eligible,
    'classification_pending'::text as calibration_reason
  from public.learning_sessions s
  join public.pilot_runs pr on pr.target_curriculum_release_id=s.curriculum_release_id
  join public.curriculum_releases target_release on target_release.id=pr.target_curriculum_release_id
  join public.curriculum_releases source_release on source_release.id=s.curriculum_release_id
  where not exists (
    select 1 from public.pilot_evidence_classifications pec
    where pec.learning_session_id=s.id
  )
)
select * from classified
union all
select * from unclassified;

revoke all on public.pilot_evidence_detail_v from anon, authenticated;
grant select on public.pilot_evidence_detail_v to service_role;
