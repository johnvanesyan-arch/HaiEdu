-- Sprint 12A.3 — versioned calibration metric definitions and sample-size reporting rules.
-- These are pilot-analysis governance rules, not psychometric validation thresholds.

create table if not exists public.calibration_metric_sets (
  id uuid primary key default gen_random_uuid(),
  metric_set_key text not null,
  version_label text not null,
  reference_contract_id uuid not null
    references public.calibration_evidence_contracts(id),
  reference_model_configuration_id uuid not null
    references public.learning_model_configurations(id),
  source_commit text not null check (source_commit ~ '^[0-9a-f]{40}$'),
  definitions jsonb not null check (jsonb_typeof(definitions) = 'object'),
  reporting_rules jsonb not null check (jsonb_typeof(reporting_rules) = 'object'),
  notes text,
  frozen_at timestamptz not null default now(),
  metric_set_fingerprint text generated always as (
    md5(definitions::text || '|' || reporting_rules::text || '|' || source_commit)
  ) stored,
  unique (metric_set_key, version_label)
);

comment on table public.calibration_metric_sets is
  'Append-only versioned definitions for Sprint 12 calibration metrics and evidence-size reporting rules.';

alter table public.calibration_metric_sets enable row level security;
revoke all on table public.calibration_metric_sets from anon, authenticated;
grant select, insert on table public.calibration_metric_sets to service_role;

create index if not exists calibration_metric_sets_contract_idx
  on public.calibration_metric_sets (reference_contract_id);

create index if not exists calibration_metric_sets_model_idx
  on public.calibration_metric_sets (reference_model_configuration_id);

create or replace function public.reject_calibration_metric_set_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'calibration_metric_sets is append-only; insert a new version instead';
end;
$$;

drop trigger if exists calibration_metric_sets_immutable
  on public.calibration_metric_sets;

create trigger calibration_metric_sets_immutable
before update or delete on public.calibration_metric_sets
for each row execute function public.reject_calibration_metric_set_mutation();

