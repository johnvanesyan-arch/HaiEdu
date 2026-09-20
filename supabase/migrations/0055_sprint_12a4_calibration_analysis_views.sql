-- Sprint 12A.4: provenance-aware, read-only calibration evidence pipeline.
-- These views deliberately retain excluded/context evidence for audit while
-- failing closed for formal calibration eligibility.

create or replace view public.calibration_session_eligibility_v
with (security_invoker = true) as
with operative as (
  select
    c.id as contract_id,
    c.version_label as contract_version,
    c.target_curriculum_release_id,
    c.reference_model_configuration_id,
    m.id as metric_set_id,
    m.version_label as metric_set_version
  from public.calibration_evidence_contracts c
  join public.calibration_metric_sets m on m.reference_contract_id = c.id
  where c.version_label = 'contract-2026-09-20-r2'
    and m.version_label = 'metrics-2026-09-20-r2'
), pilot as (
  select pr.*
  from public.pilot_runs pr
  join operative o on o.target_curriculum_release_id = pr.target_curriculum_release_id
  order by pr.created_at desc
  limit 1
), gates as (
  select
    p.id as pilot_run_id,
    coalesce(bool_and(pg.status = 'passed') filter (where pg.gate_code in ('cohort_enrolled','participation_authorized')), false) as participation_gates_passed,
    coalesce(bool_and(pg.status = 'passed') filter (where pg.gate_stage = 'entry'), false) as all_entry_gates_passed
  from pilot p
  left join public.pilot_gate_checks pg on pg.pilot_run_id = p.id
  group by p.id
), base as (
  select
    o.contract_id, o.contract_version, o.metric_set_id, o.metric_set_version,
    p.id as pilot_run_id, p.run_key, p.status as pilot_status,
    g.participation_gates_passed, g.all_entry_gates_passed,
    s.id as learning_session_id, s.student_id, s.unit_code, s.mode, s.status as session_status,
    s.target_skill_id, s.started_at, s.completed_at, s.answered_count, s.correct_count,
    s.curriculum_release_id, cr.release_key,
    s.assessment_blueprint_id, ab.blueprint_key, ab.purpose as blueprint_purpose,
    s.provenance_status,
    s.learning_model_configuration_id, lm.version_label as model_version, s.model_provenance_status,
    s.runtime_build_id, rb.build_key as runtime_build_key, s.runtime_provenance_status,
    ped.classification, ped.reason_code as classification_reason, ped.rationale as classification_rationale,
    ped.classified_at,
    (s.curriculum_release_id = o.target_curriculum_release_id) as release_matches_contract,
    (ab.curriculum_release_id = s.curriculum_release_id and ab.purpose = s.mode) as blueprint_matches_session,
    (s.learning_model_configuration_id = o.reference_model_configuration_id) as model_matches_contract,
    coalesce((s.metadata ->> 'qa_artifact')::boolean, false) as is_qa_artifact
  from public.learning_sessions s
  cross join operative o
  cross join pilot p
  cross join gates g
  left join public.curriculum_releases cr on cr.id = s.curriculum_release_id
  left join public.assessment_blueprints ab on ab.id = s.assessment_blueprint_id
  left join public.learning_model_configurations lm on lm.id = s.learning_model_configuration_id
  left join public.runtime_builds rb on rb.id = s.runtime_build_id
  left join public.pilot_evidence_detail_v ped
    on ped.pilot_run_id = p.id and ped.learning_session_id = s.id
), judged as (
  select b.*,
    case
      when b.is_qa_artifact or b.classification_reason = 'qa_artifact' then 'qa_artifact'
      when b.classification is null then 'classification_pending'
      when not b.participation_gates_passed then 'participation_gates_blocked'
      when b.classification_reason = 'outside_cohort' then 'outside_cohort'
      when not b.release_matches_contract then 'release_mismatch'
      when not b.blueprint_matches_session then 'blueprint_mismatch'
      when b.provenance_status <> 'exact' then 'session_provenance_not_exact'
      when not b.model_matches_contract or b.model_provenance_status <> 'exact' then 'model_provenance_not_exact'
      when b.runtime_build_id is null or b.runtime_provenance_status <> 'exact' then 'runtime_provenance_not_exact'
      when b.classification <> 'compatible' and b.classification_reason <> 'exact_release_noncompleted' then 'pilot_classification_excluded'
      else 'eligible'
    end as base_eligibility_reason
  from base b
)
select j.*,
  (j.base_eligibility_reason = 'eligible') as base_formal_eligible,
  case
    when j.base_eligibility_reason = 'eligible' then 'core_calibration'
    when j.classification = 'partially_compatible' and not j.is_qa_artifact then 'context_only'
    else 'excluded'
  end as governance_tier,
  (j.base_eligibility_reason = 'eligible' and j.mode = 'practice' and j.session_status in ('completed','active','abandoned')) as practice_burden_eligible,
  (j.base_eligibility_reason = 'eligible' and j.mode = 'practice' and j.session_status in ('completed','active','abandoned')) as mastery_evidence_to_secure_eligible,
  (j.base_eligibility_reason = 'eligible' and j.session_status in ('completed','active','abandoned')) as hint_assistance_effect_eligible,
  (j.base_eligibility_reason = 'eligible' and j.session_status in ('completed','active','abandoned')) as item_difficulty_response_time_eligible,
  (j.base_eligibility_reason = 'eligible' and j.session_status in ('completed','active','abandoned')) as repeat_pool_exhaustion_influence_eligible,
  (j.base_eligibility_reason = 'eligible' and j.session_status in ('completed','active','abandoned')) as threshold_sensitivity_eligible,
  (j.base_eligibility_reason = 'eligible' and j.mode = 'diagnostic' and j.session_status = 'completed') as diagnostic_predictive_alignment_eligible,
  (j.base_eligibility_reason = 'eligible' and j.mode = 'mastery_check' and j.session_status = 'completed') as mastery_check_outcome_eligible,
  (j.base_eligibility_reason = 'eligible' and j.mode = 'mastery_check' and j.session_status = 'completed') as mastery_check_skill_failure_eligible,
  (j.base_eligibility_reason = 'eligible') as recent_recovery_eligible,
  (j.base_eligibility_reason = 'eligible') as recommendation_path_eligible
