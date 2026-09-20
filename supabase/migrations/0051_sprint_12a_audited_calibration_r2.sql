-- Sprint 12A audit correction 4 — audited calibration contract/metrics r2.
-- r1 records remain immutable historical drafts; r2 supersedes them for future calibration.

alter table public.calibration_evidence_contracts
  add column if not exists predecessor_id uuid
    references public.calibration_evidence_contracts(id);

create index if not exists calibration_evidence_contracts_predecessor_idx
  on public.calibration_evidence_contracts (predecessor_id)
  where predecessor_id is not null;

alter table public.calibration_metric_sets
  add column if not exists predecessor_id uuid
    references public.calibration_metric_sets(id);

create index if not exists calibration_metric_sets_predecessor_idx
  on public.calibration_metric_sets (predecessor_id)
  where predecessor_id is not null;

insert into public.calibration_evidence_contracts (
  contract_key,
  version_label,
  predecessor_id,
  reference_model_configuration_id,
  target_curriculum_release_id,
  source_commit,
  rules,
  notes
)
select
  'haiedu_formal_calibration_evidence',
  'contract-2026-09-20-r2',
  c1.id,
  lmc.id,
  cr.id,
  '912a827677b2de4f2212ce54b19365e0e7ad4a2b',
  jsonb_build_object(
    'contractPurpose', 'Fail-closed, metric-specific eligibility for learning-model calibration after methodology audit.',
    'supersedes', 'contract-2026-09-20-r1',
    'humanAuthorizationBoundary', jsonb_build_object(
      'contractDoesNotAuthorizeParticipation', true,
      'requiredPassedEntryGates', jsonb_build_array(
        'participation_authorized',
        'cohort_enrolled'
      ),
      'pilotEntryReadyRequired', true,
      'allowedPilotStatusesWithLearnerEvidence', jsonb_build_array(
        'running',
        'observing',
        'closed'
      )
    ),
    'provenanceRequirements', jsonb_build_object(
      'sessionCurriculumReleaseMustMatchContractTarget', true,
      'sessionAssessmentBlueprintMustMatchReleaseAndPurpose', true,
      'sessionProvenanceStatusRequired', 'exact',
      'sessionModelProvenanceStatusRequired', 'exact',
      'sessionModelConfigurationMustMatchReferenceModel', true,
      'recommendationModelProvenanceStatusRequiredForRecommendationMetrics', 'exact',
      'frozenBlueprintMembershipIsAuthoritative', true
    ),
    'broadGovernanceTiers', jsonb_build_object(
      'core_calibration', jsonb_build_object(
        'parameterAnalysisAllowedOnlyPerMetricRule', true,
        'normalLearnerBehaviorRequired', true,
        'explicitCohortAuthorizationRequired', true,
        'exactCurriculumBlueprintAndModelProvenanceRequired', true
      ),
      'context_only', jsonb_build_object(
        'parameterFittingAllowed', false,
        'maySupportOperationalOrQADescription', true
      ),
      'excluded', jsonb_build_object(
        'parameterFittingAllowed', false,
        'reasonCodes', jsonb_build_array(
          'legacy_context_only',
          'release_mismatch',
          'qa_artifact',
          'participation_not_authorized',
          'outside_cohort',
          'manual_review_required'
        ),
        'semanticExclusions', jsonb_build_array(
          'deliberate_content_reviewer_behavior',
          'automation_or_qa_artifact',
          'outside_authorized_cohort',
          'participation_not_authorized',
          'legacy_or_release_mismatch',
          'unresolved_manual_review',
          'unbound_learning_model_provenance'
        )
      )
    ),
    'metricEligibility', jsonb_build_object(
      'mastery_evidence_to_secure', jsonb_build_object(
        'unit', 'learner_skill_trajectory',
        'allowedSessionStatuses', jsonb_build_array('completed','active','abandoned'),
        'rightCensorNonSecureTrajectories', true,
        'doNotDropNonCompleters', true,
        'requiresNormalAuthorizedLearner', true
      ),
      'practice_burden', jsonb_build_object(
        'unit', 'learner_skill',
        'allowedSessionStatuses', jsonb_build_array('completed','active','abandoned'),
        'incompleteSessionsAreValidBurdenEvidence', true
      ),
      'recent_recovery_stability', jsonb_build_object(
        'unit', 'learner_skill_recovery_event',
        'requiresObservedRecoveryEvent', true,
        'requiresEligibleFollowupForStabilityConclusion', true
      ),
      'hint_assistance_effect', jsonb_build_object(
        'unit', 'attempt_with_remediation_context',
        'allowedSessionStatuses', jsonb_build_array('completed','active','abandoned'),
        'attemptLevelEvidenceMayRemainEligibleWhenSessionIsIncomplete', true,
        'requiresExactGuideSnapshotForFormalHintContentAnalysis', true
      ),
      'diagnostic_predictive_alignment', jsonb_build_object(
        'unit', 'learner_skill',
        'requiresCompletedDiagnostic', true,
        'requiresEligibleDownstreamEvidence', true
      ),
      'mastery_check_outcome', jsonb_build_object(
        'unit', 'completed_mastery_check',
        'requiresCompletedMasteryCheck', true
      ),
      'mastery_check_skill_failure', jsonb_build_object(
        'unit', 'learner_skill_mastery_check_result',
        'requiresCompletedMasteryCheck', true
      ),
      'recommendation_path_accuracy', jsonb_build_object(
        'unit', 'recommendation_instance',
        'requiresIssuedEvent', true,
        'shownAndFollowedEventsUsedWhenPresent', true,
        'requiresExactModelProvenance', true,
        'preTelemetryHistoryEligible', false
      ),
      'item_difficulty_response_time', jsonb_build_object(
        'unit', 'eligible_attempt',
        'allowedSessionStatuses', jsonb_build_array('completed','active','abandoned'),
        'attemptLevelEvidenceMayRemainEligibleWhenSessionIsIncomplete', true
      ),
      'repeat_pool_exhaustion_influence', jsonb_build_object(
        'unit', 'eligible_session_or_exposure',
        'allowedSessionStatuses', jsonb_build_array('completed','active','abandoned'),
        'selectionTelemetryRequired', true
      ),
      'threshold_sensitivity', jsonb_build_object(
        'unit', 'learner_skill_trajectory',
        'rightCensorNonSecureTrajectories', true,
        'offlineSimulationOnly', true
      )
    ),
    'hintEvidence', jsonb_build_object(
      'retainHintLevel', true,
      'retainPreAnswerVsPostErrorContext', true,
      'retainTemplateVsSkillScope', true,
      'retainGuideVersionAndSnapshot', true,
      'retainExactRenderedTextForFutureEvents', true,
      'independentAndAssistedPerformanceMustRemainDistinct', true,
      'hintedAttemptsExcludedByDefault', false
    ),
    'contentQA', jsonb_build_object(
      'historicalEligibilitySource', 'frozen blueprint + curriculum/model/session provenance',
      'currentMutableItemStatusMayRetroactivelyExcludeEvidence', false,
      'materialContentDefectRequiresExplicitDisposition', true,
      'rawHistoricalEvidenceMustBePreserved', true
    ),
    'inclusionExclusion', jsonb_build_object(
      'eligibilityIsMetricSpecificNotSessionStatusGlobal', true,
      'everyExcludedSessionRequiresReason', true,
      'noSilentReclassificationFromLaterModelOrCurriculumChanges', true
    ),
    'sampleSufficiency', jsonb_build_object(
      'noUniversalLearnerOrObservationThreshold', true,
      'deferredToMetricSpecificReporting', true,
      'decisionApprovalRemainsSprint12A5', true
    )
  ),
  'Audited r2 contract. Fixes survivorship risk by metric-specific eligibility/right-censoring and requires exact learning-model provenance. Current QA/reviewer evidence remains excluded.'