insert into public.calibration_metric_sets (
  metric_set_key,
  version_label,
  reference_contract_id,
  reference_model_configuration_id,
  source_commit,
  definitions,
  reporting_rules,
  notes
)
select
  'haiedu_learning_model_calibration_metrics',
  'metrics-2026-09-20-r1',
  c.id,
  lmc.id,
  'c4b69ce509c7f0f7e44c64d2042104d8d569a87e',
  jsonb_build_object(
    'mastery_evidence_to_secure', jsonb_build_object(
      'unitOfAnalysis', 'learner_skill_trajectory',
      'purpose', 'Measure attempts, independent correct evidence, hinted evidence and elapsed time required to first reach secure under the frozen model.',
      'method', 'Replay eligible attempts in time order from the frozen prior using blueprint-frozen item version difficulty.',
      'outputs', jsonb_build_array(
        'attempts_to_first_secure',
        'independent_correct_to_first_secure',
        'hinted_attempts_to_first_secure',
        'elapsed_time_to_first_secure',
        'share_never_reaching_secure'
      ),
      'measurability', 'measurable_from_current_provenance'
    ),
    'practice_burden', jsonb_build_object(
      'unitOfAnalysis', 'learner_skill',
      'outputs', jsonb_build_array(
        'practice_sessions',
        'practice_attempts',
        'independent_attempts',
        'hinted_attempts',
        'response_time_sum',
        'completion_reason'
      ),
      'measurability', 'measurable'
    ),
    'recent_recovery_stability', jsonb_build_object(
      'unitOfAnalysis', 'learner_skill_recovery_event',
      'outputs', jsonb_build_array(
        'recovery_frequency',
        'subsequent_independent_correct_rate',
        'later_mastery_check_skill_success_when_available'
      ),
      'stabilityWindow', 'next_3_independent_skill_attempts_or_next_mastery_check_evidence',
      'measurability', 'measurable_when_followup_exists'
    ),
    'hint_assistance_effect', jsonb_build_object(
      'unitOfAnalysis', 'eligible_attempt',
      'outputs', jsonb_build_array(
        'assisted_correct_rate',
        'independent_correct_rate',
        'response_time_by_assistance',
        'next_independent_attempt_correct_rate_after_help'
      ),
      'causalClaimAllowed', false,
      'note', 'Observational comparison only; hint use is learner-selected and confounded by difficulty/need.',
      'measurability', 'measurable'
    ),
    'diagnostic_predictive_alignment', jsonb_build_object(
      'unitOfAnalysis', 'learner_skill',
      'predictor', 'diagnostic_band',
      'outcomes', jsonb_build_array(
        'later_independent_practice_correct_rate',
        'later_secure_status',
        'later_mastery_check_skill_success'
      ),
      'measurability', 'measurable_when_downstream_evidence_exists'
    ),
    'mastery_check_outcome', jsonb_build_object(
      'unitOfAnalysis', 'completed_mastery_check',
      'outputs', jsonb_build_array(
        'pass_rate',
        'score_percent_distribution',
        'retest_rate',
        'retest_outcome_after_remediation'
      ),
      'measurability', 'measurable'
    ),
    'mastery_check_skill_failure', jsonb_build_object(
      'unitOfAnalysis', 'learner_skill_mastery_check_result',
      'outputs', jsonb_build_array(
        'skill_failure_rate',
        'failure_cluster_frequency',
        'post_failure_remediation_attempts'
      ),
      'measurability', 'measurable'
    ),
    'recommendation_path_accuracy', jsonb_build_object(
      'unitOfAnalysis', 'issued_recommendation',
      'outputs', jsonb_build_array(
        'recommendation_follow_rate',
        'downstream_independent_performance',
        'recommendation_changed_after_new_evidence'
      ),
      'measurability', 'instrumentation_gap',
      'gap', 'Recommendation outputs are generated but no durable recommendation-event history records what was issued/shown at a given learner state.',
      'requiredBeforeFormalUse', true
    ),
    'item_difficulty_response_time', jsonb_build_object(
      'unitOfAnalysis', 'item_or_template',
      'outputs', jsonb_build_array(
        'eligible_attempt_count',
        'distinct_learner_count',
        'correct_rate',
        'median_response_time',
        'hint_rate'
      ),
      'provenanceRule', 'Use blueprint-frozen item version identity; do not read mutable current item state as historical truth.',
      'psychometricClaimAllowed', false,
      'measurability', 'measurable'
    ),
    'repeat_pool_exhaustion_influence', jsonb_build_object(
      'unitOfAnalysis', 'eligible_practice_or_assessment_session',
      'outputs', jsonb_build_array(
        'exact_repeat_rate',
        'pool_exhaustion_rate',
        'correct_rate_with_vs_without_prior_exact_exposure',
        'mastery_check_overlap_rate'
      ),
      'causalClaimAllowed', false,
      'measurability', 'measurable'
    ),
    'threshold_sensitivity', jsonb_build_object(
      'unitOfAnalysis', 'eligible_learner_skill_trajectory',
      'outputs', jsonb_build_array(
        'status_changes_under_candidate_thresholds',
        'completion_timing_changes',
        'practice_burden_changes',
        'false_early_completion_review_flags'
      ),
      'method', 'Offline simulation only; candidate thresholds never rewrite stored historical evidence.',
      'measurability', 'measurable_after_core_calibration_evidence_exists'
    )
  ),
  jsonb_build_object(
    'alwaysReport', jsonb_build_array(
      'distinct_learners',
      'sessions',
      'relevant_observations',
      'skills',
      'items_or_templates_when_applicable',
      'time_window',
      'curriculum_release',
      'assessment_blueprints',
      'model_version',
      'evidence_contract_version',
      'evidence_tier'
    ),
    'learnerCountInterpretationBands', jsonb_build_array(
      jsonb_build_object('min', 0, 'max', 0, 'label', 'no_evidence'),
      jsonb_build_object('min', 1, 'max', 4, 'label', 'trace_only_no_aggregate_inference'),
      jsonb_build_object('min', 5, 'max', 9, 'label', 'exploratory_descriptive'),
      jsonb_build_object('min', 10, 'max', 29, 'label', 'pilot_descriptive'),
      jsonb_build_object('min', 30, 'max', null, 'label', 'expanded_pilot_descriptive')
    ),
    'candidateParameterReviewFloor', jsonb_build_object(
      'distinctLearners', 10,
      'relevantObservations', 30,
      'meaning', 'Minimum floor to discuss a candidate change; meeting it is not sufficient for approval or validation.'
    ),
    'itemLevelSparseRule', jsonb_build_object(
      'minimumDistinctLearners', 5,
      'minimumAttempts', 10,
      'belowFloorLabel', 'sparse_item_evidence_no_tuning'
    ),
    'comparisonCellSparseRule', jsonb_build_object(
      'minimumDistinctLearnersPerCell', 5,
      'minimumObservationsPerCell', 10,
      'belowFloorLabel', 'sparse_comparison_no_effect_conclusion'
    ),
    'diagnosticBandSparseRule', jsonb_build_object(
      'minimumDistinctLearnersPerBand', 5,
      'minimumLearnerSkillPairsPerBand', 10,
      'belowFloorLabel', 'sparse_band_no_predictive_conclusion'
    ),
    'masteryCheckSparseRule', jsonb_build_object(
      'minimumCompletedChecks', 10,
      'belowFloorLabel', 'sparse_mastery_check_no_threshold_change'
    ),
    'proportionReporting', jsonb_build_object(
      'reportNumeratorAndDenominator', true,
      'interval', 'wilson_95_percent_when_computed'
    ),
    'continuousReporting', jsonb_build_object(
      'primary', jsonb_build_array('median','interquartile_range'),
      'meanAndStandardDeviationMayBeSecondary', true
    ),
    'governance', jsonb_build_object(
      'bandsArePilotReportingConventionsNotPsychometricValidityThresholds', true,
      'noParameterChangeFromDescriptiveOnlyOrExcludedEvidence', true,
      'meetingMinimumFloorDoesNotAuthorizeChange', true,
      'insufficientEvidenceDisposition', 'no_change_or_defer'
    )
  ),
  'Initial Sprint 12A.3 metric set. Recommendation-path accuracy is intentionally marked as an instrumentation gap rather than retrospectively inferred.'
from public.calibration_evidence_contracts c
join public.learning_model_configurations lmc
  on lmc.id=c.reference_model_configuration_id
where c.contract_key='haiedu_formal_calibration_evidence'
  and c.version_label='contract-2026-09-20-r1'
  and not exists (
    select 1
    from public.calibration_metric_sets existing
    where existing.metric_set_key='haiedu_learning_model_calibration_metrics'
      and existing.version_label='metrics-2026-09-20-r1'
  );
