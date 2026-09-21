-- Sprint 12A.5 — governed calibration decisions and model versioning.
-- This migration defines the decision protocol. It does not tune or deploy any
-- learning-model parameter.

create table public.calibration_decision_protocols (
  id uuid primary key default gen_random_uuid(),
  protocol_key text not null,
  version_label text not null,
  predecessor_id uuid references public.calibration_decision_protocols(id),
  source_commit text not null check (source_commit ~ '^[0-9a-f]{40}$'),
  rules jsonb not null check (jsonb_typeof(rules) = 'object'),
  notes text,
  frozen_at timestamptz not null default now(),
  protocol_fingerprint text generated always as (
    md5(rules::text || '|' || source_commit)
  ) stored,
  unique (protocol_key, version_label)
);

comment on table public.calibration_decision_protocols is
  'Immutable, versioned governance rules for learning-model calibration decisions.';

alter table public.calibration_decision_protocols enable row level security;
revoke all on public.calibration_decision_protocols from public, anon, authenticated;
revoke update, delete, truncate on public.calibration_decision_protocols from service_role;
grant select, insert on public.calibration_decision_protocols to service_role;

create table public.calibration_change_decisions (
  id uuid primary key default gen_random_uuid(),
  decision_key text not null unique,
  protocol_id uuid not null references public.calibration_decision_protocols(id),
  analysis_scope_id uuid not null references public.calibration_analysis_scopes(id),
  baseline_model_configuration_id uuid not null references public.learning_model_configurations(id),
  approved_model_configuration_id uuid references public.learning_model_configurations(id),
  evidence_cutoff_at timestamptz not null,
  hypothesis text not null check (btrim(hypothesis) <> ''),
  eligible_evidence jsonb not null check (
    jsonb_typeof(eligible_evidence) = 'object'
    and eligible_evidence ?& array[
      'analysisScopeKey','contractVersion','metricSetVersion','pilotRunKey',
      'metricKeys','learnerCount','learnerSkillCount','sessionCount',
      'observationCount','distributionAcrossLearners','provenance'
    ]
  ),
  limitations jsonb not null check (
    jsonb_typeof(limitations) = 'array' and jsonb_array_length(limitations) > 0
  ),
  baseline_behavior jsonb not null check (jsonb_typeof(baseline_behavior) = 'object'),
  candidate_behavior jsonb check (
    candidate_behavior is null or jsonb_typeof(candidate_behavior) = 'object'
  ),
  expected_side_effects jsonb not null check (
    jsonb_typeof(expected_side_effects) = 'array'
  ),
  disposition text not null check (
    disposition in ('approved_change','rejected_change','no_change','deferred')
  ),
  rationale text not null check (btrim(rationale) <> ''),
  decided_by text not null check (btrim(decided_by) <> ''),
  source_commit text not null check (source_commit ~ '^[0-9a-f]{40}$'),
  decided_at timestamptz not null default now(),
  decision_fingerprint text generated always as (
    md5(
      protocol_id::text || '|' || analysis_scope_id::text || '|' ||
      baseline_model_configuration_id::text || '|' ||
      coalesce(approved_model_configuration_id::text, '') || '|' ||
      hypothesis || '|' ||
      eligible_evidence::text || '|' || limitations::text || '|' ||
      baseline_behavior::text || '|' || coalesce(candidate_behavior::text, '') || '|' ||
      expected_side_effects::text || '|' || disposition || '|' || rationale || '|' ||
      decided_by || '|' || source_commit
    )
  ) stored,
  constraint calibration_change_decision_configuration_required check (
    (disposition = 'approved_change' and approved_model_configuration_id is not null and candidate_behavior is not null)
    or
    (disposition <> 'approved_change' and approved_model_configuration_id is null)
  ),
  constraint calibration_change_decision_distinct_models check (
    approved_model_configuration_id is null
    or approved_model_configuration_id <> baseline_model_configuration_id
  )
);

comment on table public.calibration_change_decisions is
  'Append-only calibration dispositions. Insufficient evidence must be recorded as no_change or deferred.';