from judged j;

create or replace view public.calibration_attempt_evidence_v
with (security_invoker = true) as
select
  se.contract_id, se.contract_version, se.metric_set_id, se.metric_set_version,
  se.pilot_run_id, se.run_key, se.governance_tier, se.base_formal_eligible, se.base_eligibility_reason,
  se.learning_session_id, se.student_id, se.unit_code, se.mode, se.session_status,
  se.curriculum_release_id, se.release_key, se.assessment_blueprint_id, se.blueprint_key,
  se.learning_model_configuration_id, se.model_version, se.runtime_build_id, se.runtime_build_key,
  a.id as attempt_id, a.created_at as attempted_at, a.skill_id, sk.code as skill_code,
  a.item_id, i.code as item_code, i.item_template_id, i.item_family, i.difficulty, i.difficulty_band,
  a.correct, a.score, a.error_code, a.hint_used, a.response_time_ms,
  lsi.id as session_item_id, lsi.ordinal, lsi.selection_reason,
  ex.id as exposure_event_id, ex.served_at, ex.family_code, ex.template_code, ex.variant_key,
  (a.curriculum_release_id = se.curriculum_release_id
    and a.assessment_blueprint_id = se.assessment_blueprint_id
    and a.provenance_status = 'exact') as attempt_provenance_exact,
  (ex.id is not null and ex.provenance_status = 'exact') as exposure_provenance_exact,
  (se.item_difficulty_response_time_eligible and a.provenance_status = 'exact') as item_response_formal_eligible,
  case when not se.item_difficulty_response_time_eligible then se.base_eligibility_reason
       when a.provenance_status <> 'exact' then 'attempt_provenance_not_exact' else 'eligible' end as item_response_eligibility_reason,
  (se.repeat_pool_exhaustion_influence_eligible and ex.id is not null and lsi.selection_reason is not null and ex.provenance_status = 'exact') as repeat_pool_formal_eligible,
  case when not se.repeat_pool_exhaustion_influence_eligible then se.base_eligibility_reason
       when ex.id is null or lsi.selection_reason is null then 'selection_telemetry_missing'
       when ex.provenance_status <> 'exact' then 'exposure_provenance_not_exact' else 'eligible' end as repeat_pool_eligibility_reason,
  exists (
    select 1 from public.attempts prior
    where prior.student_id = a.student_id and prior.skill_id = a.skill_id
      and prior.correct = false and prior.created_at < a.created_at
  ) as has_prior_incorrect_attempt