from public.calibration_evidence_contracts c1
join public.learning_model_configurations lmc
  on lmc.model_key='haiedu_core_learning_model'
 and lmc.version_label='baseline-2026-09-20-r1'
join public.curriculum_releases cr
  on cr.release_key='physics7_u01_2026_08_14_pilot_r1'
where c1.contract_key='haiedu_formal_calibration_evidence'
  and c1.version_label='contract-2026-09-20-r1'
  and not exists (
    select 1 from public.calibration_evidence_contracts c2
    where c2.contract_key='haiedu_formal_calibration_evidence'
      and c2.version_label='contract-2026-09-20-r2'
  );

insert into public.calibration_metric_sets (
  metric_set_key,
  version_label,
  predecessor_id,
  reference_contract_id,
  reference_model_configuration_id,
  source_commit,
  definitions,
  reporting_rules,
  notes
)
select
  'haiedu_learning_model_calibration_metrics',
  'metrics-2026-09-20-r2',
  m1.id,
  c2.id,
  lmc.id,
  '912a827677b2de4f2212ce54b19365e0e7ad4a2b',
  jsonb_build_object(
    'mastery_evidence_to_secure', jsonb_build_object(
      'unitOfAnalysis', 'learner_skill_trajectory',
      'independenceUnit', 'learner',
      'method', 'Replay eligible attempts under the frozen model; retain non-secure trajectories as right-censored rather than dropping them.',
      'outputs', jsonb_build_array(
        'attempts_to_first_secure_when_observed',
        'independent_correct_to_first_secure_when_observed',
        'hinted_attempts_to_first_secure_when_observed',
        'elapsed_time_to_first_secure_when_observed',
        'secure_event_observed',
        'censored_trajectory_count'
      ),
      'survivorshipGuard', true
    ),
    'practice_burden', jsonb_build_object(
      'unitOfAnalysis', 'learner_skill',
      'independenceUnit', 'learner',
      'outputs', jsonb_build_array(
        'practice_sessions',
        'practice_attempts',
        'independent_attempts',
        'hinted_attempts',
        'active_learning_response_time_sum',
        'completion_or_censoring_disposition'
      ),
      'includeIncompleteAuthorizedSessions', true
    ),
    'recent_recovery_stability', jsonb_build_object(
      'unitOfAnalysis', 'learner_skill_recovery_event',
      'independenceUnit', 'learner_skill',
      'outputs', jsonb_build_array(
        'recovery_events',
        'subsequent_independent_correct_rate',
        'later_mastery_check_skill_success_when_available'
      ),
      'followupRequiredForStabilityConclusion', true
    ),
    'hint_assistance_effect', jsonb_build_object(
      'unitOfAnalysis', 'learner_skill_attempt',
      'independenceUnit', 'learner',
      'stratifyBy', jsonb_build_array(
        'hint_level_1_2_3',
        'pre_answer_vs_post_error',
        'template_vs_skill_guide',
        'task_specific_vs_fallback',
        'guide_version'
      ),
      'outputs', jsonb_build_array(
        'assisted_correct_rate',
        'next_independent_attempt_correct_rate',
        'independent_recovery_after_help',
        'worked_example_followup_success'
      ),
      'causalClaimAllowed', false,
      'note', 'Hint use is learner-selected and confounded by difficulty/need; report associations only.'
    ),
    'diagnostic_predictive_alignment', jsonb_build_object(
      'unitOfAnalysis', 'learner_skill',
      'independenceUnit', 'learner',
      'predictor', 'diagnostic_band',
      'outcomes', jsonb_build_array(
        'later_independent_practice_correct_rate',
        'later_secure_event',
        'later_mastery_check_skill_success'
      )
    ),
    'mastery_check_outcome', jsonb_build_object(
      'unitOfAnalysis', 'completed_mastery_check',
      'independenceUnit', 'learner',
      'outputs', jsonb_build_array(
        'pass_rate',
        'score_percent_distribution',
        'retest_rate',
        'retest_outcome_after_remediation'
      )
    ),
    'mastery_check_skill_failure', jsonb_build_object(
      'unitOfAnalysis', 'learner_skill_mastery_check_result',
      'independenceUnit', 'learner',
      'outputs', jsonb_build_array(
        'skill_failure_rate',
        'failure_cluster_frequency',
        'post_failure_remediation_attempts'
      )
    ),
    'recommendation_path_accuracy', jsonb_build_object(
      'unitOfAnalysis', 'recommendation_instance',
      'independenceUnit', 'learner',
      'policyScopes', jsonb_build_array('dashboard_orchestration','core_after_attempt'),
      'outputs', jsonb_build_array(
        'issued_count',
        'shown_rate',
        'follow_rate',
        'followed_target_skill',
        'downstream_independent_performance',
        'recommendation_changed_after_new_evidence'
      ),
      'measurability', 'measurable_for_new_evidence_after_telemetry_activation',
      'historicalPreTelemetryInferenceAllowed', false
    ),
    'item_difficulty_response_time', jsonb_build_object(
      'unitOfAnalysis', 'item_or_template',
      'independenceUnit', 'learner',
      'outputs', jsonb_build_array(
        'distinct_learner_count',
        'attempt_count',
        'learner_aggregated_correct_rate',
        'median_response_time',
        'hint_rate'
      ),
      'responseTimeInterpretation', 'operational_signal_only_not_direct_cognitive_difficulty',
      'psychometricClaimAllowed', false
    ),
    'repeat_pool_exhaustion_influence', jsonb_build_object(
      'unitOfAnalysis', 'learner_session',
      'independenceUnit', 'learner',
      'outputs', jsonb_build_array(
        'exact_repeat_rate',
        'pool_exhaustion_rate',
        'learner_aggregated_correct_rate_with_vs_without_prior_exact_exposure',
        'mastery_check_overlap_rate'
      ),
      'causalClaimAllowed', false
    ),
    'threshold_sensitivity', jsonb_build_object(
      'unitOfAnalysis', 'learner_skill_trajectory',
      'independenceUnit', 'learner',
      'outputs', jsonb_build_array(
        'status_changes_under_candidate_thresholds',
        'completion_timing_changes',
        'practice_burden_changes',
        'early_completion_review_flags',
        'censored_trajectory_behavior'
      ),
      'method', 'Offline simulation only; candidate thresholds never rewrite stored historical evidence.'
    )
  ),
  jsonb_build_object(
    'alwaysReport', jsonb_build_array(
      'distinct_learners',
      'learner_skill_trajectories',
      'sessions',
      'attempts_or_metric_observations',
      'skills_represented',
      'items_or_templates_when_applicable',
      'time_window',
      'curriculum_release',
      'assessment_blueprints',
      'model_version',
      'evidence_contract_version',
      'metric_eligibility_rule'
    ),
    'noUniversalCandidateChangeFloor', true,
    'hierarchicalEvidenceRule', jsonb_build_object(
      'rawAttemptsAreNotIndependentLearners', true,
      'primaryAggregationShouldRespectLearnerClustering', true,
      'learnerSkillPairsMustBeReportedWhereRelevant', true,
      'skillRepresentationMustBeVisible', true
    ),
    'proportionReporting', jsonb_build_object(
      'reportNumeratorAndDenominator', true,
      'universalWilsonIntervalRequired', false,
      'intervalMethodMustMatchAnalysisUnitAndClustering', true
    ),
    'continuousReporting', jsonb_build_object(
      'primary', jsonb_build_array('median','interquartile_range'),
      'preferLearnerLevelOrLearnerSkillAggregationBeforeGroupSummary', true
    ),
    'sufficiencyDecision', jsonb_build_object(
      'metricSpecific', true,
      'considerLearnerCount', true,
      'considerLearnerSkillCount', true,
      'considerSkillCoverage', true,
      'considerObservationDistributionAcrossLearners', true,
      'considerFollowupCompleteness', true,
      'noSingleNumericThresholdAuthorizesTuning', true,
      'approvalRemainsSprint12A5', true
    ),
    'governance', jsonb_build_object(
      'noParameterChangeFromContextOnlyOrExcludedEvidence', true,
      'insufficientEvidenceDisposition', 'no_change_or_defer',
      'smallPilotResultsAreNotPsychometricValidation', true
    )
  ),
  'Audited r2 metrics. Removes universal 10+30/Wilson rules, respects learner clustering/right-censoring, expands Hinting v2 analysis, and activates recommendation metrics only prospectively.'
from public.calibration_metric_sets m1
join public.calibration_evidence_contracts c2
  on c2.contract_key='haiedu_formal_calibration_evidence'
 and c2.version_label='contract-2026-09-20-r2'
join public.learning_model_configurations lmc
  on lmc.id=c2.reference_model_configuration_id
where m1.metric_set_key='haiedu_learning_model_calibration_metrics'
  and m1.version_label='metrics-2026-09-20-r1'
  and not exists (
    select 1 from public.calibration_metric_sets m2
    where m2.metric_set_key='haiedu_learning_model_calibration_metrics'
      and m2.version_label='metrics-2026-09-20-r2'
  );