alter table public.calibration_change_decisions enable row level security;
revoke all on public.calibration_change_decisions from public, anon, authenticated;
revoke update, delete, truncate on public.calibration_change_decisions from service_role;
grant select, insert on public.calibration_change_decisions to service_role;

create index calibration_change_decisions_protocol_idx
  on public.calibration_change_decisions (protocol_id);
create index calibration_change_decisions_scope_idx
  on public.calibration_change_decisions (analysis_scope_id);
create index calibration_change_decisions_baseline_idx
  on public.calibration_change_decisions (baseline_model_configuration_id);
create index calibration_change_decisions_approved_model_idx
  on public.calibration_change_decisions (approved_model_configuration_id)
  where approved_model_configuration_id is not null;

create or replace function public.reject_calibration_governance_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception '% is append-only; insert a new version or decision', tg_table_name;
end;
$$;

revoke all on function public.reject_calibration_governance_mutation()
  from public, anon, authenticated;

create trigger calibration_decision_protocols_immutable
before update or delete on public.calibration_decision_protocols
for each row execute function public.reject_calibration_governance_mutation();

create trigger calibration_change_decisions_immutable
before update or delete on public.calibration_change_decisions
for each row execute function public.reject_calibration_governance_mutation();

create or replace function public.validate_calibration_change_decision()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  scope_row public.calibration_analysis_scopes%rowtype;
  baseline_row public.learning_model_configurations%rowtype;
  approved_row public.learning_model_configurations%rowtype;
  contract_model_id uuid;
  contract_version text;
  metric_set_version text;
  pilot_run_key text;
begin
  select * into scope_row
  from public.calibration_analysis_scopes
  where id = new.analysis_scope_id;

  select c.reference_model_configuration_id, c.version_label, m.version_label, p.run_key
  into contract_model_id, contract_version, metric_set_version, pilot_run_key
  from public.calibration_evidence_contracts c
  join public.calibration_metric_sets m on m.id = scope_row.calibration_metric_set_id
  join public.pilot_runs p on p.id = scope_row.pilot_run_id
  where c.id = scope_row.calibration_evidence_contract_id;

  if contract_model_id is distinct from new.baseline_model_configuration_id then
    raise exception 'decision baseline must match the analysis scope contract baseline';
  end if;

  if new.eligible_evidence ->> 'analysisScopeKey' is distinct from scope_row.scope_key
     or new.eligible_evidence ->> 'contractVersion' is distinct from contract_version
     or new.eligible_evidence ->> 'metricSetVersion' is distinct from metric_set_version
     or new.eligible_evidence ->> 'pilotRunKey' is distinct from pilot_run_key then
    raise exception 'eligible evidence provenance must match the bound analysis scope';
  end if;

  select * into baseline_row
  from public.learning_model_configurations
  where id = new.baseline_model_configuration_id;

  if new.disposition = 'approved_change' then
    select * into approved_row
    from public.learning_model_configurations
    where id = new.approved_model_configuration_id;

    if approved_row.id is null
       or approved_row.configuration_kind <> 'approved'
       or approved_row.predecessor_id is distinct from baseline_row.id
       or approved_row.model_key is distinct from baseline_row.model_key
       or approved_row.reference_curriculum_release_id is distinct from baseline_row.reference_curriculum_release_id
       or approved_row.snapshot_fingerprint = baseline_row.snapshot_fingerprint then
      raise exception 'approved change must reference a distinct approved successor of the reviewed baseline';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.validate_calibration_change_decision()
  from public, anon, authenticated;

create trigger calibration_change_decisions_validate
before insert on public.calibration_change_decisions
for each row execute function public.validate_calibration_change_decision();