from public.calibration_session_eligibility_v se
join public.attempts a on a.learning_session_id = se.learning_session_id
left join public.learning_session_items lsi on lsi.id = a.learning_session_item_id
left join public.student_item_exposure_events ex on ex.attempt_id = a.id
left join public.items i on i.id = a.item_id
left join public.skills sk on sk.id = a.skill_id;

create or replace view public.calibration_hint_evidence_v
with (security_invoker = true) as
select
  se.contract_id, se.contract_version, se.metric_set_id, se.metric_set_version,
  se.pilot_run_id, se.run_key, se.governance_tier, se.base_eligibility_reason,
  se.learning_session_id, re.student_id, re.id as remediation_event_id, re.created_at as event_at,
  re.session_item_id, re.skill_id, re.item_id, re.stage, re.hint_level,
  re.guide_scope, re.guide_source_id, re.guide_version, re.guide_snapshot_id,
  re.item_template_id, re.error_code,
  (re.guide_snapshot_id is not null and re.rendered_content_hy is not null) as exact_rendered_guide_recorded,
  (se.hint_assistance_effect_eligible and re.guide_snapshot_id is not null and re.rendered_content_hy is not null) as formal_eligible,
  case when not se.hint_assistance_effect_eligible then se.base_eligibility_reason
       when re.guide_snapshot_id is null or re.rendered_content_hy is null then 'exact_guide_snapshot_missing'
       else 'eligible' end as eligibility_reason
from public.remediation_events re
join public.calibration_session_eligibility_v se on se.learning_session_id = re.session_id;

create or replace view public.calibration_recommendation_paths_v
with (security_invoker = true) as
with paths as (
  select
    recommendation_instance_id, student_id,
    min(created_at) filter (where event_type = 'issued') as issued_at,
    min(created_at) filter (where event_type = 'shown') as shown_at,
    min(created_at) filter (where event_type = 'clicked') as clicked_at,
    min(created_at) filter (where event_type = 'action_started') as action_started_at,
    (array_agg(policy_scope order by created_at) filter (where event_type = 'issued'))[1] as policy_scope,
    (array_agg(surface order by created_at) filter (where event_type = 'issued'))[1] as surface,
    (array_agg(action order by created_at) filter (where event_type = 'issued'))[1] as action,
    (array_agg(target_skill_id order by created_at) filter (where event_type = 'issued'))[1] as target_skill_id,
    (array_agg(curriculum_release_id order by created_at) filter (where event_type = 'issued'))[1] as curriculum_release_id,
    (array_agg(assessment_blueprint_id order by created_at) filter (where event_type = 'issued'))[1] as assessment_blueprint_id,
    (array_agg(learning_model_configuration_id order by created_at) filter (where event_type = 'issued'))[1] as learning_model_configuration_id,
    (array_agg(model_provenance_status order by created_at) filter (where event_type = 'issued'))[1] as model_provenance_status,
    (array_agg(learning_session_id order by created_at) filter (where event_type = 'action_started'))[1] as started_session_id,
    count(*) as event_count
  from public.recommendation_events
  group by recommendation_instance_id, student_id
)
select
  o.contract_id, o.contract_version, o.metric_set_id, o.metric_set_version,
  p.*, se.governance_tier, se.base_eligibility_reason,
  (p.issued_at is not null and p.action_started_at is not null
    and p.model_provenance_status = 'exact'
    and p.curriculum_release_id = o.target_curriculum_release_id
    and p.learning_model_configuration_id = o.reference_model_configuration_id
    and coalesce(se.recommendation_path_eligible, false)) as formal_eligible,
  case when p.issued_at is null then 'issued_event_missing'
       when p.action_started_at is null then 'server_confirmed_action_missing'
       when p.model_provenance_status <> 'exact' then 'model_provenance_not_exact'
       when p.curriculum_release_id <> o.target_curriculum_release_id then 'release_mismatch'
       when p.learning_model_configuration_id <> o.reference_model_configuration_id then 'model_mismatch'
       when se.learning_session_id is null then 'started_session_unclassified'
       when not se.recommendation_path_eligible then se.base_eligibility_reason
       else 'eligible' end as eligibility_reason
