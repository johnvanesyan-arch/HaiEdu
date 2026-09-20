-- Sprint 12A — freeze the post-fix learning-model baseline.
-- This migration records the current deployed model as an immutable append-only snapshot.
-- It does not change runtime thresholds or learner behavior.

create table if not exists public.learning_model_configurations (
  id uuid primary key default gen_random_uuid(),
  model_key text not null,
  version_label text not null,
  configuration_kind text not null check (configuration_kind in ('baseline','candidate','approved')),
  predecessor_id uuid references public.learning_model_configurations(id),
  reference_curriculum_release_id uuid references public.curriculum_releases(id),
  source_commit text not null check (source_commit ~ '^[0-9a-f]{40}$'),
  configuration jsonb not null check (jsonb_typeof(configuration) = 'object'),
  deployment_manifest jsonb not null default '{}'::jsonb check (jsonb_typeof(deployment_manifest) = 'object'),
  notes text,
  frozen_at timestamptz not null default now(),
  snapshot_fingerprint text generated always as (
    md5(configuration::text || '|' || deployment_manifest::text || '|' || source_commit)
  ) stored,
  unique (model_key, version_label)
);

comment on table public.learning_model_configurations is
  'Append-only immutable learning-model snapshots used as calibration baselines/candidates.';

comment on column public.learning_model_configurations.snapshot_fingerprint is
  'Deterministic checksum for accidental-change detection; not a cryptographic signature.';

alter table public.learning_model_configurations enable row level security;
revoke all on table public.learning_model_configurations from anon, authenticated;
grant select, insert on table public.learning_model_configurations to service_role;

create or replace function public.reject_learning_model_configuration_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'learning_model_configurations is append-only; insert a new version instead';
end;
$$;

drop trigger if exists learning_model_configurations_immutable
  on public.learning_model_configurations;

create trigger learning_model_configurations_immutable
before update or delete on public.learning_model_configurations
for each row execute function public.reject_learning_model_configuration_mutation();

insert into public.learning_model_configurations (
  model_key,
  version_label,
  configuration_kind,
  reference_curriculum_release_id,
  source_commit,
  configuration,
  deployment_manifest,
  notes
)
select
  'haiedu_core_learning_model',
  'baseline-2026-09-20-r1',
  'baseline',
  cr.id,
  '2b926195d967612ef1a41be3938c7cb0c57fd5c9',
  jsonb_build_object(
    'mastery', jsonb_build_object(
      'priorAlpha', 2,
      'priorBeta', 2,
      'initialScore', 0.5,
      'minimumEvidenceCount', 3,
      'needsSupportBelow', 0.45,
      'secureAtOrAbove', 0.72,
      'difficultyWeight', jsonb_build_object(
        'formula', '0.8 + 0.1*difficulty',
        'difficultyMin', 1,
        'difficultyMax', 5,
        'weightMin', 0.9,
        'weightMax', 1.3
      ),
      'hintedPositiveMultiplier', 0.65,
      'incorrectEvidenceHintReduction', false
    ),
    'practice', jsonb_build_object(
      'plannedSessionLength', 8,
      'desiredDifficultyBands', jsonb_build_array(
        jsonb_build_object('masteryBelow', 0.35, 'difficulty', 1),
        jsonb_build_object('masteryBelow', 0.55, 'difficulty', 2),
        jsonb_build_object('masteryBelow', 0.72, 'difficulty', 3),
        jsonb_build_object('masteryAtOrAbove', 0.72, 'difficulty', 4)
      ),
      'consecutiveWrongAdjustment', jsonb_build_object(
        'oneWrong', -1,
        'twoOrMoreWrong', -2
      ),
      'exactVariantCooldownRecentDistinctVariants', 3,
      'selectionPolicyVersion', '11B-v1',
      'selectionPreference', jsonb_build_array(
        'unseen',
        'spaced_unresolved_error',
        'least_recent_review',
        'explicit_pool_exhaustion_repeat'
      )
    ),
    'recentRecovery', jsonb_build_object(
      'minimumUniqueItems', 4,
      'recentWindow', 5,
      'minimumIndependentCorrect', 4,
      'hintFreeRequired', true
    ),
    'diagnostic', jsonb_build_object(
      'itemsPerSkill', 2,
      'bands', jsonb_build_object(
        'strong', '2/2',
        'developing', '1/2',
        'needs_support', '0/2',
        'not_assessed', 'no evidence'
      ),
      'feedbackMode', 'deferred'
    ),
    'masteryCheck', jsonb_build_object(
      'itemsPerSkill', 2,
      'overallPassPercent', 80,
      'minimumCorrectPerSkill', 1,
      'hintsAllowed', false,
      'selection', 'protected unseen-first / least-exposed',
      'failedRetestRequiresRemediation', true
    ),
    'recommendation', jsonb_build_object(
      'scopeMode', 'dual_scope_baseline',
      'corePolicy', jsonb_build_object(
        'weakWithUnmetPrerequisite', 'review_prerequisite',
        'insufficientEvidence', 'collect_more_evidence',
        'secureWithNextSkill', 'advance_skill',
        'default', 'continue_current_skill'
      ),
      'dashboardPolicy', jsonb_build_object(
        'priorityOrder', jsonb_build_array(
          'resume_active_session',
          'take_diagnostic_if_missing',
          'needs_support_unfinished_skill',
          'developing_unfinished_skill',
          'first_unfinished_skill',
          'unit_complete'
        ),
        'prerequisiteResolution', 'recurse to earliest unmet prerequisite unless prerequisite diagnostic band is strong'
      ),
      'disposition', 'intentionally separate scopes pending later policy-abstraction decision'
    ),
    'hinting', jsonb_build_object(
      'practiceOnly', true,
      'levels', jsonb_build_array('orient','strategy','analogous_worked_example'),
      'preAnswerHelpRequiresBlankDraft', true,
      'postErrorHelpAllowed', true,
      'resolverOrder', jsonb_build_array(
        'error_specific_template',
        'default_template',
        'skill_fallback'
      ),
      'liveAiGeneration', false,
      'independentConfirmationRequired', true
    )
  ),
  jsonb_build_object(
    'sourceCommit', '2b926195d967612ef1a41be3938c7cb0c57fd5c9',
    'functions', jsonb_build_object(
      'submit-answer', 10,
      'start-learning-session', 12,
      'get-session-item', 11,
      'get-student-dashboard', 16,
      'submit-mastery-answer', 4,
      'get-mastery-check-status', 6,
      'get-remediation-help', 5
    ),
    'referenceReleaseKey', cr.release_key,
    'capturedAt', '2026-09-20T20:41:00+04:00'
  ),
  'Frozen post-consistency-fix Sprint 12A baseline. No parameter values changed by this snapshot.'
from public.curriculum_releases cr
where cr.release_key = 'physics7_u01_2026_08_14_pilot_r1'
  and not exists (
    select 1
    from public.learning_model_configurations existing
    where existing.model_key = 'haiedu_core_learning_model'
      and existing.version_label = 'baseline-2026-09-20-r1'
  );