insert into public.calibration_decision_protocols (
  protocol_key,
  version_label,
  source_commit,
  rules,
  notes
)
values (
  'haiedu_learning_model_change_decision',
  'protocol-2026-09-21-r1',
  '681052617ac77c7abcfce9ff83a63cba45670539',
  jsonb_build_object(
    'requiredSequence', jsonb_build_array(
      'state_hypothesis',
      'identify_eligible_evidence',
      'report_sample_size_distribution_and_limitations',
      'compare_baseline_and_candidate_behavior',
      'record_expected_side_effects',
      'approve_reject_no_change_or_defer',
      'version_configuration_if_approved',
      'preserve_historical_interpretation'
    ),
    'allowedDispositions', jsonb_build_array(
      'approved_change','rejected_change','no_change','deferred'
    ),
    'evidenceRules', jsonb_build_object(
      'formalR2EvidenceOnly', true,
      'analysisScopeMustBeExplicitAndImmutable', true,
      'metricSpecificSufficiencyRequired', true,
      'learnerClusteringMustBeReported', true,
      'limitationsRequired', true,
      'qaContextCannotAuthorizeTuning', true,
      'noAutomaticApprovalFromCounts', true
    ),
    'comparisonRules', jsonb_build_object(
      'frozenBaselineRequired', true,
      'candidateSimulationMustBeOffline', true,
      'sameEligibleEvidenceForBaselineAndCandidate', true,
      'parameterDiffRequired', true,
      'expectedSideEffectsRequired', true
    ),
    'approvalRules', jsonb_build_object(
      'explicitHumanDecisionRequired', true,
      'approvedChangeRequiresNewImmutableConfiguration', true,
      'approvedConfigurationMustDescendFromReviewedBaseline', true,
      'runtimeDeploymentIsSeparateFromApproval', true,
      'insufficientEvidenceDisposition', jsonb_build_array('no_change','deferred')
    ),
    'historicalInterpretation', jsonb_build_object(
      'existingSessionsKeepOriginalModelAndRuntimeProvenance', true,
      'noBackfillToNewModelVersion', true,
      'newRuntimeActivationRequiresSeparateBuildBinding', true,
      'rollbackCreatesNewForwardRecord', true
    )
  ),
  'Sprint 12A.5 protocol. Defines governance only; no learning parameter is changed.'
);

create view public.calibration_decision_evidence_snapshot_v
with (security_invoker = true) as
with operative as (
  select s.id analysis_scope_id, s.scope_key, c.version_label contract_version,
    m.id metric_set_id, m.version_label metric_set_version, p.run_key pilot_run_key,
    p.status pilot_status, jsonb_object_keys(m.definitions) metric_key
  from public.calibration_analysis_scopes s
  join public.calibration_evidence_contracts c on c.id = s.calibration_evidence_contract_id
  join public.calibration_metric_sets m on m.id = s.calibration_metric_set_id
  join public.pilot_runs p on p.id = s.pilot_run_id
  where s.scope_key = 'physics7-u01-12a4-r2'
), observed as (
  select metric_key,
    count(*) filter (where formal_eligible) formal_observation_count,
    count(distinct student_id) filter (where formal_eligible) learner_count,
    count(distinct (student_id, skill_id)) filter (where formal_eligible) learner_skill_count,
    count(distinct learning_session_id) filter (where formal_eligible) session_count,
    count(distinct skill_id) filter (where formal_eligible) skill_count,
    min(observed_at) filter (where formal_eligible) first_formal_observation_at,
    max(observed_at) filter (where formal_eligible) last_formal_observation_at
  from public.calibration_metric_observations_v
  group by metric_key
)
select o.analysis_scope_id, o.scope_key, o.contract_version, o.metric_set_version,
  o.pilot_run_key, o.pilot_status, o.metric_key,
  coalesce(x.formal_observation_count, 0) formal_observation_count,
  coalesce(x.learner_count, 0) learner_count,
  coalesce(x.learner_skill_count, 0) learner_skill_count,
  coalesce(x.session_count, 0) session_count,
  coalesce(x.skill_count, 0) skill_count,
  x.first_formal_observation_at, x.last_formal_observation_at,
  false automatically_sufficient,
  'human_metric_specific_review_required' sufficiency_status
from operative o
left join observed x on x.metric_key = o.metric_key;

revoke all on public.calibration_decision_evidence_snapshot_v from public, anon, authenticated;
grant select on public.calibration_decision_evidence_snapshot_v to service_role;