from paths p
cross join (
  select c.id contract_id, c.version_label contract_version,
         c.target_curriculum_release_id, c.reference_model_configuration_id,
         m.id metric_set_id, m.version_label metric_set_version
  from public.calibration_evidence_contracts c
  join public.calibration_metric_sets m on m.reference_contract_id = c.id
  where c.version_label = 'contract-2026-09-20-r2' and m.version_label = 'metrics-2026-09-20-r2'
) o
left join public.calibration_session_eligibility_v se on se.learning_session_id = p.started_session_id;

create or replace view public.calibration_metric_observations_v
with (security_invoker = true) as
select 'practice_burden'::text metric_key, se.learning_session_id::text observation_id,
  se.student_id, se.learning_session_id, se.target_skill_id skill_id, null::uuid item_id, null::uuid item_template_id,
  se.started_at observed_at, se.governance_tier, se.practice_burden_eligible formal_eligible,
  case when se.practice_burden_eligible then 'eligible' else se.base_eligibility_reason end eligibility_reason,
  (se.session_status <> 'completed') right_censored, se.contract_version, se.metric_set_version, se.release_key, se.blueprint_key, se.model_version, se.runtime_build_key
from public.calibration_session_eligibility_v se where se.mode = 'practice'
union all
select 'mastery_evidence_to_secure', se.learning_session_id::text, se.student_id, se.learning_session_id, se.target_skill_id, null::uuid, null::uuid,
  se.started_at, se.governance_tier, se.mastery_evidence_to_secure_eligible,
  case when se.mastery_evidence_to_secure_eligible then 'eligible' else se.base_eligibility_reason end,
  (se.session_status <> 'completed'), se.contract_version, se.metric_set_version, se.release_key, se.blueprint_key, se.model_version, se.runtime_build_key
from public.calibration_session_eligibility_v se where se.mode = 'practice'
union all
select 'item_difficulty_response_time', ae.attempt_id::text, ae.student_id, ae.learning_session_id, ae.skill_id, ae.item_id, ae.item_template_id,
  ae.attempted_at, ae.governance_tier, ae.item_response_formal_eligible, ae.item_response_eligibility_reason,
  false, ae.contract_version, ae.metric_set_version, ae.release_key, ae.blueprint_key, ae.model_version, ae.runtime_build_key
from public.calibration_attempt_evidence_v ae
union all
select 'repeat_pool_exhaustion_influence', ae.attempt_id::text, ae.student_id, ae.learning_session_id, ae.skill_id, ae.item_id, ae.item_template_id,
  ae.attempted_at, ae.governance_tier, ae.repeat_pool_formal_eligible, ae.repeat_pool_eligibility_reason,
  false, ae.contract_version, ae.metric_set_version, ae.release_key, ae.blueprint_key, ae.model_version, ae.runtime_build_key
