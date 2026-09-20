-- Sprint 12A.2 — versioned formal calibration evidence contract.
-- Defines eligibility semantics only. It does not authorize participants, enroll a cohort,
-- tune parameters, or create the Sprint 12A.4 analysis pipeline.

create table if not exists public.calibration_evidence_contracts (
  id uuid primary key default gen_random_uuid(),
  contract_key text not null,
  version_label text not null,
  reference_model_configuration_id uuid not null
    references public.learning_model_configurations(id),
  target_curriculum_release_id uuid not null
    references public.curriculum_releases(id),
  source_commit text not null check (source_commit ~ '^[0-9a-f]{40}$'),
  rules jsonb not null check (jsonb_typeof(rules) = 'object'),
  notes text,
  frozen_at timestamptz not null default now(),
  contract_fingerprint text generated always as (
    md5(rules::text || '|' || source_commit)
  ) stored,
  unique (contract_key, version_label)
);

comment on table public.calibration_evidence_contracts is
  'Append-only, fail-closed contracts defining which pilot evidence may enter calibration analyses.';

comment on column public.calibration_evidence_contracts.contract_fingerprint is
  'Deterministic checksum for accidental-change detection; not a cryptographic signature.';

alter table public.calibration_evidence_contracts enable row level security;
revoke all on table public.calibration_evidence_contracts from anon, authenticated;
grant select, insert on table public.calibration_evidence_contracts to service_role;

create index if not exists calibration_evidence_contracts_model_idx
  on public.calibration_evidence_contracts (reference_model_configuration_id);

create index if not exists calibration_evidence_contracts_release_idx
  on public.calibration_evidence_contracts (target_curriculum_release_id);

create or replace function public.reject_calibration_evidence_contract_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'calibration_evidence_contracts is append-only; insert a new version instead';
end;
$$;

drop trigger if exists calibration_evidence_contracts_immutable
  on public.calibration_evidence_contracts;

create trigger calibration_evidence_contracts_immutable
before update or delete on public.calibration_evidence_contracts
for each row execute function public.reject_calibration_evidence_contract_mutation();

insert into public.calibration_evidence_contracts (
  contract_key,
  version_label,
  reference_model_configuration_id,
  target_curriculum_release_id,
  source_commit,
  rules,
  notes
)
select
  'haiedu_formal_calibration_evidence',
  'contract-2026-09-20-r1',
  lmc.id,
  cr.id,
  '63ac02c4c11419dfd54a6b1ce9042ecbf046b718',
  jsonb_build_object(
    'contractPurpose', 'Define fail-closed evidence eligibility for learning-model calibration.',
    'parameterFittingTier', 'core_calibration',
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
    'releaseAndBlueprint', jsonb_build_object(
      'sessionReleaseMustEqualPilotTargetRelease', true,
      'sessionReleaseMustEqualContractTargetRelease', true,
      'sessionProvenanceStatusRequired', 'exact',
      'assessmentBlueprintRequired', true,
      'blueprintReleaseMustMatchSessionRelease', true,
      'allowedPurposes', jsonb_build_array(
        'diagnostic',
        'practice',
        'mastery_check'
      ),
      'frozenBlueprintMembershipIsAuthoritative', true
    ),
    'tiers', jsonb_build_object(
      'core_calibration', jsonb_build_object(
        'parameterFittingAllowed', true,
        'classificationRequired', 'compatible',
        'reasonCodeRequired', 'exact_release_completed',
        'sessionStatusRequired', 'completed',
        'normalLearnerBehaviorRequired', true,
        'explicitCohortAuthorizationRequired', true,
        'exactReleaseAndBlueprintRequired', true
      ),
      'descriptive_only', jsonb_build_object(
        'parameterFittingAllowed', false,
        'purpose', 'Operational burden, abandonment and workflow description only.',
        'allowedReasonCodes', jsonb_build_array(
          'exact_release_noncompleted'
        ),
        'exactReleaseAndBlueprintRequired', true,
        'explicitCohortAuthorizationRequired', true
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
          'unresolved_manual_review'
        )
      )
    ),
    'attemptAndExposureEvidence', jsonb_build_object(
      'retainPurpose', true,
      'retainHintHelpUse', true,
      'retainResponseTime', true,
      'retainItemFamilyTemplateVariantIdentity', true,
      'retainExposureHistory', true,
      'hintedAttemptsExcludedByDefault', false,
      'independentAndAssistedPerformanceMustRemainDistinguishable', true
    ),
    'sessionDisposition', jsonb_build_object(
      'completedRequiredForCoreCalibration', true,
      'noncompletedMayBeDescriptiveOnly', true,
      'abandonedOrActiveNeverParameterFitting', true
    ),
    'contentQA', jsonb_build_object(
      'historicalEligibilitySource', 'frozen_blueprint_membership_and_session_provenance',
      'currentMutableItemStatusMayRetroactivelyExcludeEvidence', false,
      'materialContentDefectRequiresExplicitDisposition', true,
      'rawHistoricalEvidenceMustBePreserved', true
    ),
    'inclusionExclusion', jsonb_build_object(
      'everyExcludedSessionRequiresReason', true,
      'classificationAndReasonMustRemainAuditable', true,
      'noSilentReclassificationFromLaterModelOrCurriculumChanges', true
    ),
    'sampleSufficiency', jsonb_build_object(
      'definedHere', false,
      'deferredTo', 'Sprint 12A.3 calibration metrics and sample-size reporting rules'
    )
  ),
  'Initial formal calibration evidence contract. Current exact-release QA/outside-cohort evidence remains excluded. Human participation authorization remains Sprint 11.5 work.'
from public.learning_model_configurations lmc
join public.curriculum_releases cr
  on cr.release_key = 'physics7_u01_2026_08_14_pilot_r1'
where lmc.model_key = 'haiedu_core_learning_model'
  and lmc.version_label = 'baseline-2026-09-20-r1'
  and not exists (
    select 1
    from public.calibration_evidence_contracts existing
    where existing.contract_key = 'haiedu_formal_calibration_evidence'
      and existing.version_label = 'contract-2026-09-20-r1'
  );