from public.calibration_attempt_evidence_v ae
union all
select 'recent_recovery', ae.attempt_id::text, ae.student_id, ae.learning_session_id, ae.skill_id, ae.item_id, ae.item_template_id,
  ae.attempted_at, ae.governance_tier, (ae.base_formal_eligible and ae.has_prior_incorrect_attempt and ae.correct),
  case when not ae.base_formal_eligible then ae.base_eligibility_reason when not ae.has_prior_incorrect_attempt then 'no_prior_failure' when not ae.correct then 'not_recovered' else 'eligible' end,
  false, ae.contract_version, ae.metric_set_version, ae.release_key, ae.blueprint_key, ae.model_version, ae.runtime_build_key
from public.calibration_attempt_evidence_v ae
union all
select 'hint_assistance_effect', he.remediation_event_id::text, he.student_id, he.learning_session_id, he.skill_id, he.item_id, he.item_template_id,
  he.event_at, he.governance_tier, he.formal_eligible, he.eligibility_reason,
  false, he.contract_version, he.metric_set_version, null::text, null::text, null::text, null::text
from public.calibration_hint_evidence_v he
union all
select 'threshold_sensitivity', se.learning_session_id::text, se.student_id, se.learning_session_id, se.target_skill_id, null::uuid, null::uuid,
  se.started_at, se.governance_tier, se.threshold_sensitivity_eligible,
  case when se.threshold_sensitivity_eligible then 'eligible_offline_only' else se.base_eligibility_reason end,
  (se.session_status <> 'completed'), se.contract_version, se.metric_set_version, se.release_key, se.blueprint_key, se.model_version, se.runtime_build_key
from public.calibration_session_eligibility_v se
union all
select 'diagnostic_predictive_alignment', se.learning_session_id::text, se.student_id, se.learning_session_id, se.target_skill_id, null::uuid, null::uuid,
  se.completed_at, se.governance_tier, false,
  case when not se.diagnostic_predictive_alignment_eligible then se.base_eligibility_reason else 'downstream_outcome_required' end,
  false, se.contract_version, se.metric_set_version, se.release_key, se.blueprint_key, se.model_version, se.runtime_build_key
from public.calibration_session_eligibility_v se where se.mode = 'diagnostic'
union all
select 'mastery_check_outcome', se.learning_session_id::text, se.student_id, se.learning_session_id, se.target_skill_id, null::uuid, null::uuid,
  se.completed_at, se.governance_tier, se.mastery_check_outcome_eligible,
  case when se.mastery_check_outcome_eligible then 'eligible' else se.base_eligibility_reason end,
  false, se.contract_version, se.metric_set_version, se.release_key, se.blueprint_key, se.model_version, se.runtime_build_key
from public.calibration_session_eligibility_v se where se.mode = 'mastery_check'
union all
select 'mastery_check_skill_failure', ae.attempt_id::text, ae.student_id, ae.learning_session_id, ae.skill_id, ae.item_id, ae.item_template_id,
  ae.attempted_at, ae.governance_tier, (ae.base_formal_eligible and ae.mode = 'mastery_check' and ae.session_status = 'completed'),
  case when ae.base_formal_eligible and ae.mode = 'mastery_check' and ae.session_status = 'completed' then 'eligible' else ae.base_eligibility_reason end,
  false, ae.contract_version, ae.metric_set_version, ae.release_key, ae.blueprint_key, ae.model_version, ae.runtime_build_key
from public.calibration_attempt_evidence_v ae where ae.mode = 'mastery_check'
union all
select 'recommendation_path', rp.recommendation_instance_id::text, rp.student_id, rp.started_session_id, rp.target_skill_id, null::uuid, null::uuid,
  rp.issued_at, coalesce(rp.governance_tier,'excluded'), rp.formal_eligible, rp.eligibility_reason,
  false, rp.contract_version, rp.metric_set_version, null::text, null::text, null::text, null::text
from public.calibration_recommendation_paths_v rp;

create or replace view public.calibration_metric_sample_summary_v
with (security_invoker = true) as
with metric_catalog(metric_key) as (values
  ('practice_burden'), ('mastery_evidence_to_secure'), ('hint_assistance_effect'),
  ('item_difficulty_response_time'), ('repeat_pool_exhaustion_influence'), ('threshold_sensitivity'),
  ('diagnostic_predictive_alignment'), ('mastery_check_outcome'), ('mastery_check_skill_failure'),
  ('recent_recovery'), ('recommendation_path')
)
select
  mc.metric_key,
  max(o.contract_version) as contract_version,
  max(o.metric_set_version) as metric_set_version,
  count(o.observation_id) as observations_total,
  count(o.observation_id) filter (where o.formal_eligible) as observations_formal,
  count(o.observation_id) filter (where o.governance_tier = 'context_only') as observations_context_only,
  count(o.observation_id) filter (where o.governance_tier = 'excluded') as observations_excluded,
  count(distinct o.student_id) as distinct_learners,
  count(distinct (o.student_id, o.skill_id)) filter (where o.skill_id is not null) as learner_skill_trajectories,
  count(distinct o.learning_session_id) as sessions,
  count(distinct o.skill_id) as skills,
  count(distinct o.item_id) as items,
  count(distinct o.item_template_id) as item_templates,
  min(o.observed_at) as window_start,
  max(o.observed_at) as window_end,
  count(o.observation_id) filter (where o.right_censored) as right_censored_observations,
  coalesce(array_agg(distinct o.release_key) filter (where o.release_key is not null), '{}') as release_keys,
  coalesce(array_agg(distinct o.blueprint_key) filter (where o.blueprint_key is not null), '{}') as blueprint_keys,
  coalesce(array_agg(distinct o.model_version) filter (where o.model_version is not null), '{}') as model_versions,
  coalesce(array_agg(distinct o.runtime_build_key) filter (where o.runtime_build_key is not null), '{}') as runtime_builds
from metric_catalog mc
left join public.calibration_metric_observations_v o on o.metric_key = mc.metric_key
group by mc.metric_key;

comment on view public.calibration_session_eligibility_v is '12A.4 session-level r2 eligibility. Visible-but-excluded, fail-closed, and independent of Sprint 11.5 closure eligibility.';
comment on view public.calibration_attempt_evidence_v is '12A.4 attempt/exposure evidence with immutable provenance and metric-specific eligibility.';
comment on view public.calibration_hint_evidence_v is '12A.4 hint evidence requiring an exact immutable guide snapshot for formal eligibility.';
comment on view public.calibration_recommendation_paths_v is '12A.4 issued→shown→clicked→server-confirmed action_started recommendation paths.';
comment on view public.calibration_metric_observations_v is '12A.4 normalized observation ledger from which metric summaries are reproduced.';
comment on view public.calibration_metric_sample_summary_v is '12A.4 sample-size/provenance summary for every r2 calibration metric; not a tuning decision.';

revoke all on public.calibration_session_eligibility_v from public, anon, authenticated;
revoke all on public.calibration_attempt_evidence_v from public, anon, authenticated;
revoke all on public.calibration_hint_evidence_v from public, anon, authenticated;
revoke all on public.calibration_recommendation_paths_v from public, anon, authenticated;
revoke all on public.calibration_metric_observations_v from public, anon, authenticated;
revoke all on public.calibration_metric_sample_summary_v from public, anon, authenticated;
grant select on public.calibration_session_eligibility_v to service_role;
grant select on public.calibration_attempt_evidence_v to service_role;
grant select on public.calibration_hint_evidence_v to service_role;
grant select on public.calibration_recommendation_paths_v to service_role;
grant select on public.calibration_metric_observations_v to service_role;
grant select on public.calibration_metric_sample_summary_v to service_role;
