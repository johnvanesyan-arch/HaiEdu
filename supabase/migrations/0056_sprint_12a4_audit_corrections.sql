-- Sprint 12A.4 closure-audit corrections.
-- Pins the analysis to an immutable pilot scope, fully enforces the r2 human
-- authorization boundary, and adds analysis-ready learner/learner-skill views.

create table if not exists public.calibration_analysis_scopes (
  id uuid primary key default gen_random_uuid(),
  scope_key text not null unique,
  calibration_evidence_contract_id uuid not null references public.calibration_evidence_contracts(id),
  calibration_metric_set_id uuid not null references public.calibration_metric_sets(id),
  pilot_run_id uuid not null references public.pilot_runs(id),
  notes text,
  frozen_at timestamptz not null default now(),
  constraint calibration_analysis_scope_versions_unique unique
    (calibration_evidence_contract_id, calibration_metric_set_id, pilot_run_id)
);

alter table public.calibration_analysis_scopes enable row level security;
revoke all on public.calibration_analysis_scopes from public, anon, authenticated;
revoke update, delete, truncate on public.calibration_analysis_scopes from service_role;
grant select, insert on public.calibration_analysis_scopes to service_role;

create or replace function public.reject_calibration_analysis_scope_mutation()
returns trigger language plpgsql set search_path = public as $$
begin
  raise exception 'calibration analysis scopes are immutable';
end;
$$;
revoke all on function public.reject_calibration_analysis_scope_mutation() from public, anon, authenticated;

drop trigger if exists calibration_analysis_scopes_immutable on public.calibration_analysis_scopes;
create trigger calibration_analysis_scopes_immutable
before update or delete on public.calibration_analysis_scopes
for each row execute function public.reject_calibration_analysis_scope_mutation();

insert into public.calibration_analysis_scopes
  (scope_key, calibration_evidence_contract_id, calibration_metric_set_id, pilot_run_id, notes)
select
  'physics7-u01-12a4-r2', c.id, m.id, p.id,
  'Immutable 12A.4 analysis binding. A later pilot requires a new scope version, never latest-run selection.'
from public.calibration_evidence_contracts c
join public.calibration_metric_sets m on m.reference_contract_id = c.id
join public.pilot_runs p on p.run_key = 'sprint_11l_physics7_chapter1_pilot'
where c.version_label = 'contract-2026-09-20-r2'
  and m.version_label = 'metrics-2026-09-20-r2'
on conflict (scope_key) do nothing;

drop view if exists public.calibration_metric_sample_summary_v cascade;
drop view if exists public.calibration_metric_observations_v cascade;
drop view if exists public.calibration_recommendation_paths_v cascade;
drop view if exists public.calibration_hint_evidence_v cascade;
drop view if exists public.calibration_attempt_evidence_v cascade;
drop view if exists public.calibration_session_eligibility_v cascade;

create or replace view public.calibration_session_eligibility_v
with (security_invoker = true) as
with operative as (
  select
    s.id analysis_scope_id, s.scope_key,
    c.id contract_id, c.version_label contract_version,
    c.target_curriculum_release_id, c.reference_model_configuration_id,
    m.id metric_set_id, m.version_label metric_set_version,
    p.id pilot_run_id, p.run_key, p.status pilot_status
  from public.calibration_analysis_scopes s
  join public.calibration_evidence_contracts c on c.id = s.calibration_evidence_contract_id
  join public.calibration_metric_sets m on m.id = s.calibration_metric_set_id
  join public.pilot_runs p on p.id = s.pilot_run_id
  where s.scope_key = 'physics7-u01-12a4-r2'
), gates as (
  select o.pilot_run_id,
    coalesce(bool_and(pg.status = 'passed') filter (where pg.gate_stage = 'entry'), false) all_entry_gates_passed,
    coalesce(bool_and(pg.status = 'passed') filter (where pg.gate_code in ('cohort_enrolled','participation_authorized')), false) required_human_gates_passed,
    coalesce(jsonb_object_agg(pg.gate_code, pg.status) filter (where pg.gate_code is not null), '{}'::jsonb) gate_statuses
  from operative o left join public.pilot_gate_checks pg on pg.pilot_run_id = o.pilot_run_id
  group by o.pilot_run_id
), base as (
  select
    o.analysis_scope_id, o.scope_key, o.contract_id, o.contract_version,
    o.metric_set_id, o.metric_set_version, o.pilot_run_id, o.run_key, o.pilot_status,
    g.all_entry_gates_passed, g.required_human_gates_passed, g.gate_statuses,
    ls.id learning_session_id, ls.student_id, ls.unit_code, ls.mode, ls.status session_status,
    ls.target_skill_id, ls.started_at, ls.completed_at, ls.answered_count, ls.correct_count,
    ls.curriculum_release_id, cr.release_key, ls.assessment_blueprint_id,
    ab.blueprint_key, ab.purpose blueprint_purpose, ls.provenance_status,
    ls.learning_model_configuration_id, lm.version_label model_version, ls.model_provenance_status,
    ls.runtime_build_id, rb.build_key runtime_build_key, ls.runtime_provenance_status,
    ped.classification, ped.reason_code classification_reason, ped.rationale classification_rationale, ped.classified_at,
    (ls.curriculum_release_id = o.target_curriculum_release_id) release_matches_contract,
    (ab.curriculum_release_id = ls.curriculum_release_id and ab.purpose = ls.mode) blueprint_matches_session,
    (ls.learning_model_configuration_id = o.reference_model_configuration_id) model_matches_contract,
    coalesce((ls.metadata ->> 'qa_artifact')::boolean, false) is_qa_artifact
  from public.learning_sessions ls cross join operative o cross join gates g
  left join public.curriculum_releases cr on cr.id = ls.curriculum_release_id
  left join public.assessment_blueprints ab on ab.id = ls.assessment_blueprint_id
  left join public.learning_model_configurations lm on lm.id = ls.learning_model_configuration_id
  left join public.runtime_builds rb on rb.id = ls.runtime_build_id
  left join public.pilot_evidence_detail_v ped on ped.pilot_run_id = o.pilot_run_id and ped.learning_session_id = ls.id
), reasons as (
  select b.*,
    (b.classification is null) classification_pending,
    array_remove(array[
      case when b.classification is null then 'classification_pending' end,
      case when b.is_qa_artifact or b.classification_reason = 'qa_artifact' then 'qa_artifact' end,
      case when b.pilot_status not in ('running','observing','closed') then 'pilot_status_not_allowed' end,
      case when not b.all_entry_gates_passed then 'pilot_entry_not_ready' end,
      case when not b.required_human_gates_passed then 'participation_gates_blocked' end,
      case when b.classification_reason = 'outside_cohort' then 'outside_cohort' end,
      case when not b.release_matches_contract then 'release_mismatch' end,
      case when not b.blueprint_matches_session then 'blueprint_mismatch' end,
      case when b.provenance_status <> 'exact' then 'session_provenance_not_exact' end,
      case when not b.model_matches_contract or b.model_provenance_status <> 'exact' then 'model_provenance_not_exact' end,
      case when b.runtime_build_id is null or b.runtime_provenance_status <> 'exact' then 'runtime_provenance_not_exact' end,
      case when b.classification is not null and b.classification <> 'compatible'
             and b.classification_reason <> 'exact_release_noncompleted' then 'pilot_classification_excluded' end
    ], null) exclusion_reasons
  from base b
), judged as (
  select r.*,
    case
      when r.classification_pending then 'classification_pending'
      when r.is_qa_artifact or r.classification_reason = 'qa_artifact' then 'qa_artifact'
      when r.pilot_status not in ('running','observing','closed') then 'pilot_status_not_allowed'
      when not r.all_entry_gates_passed then 'pilot_entry_not_ready'
      when not r.required_human_gates_passed then 'participation_gates_blocked'
      when r.classification_reason = 'outside_cohort' then 'outside_cohort'
      when not r.release_matches_contract then 'release_mismatch'
      when not r.blueprint_matches_session then 'blueprint_mismatch'
      when r.provenance_status <> 'exact' then 'session_provenance_not_exact'
      when not r.model_matches_contract or r.model_provenance_status <> 'exact' then 'model_provenance_not_exact'
      when r.runtime_build_id is null or r.runtime_provenance_status <> 'exact' then 'runtime_provenance_not_exact'
      when r.classification <> 'compatible' and r.classification_reason <> 'exact_release_noncompleted' then 'pilot_classification_excluded'
      else 'eligible'
    end base_eligibility_reason
  from reasons r
)
select j.*,
  (j.base_eligibility_reason = 'eligible') base_formal_eligible,
  case when j.base_eligibility_reason = 'eligible' then 'core_calibration'
       when j.classification = 'partially_compatible' and not j.is_qa_artifact then 'context_only'
       else 'excluded' end governance_tier,
  (j.base_eligibility_reason = 'eligible' and j.mode='practice' and j.session_status in ('completed','active','abandoned')) practice_burden_eligible,
  (j.base_eligibility_reason = 'eligible' and j.mode='practice' and j.session_status in ('completed','active','abandoned')) mastery_evidence_to_secure_eligible,
  (j.base_eligibility_reason = 'eligible' and j.session_status in ('completed','active','abandoned')) hint_assistance_effect_eligible,
  (j.base_eligibility_reason = 'eligible' and j.session_status in ('completed','active','abandoned')) item_difficulty_response_time_eligible,
  (j.base_eligibility_reason = 'eligible' and j.session_status in ('completed','active','abandoned')) repeat_pool_exhaustion_influence_eligible,
  (j.base_eligibility_reason = 'eligible' and j.session_status in ('completed','active','abandoned')) threshold_sensitivity_eligible,
  (j.base_eligibility_reason = 'eligible' and j.mode='diagnostic' and j.session_status='completed') diagnostic_predictive_alignment_eligible,
  (j.base_eligibility_reason = 'eligible' and j.mode='mastery_check' and j.session_status='completed') mastery_check_outcome_eligible,
  (j.base_eligibility_reason = 'eligible' and j.mode='mastery_check' and j.session_status='completed') mastery_check_skill_failure_eligible,
  (j.base_eligibility_reason = 'eligible') recent_recovery_stability_eligible,
  (j.base_eligibility_reason = 'eligible') recommendation_path_accuracy_eligible
from judged j;

create view public.calibration_attempt_evidence_v
with (security_invoker = true) as
select se.contract_id,se.contract_version,se.metric_set_id,se.metric_set_version,se.pilot_run_id,se.run_key,
 se.governance_tier,se.base_formal_eligible,se.base_eligibility_reason,se.learning_session_id,se.student_id,
 se.unit_code,se.mode,se.session_status,se.curriculum_release_id,se.release_key,se.assessment_blueprint_id,se.blueprint_key,
 se.learning_model_configuration_id,se.model_version,se.runtime_build_id,se.runtime_build_key,
 a.id attempt_id,a.created_at attempted_at,a.skill_id,sk.code skill_code,a.item_id,i.code item_code,
 i.item_template_id,i.item_family,i.difficulty,i.difficulty_band,a.correct,a.score,a.error_code,a.hint_used,a.response_time_ms,
 lsi.id session_item_id,lsi.ordinal,lsi.selection_reason,ex.id exposure_event_id,ex.served_at,ex.family_code,ex.template_code,ex.variant_key,
 (a.curriculum_release_id=se.curriculum_release_id and a.assessment_blueprint_id=se.assessment_blueprint_id and a.provenance_status='exact') attempt_provenance_exact,
 (ex.id is not null and ex.provenance_status='exact') exposure_provenance_exact,
 (se.item_difficulty_response_time_eligible and a.provenance_status='exact') item_response_formal_eligible,
 case when not se.item_difficulty_response_time_eligible then se.base_eligibility_reason when a.provenance_status<>'exact' then 'attempt_provenance_not_exact' else 'eligible' end item_response_eligibility_reason,
 (se.repeat_pool_exhaustion_influence_eligible and ex.id is not null and lsi.selection_reason is not null and ex.provenance_status='exact') repeat_pool_formal_eligible,
 case when not se.repeat_pool_exhaustion_influence_eligible then se.base_eligibility_reason when ex.id is null or lsi.selection_reason is null then 'selection_telemetry_missing' when ex.provenance_status<>'exact' then 'exposure_provenance_not_exact' else 'eligible' end repeat_pool_eligibility_reason,
 exists(select 1 from public.attempts prior where prior.student_id=a.student_id and prior.skill_id=a.skill_id and not prior.correct and prior.created_at<a.created_at) has_prior_incorrect_attempt
from public.calibration_session_eligibility_v se
join public.attempts a on a.learning_session_id=se.learning_session_id
left join public.learning_session_items lsi on lsi.id=a.learning_session_item_id
left join public.student_item_exposure_events ex on ex.attempt_id=a.id
left join public.items i on i.id=a.item_id left join public.skills sk on sk.id=a.skill_id;

create view public.calibration_hint_evidence_v
with (security_invoker = true) as
select se.contract_id,se.contract_version,se.metric_set_id,se.metric_set_version,se.pilot_run_id,se.run_key,
 se.governance_tier,se.base_eligibility_reason,se.learning_session_id,re.student_id,re.id remediation_event_id,
 re.created_at event_at,re.session_item_id,re.skill_id,re.item_id,re.stage,re.hint_level,re.guide_scope,
 re.guide_source_id,re.guide_version,re.guide_snapshot_id,re.item_template_id,re.error_code,
 (re.guide_snapshot_id is not null and re.rendered_content_hy is not null) exact_rendered_guide_recorded,
 (se.hint_assistance_effect_eligible and re.guide_snapshot_id is not null and re.rendered_content_hy is not null) formal_eligible,
 case when not se.hint_assistance_effect_eligible then se.base_eligibility_reason when re.guide_snapshot_id is null or re.rendered_content_hy is null then 'exact_guide_snapshot_missing' else 'eligible' end eligibility_reason
from public.remediation_events re join public.calibration_session_eligibility_v se on se.learning_session_id=re.session_id;

create view public.calibration_recommendation_paths_v
with (security_invoker = true) as
with paths as (
 select recommendation_instance_id,student_id,min(created_at) filter(where event_type='issued') issued_at,
  min(created_at) filter(where event_type='shown') shown_at,min(created_at) filter(where event_type='clicked') clicked_at,
  min(created_at) filter(where event_type='action_started') action_started_at,
  (array_agg(policy_scope order by created_at) filter(where event_type='issued'))[1] policy_scope,
  (array_agg(surface order by created_at) filter(where event_type='issued'))[1] surface,
  (array_agg(action order by created_at) filter(where event_type='issued'))[1] action,
  (array_agg(target_skill_id order by created_at) filter(where event_type='issued'))[1] target_skill_id,
  (array_agg(curriculum_release_id order by created_at) filter(where event_type='issued'))[1] curriculum_release_id,
  (array_agg(assessment_blueprint_id order by created_at) filter(where event_type='issued'))[1] assessment_blueprint_id,
  (array_agg(learning_model_configuration_id order by created_at) filter(where event_type='issued'))[1] learning_model_configuration_id,
  (array_agg(model_provenance_status order by created_at) filter(where event_type='issued'))[1] model_provenance_status,
  (array_agg(learning_session_id order by created_at) filter(where event_type='action_started'))[1] started_session_id,count(*) event_count
 from public.recommendation_events group by recommendation_instance_id,student_id
), operative as (
 select c.id contract_id,c.version_label contract_version,c.target_curriculum_release_id,c.reference_model_configuration_id,
  m.id metric_set_id,m.version_label metric_set_version
 from public.calibration_analysis_scopes s join public.calibration_evidence_contracts c on c.id=s.calibration_evidence_contract_id
 join public.calibration_metric_sets m on m.id=s.calibration_metric_set_id where s.scope_key='physics7-u01-12a4-r2'
)
select o.contract_id,o.contract_version,o.metric_set_id,o.metric_set_version,p.*,se.governance_tier,se.base_eligibility_reason,
 (p.issued_at is not null and p.action_started_at is not null and p.model_provenance_status='exact'
  and p.curriculum_release_id=o.target_curriculum_release_id and p.learning_model_configuration_id=o.reference_model_configuration_id
  and coalesce(se.recommendation_path_accuracy_eligible,false)) formal_eligible,
 case when p.issued_at is null then 'issued_event_missing' when p.action_started_at is null then 'server_confirmed_action_missing'
  when p.model_provenance_status<>'exact' then 'model_provenance_not_exact' when p.curriculum_release_id<>o.target_curriculum_release_id then 'release_mismatch'
  when p.learning_model_configuration_id<>o.reference_model_configuration_id then 'model_mismatch'
  when se.learning_session_id is null then 'started_session_unclassified' when not se.recommendation_path_accuracy_eligible then se.base_eligibility_reason else 'eligible' end eligibility_reason
from paths p cross join operative o left join public.calibration_session_eligibility_v se on se.learning_session_id=p.started_session_id;

-- Replay the frozen baseline additively per learner/skill. This is the analysis
-- input for time-to-secure and offline threshold sensitivity; stored evidence is untouched.
create or replace view public.calibration_mastery_replay_v
with (security_invoker = true) as
with ordered as (
  select ae.*,
    row_number() over (partition by ae.student_id,ae.skill_id order by ae.attempted_at,ae.attempt_id) evidence_number,
    (0.8 + 0.1 * greatest(1,least(5,ae.difficulty))) difficulty_weight
  from public.calibration_attempt_evidence_v ae
  where ae.item_response_formal_eligible
), replay as (
  select o.*,
    2 + sum(greatest(0,least(1,o.score)) * o.difficulty_weight * case when o.hint_used and o.score > 0 then 0.65 else 1 end)
      over (partition by o.student_id,o.skill_id order by o.attempted_at,o.attempt_id) alpha_after,
    2 + sum((1-greatest(0,least(1,o.score))) * o.difficulty_weight)
      over (partition by o.student_id,o.skill_id order by o.attempted_at,o.attempt_id) beta_after
  from ordered o
)
select r.*,
  r.alpha_after/(r.alpha_after+r.beta_after) mastery_score_after,
  (r.evidence_number >= 3 and r.alpha_after/(r.alpha_after+r.beta_after) >= 0.72) secure_after_attempt
from replay r;

create or replace view public.calibration_mastery_trajectory_v
with (security_invoker = true) as
select
  student_id, skill_id, min(contract_version) contract_version, min(metric_set_version) metric_set_version,
  count(*) attempts_observed, count(*) filter (where not hint_used) independent_attempts,
  count(*) filter (where hint_used) hinted_attempts,
  min(attempted_at) trajectory_started_at, max(attempted_at) trajectory_last_at,
  min(evidence_number) filter (where secure_after_attempt) attempts_to_first_secure,
  min(attempted_at) filter (where secure_after_attempt) first_secure_at,
  bool_or(secure_after_attempt) secure_event_observed,
  not bool_or(secure_after_attempt) right_censored,
  extract(epoch from (min(attempted_at) filter (where secure_after_attempt)-min(attempted_at))) elapsed_seconds_to_secure
from public.calibration_mastery_replay_v
group by student_id,skill_id;

create or replace view public.calibration_practice_burden_v
with (security_invoker = true) as
select
  se.student_id, se.target_skill_id skill_id, se.contract_version, se.metric_set_version,
  count(distinct se.learning_session_id) practice_sessions,
  count(ae.attempt_id) practice_attempts,
  count(ae.attempt_id) filter (where not ae.hint_used) independent_attempts,
  count(ae.attempt_id) filter (where ae.hint_used) hinted_attempts,
  coalesce(sum(ae.response_time_ms),0) active_learning_response_time_ms,
  count(distinct se.learning_session_id) filter (where se.session_status='completed') completed_sessions,
  count(distinct se.learning_session_id) filter (where se.session_status<>'completed') censored_sessions,
  bool_and(se.practice_burden_eligible) formal_eligible,
  array_agg(distinct se.base_eligibility_reason) eligibility_reasons
from public.calibration_session_eligibility_v se
left join public.calibration_attempt_evidence_v ae on ae.learning_session_id=se.learning_session_id
where se.mode='practice'
group by se.student_id,se.target_skill_id,se.contract_version,se.metric_set_version;

create or replace view public.calibration_recent_recovery_events_v
with (security_invoker = true) as
with ordered as (
  select ae.*,
    row_number() over (partition by ae.student_id,ae.skill_id order by ae.attempted_at,ae.attempt_id) rn
  from public.calibration_attempt_evidence_v ae
), windows as (
  select cur.*,
    count(prev.attempt_id) window_attempts,
    count(distinct prev.item_id) window_unique_items,
    count(prev.attempt_id) filter (where prev.correct and not prev.hint_used) window_independent_correct
  from ordered cur
  join ordered prev on prev.student_id=cur.student_id and prev.skill_id=cur.skill_id and prev.rn between cur.rn-4 and cur.rn
  group by cur.contract_id,cur.contract_version,cur.metric_set_id,cur.metric_set_version,cur.pilot_run_id,cur.run_key,
    cur.governance_tier,cur.base_formal_eligible,cur.base_eligibility_reason,cur.learning_session_id,cur.student_id,
    cur.unit_code,cur.mode,cur.session_status,cur.curriculum_release_id,cur.release_key,cur.assessment_blueprint_id,
    cur.blueprint_key,cur.learning_model_configuration_id,cur.model_version,cur.runtime_build_id,cur.runtime_build_key,
    cur.attempt_id,cur.attempted_at,cur.skill_id,cur.skill_code,cur.item_id,cur.item_code,cur.item_template_id,
    cur.item_family,cur.difficulty,cur.difficulty_band,cur.correct,cur.score,cur.error_code,cur.hint_used,
    cur.response_time_ms,cur.session_item_id,cur.ordinal,cur.selection_reason,cur.exposure_event_id,cur.served_at,
    cur.family_code,cur.template_code,cur.variant_key,cur.attempt_provenance_exact,cur.exposure_provenance_exact,
    cur.item_response_formal_eligible,cur.item_response_eligibility_reason,cur.repeat_pool_formal_eligible,
    cur.repeat_pool_eligibility_reason,cur.has_prior_incorrect_attempt,cur.rn
), qualified as (
  select w.*,
    (w.window_attempts=5 and w.window_unique_items>=4 and w.window_independent_correct>=4) recovery_qualified
  from windows w
), events as (
  select q.*,coalesce(lag(q.recovery_qualified) over (partition by q.student_id,q.skill_id order by q.rn),false) prior_qualified
  from qualified q
)
select e.student_id,e.skill_id,e.attempt_id recovery_attempt_id,e.attempted_at recovery_at,
  e.learning_session_id,e.window_attempts,e.window_unique_items,e.window_independent_correct,
  nxt.attempt_id next_independent_attempt_id,nxt.attempted_at next_independent_attempt_at,nxt.correct next_independent_correct,
  (nxt.attempt_id is not null) followup_observed,
  (e.base_formal_eligible and e.recovery_qualified and not e.prior_qualified) formal_eligible,
  case when not e.base_formal_eligible then e.base_eligibility_reason
       when not e.recovery_qualified or e.prior_qualified then 'not_new_recovery_event'
       when nxt.attempt_id is null then 'eligible_recovery_followup_pending' else 'eligible' end eligibility_reason,
  e.contract_version,e.metric_set_version,e.release_key,e.blueprint_key,e.model_version,e.runtime_build_key
from events e
left join lateral (
  select x.attempt_id,x.attempted_at,x.correct from ordered x
  where x.student_id=e.student_id and x.skill_id=e.skill_id and x.rn>e.rn and not x.hint_used
  order by x.rn limit 1
) nxt on true
where e.recovery_qualified and not e.prior_qualified;

create or replace view public.calibration_hint_followup_v
with (security_invoker = true) as
select he.*,
  nxt.attempt_id next_independent_attempt_id,nxt.attempted_at next_independent_attempt_at,
  nxt.correct next_independent_correct,
  (nxt.attempt_id is not null) followup_observed
from public.calibration_hint_evidence_v he
left join lateral (
  select ae.attempt_id,ae.attempted_at,ae.correct
  from public.calibration_attempt_evidence_v ae
  where ae.student_id=he.student_id and ae.skill_id=he.skill_id
    and ae.attempted_at>he.event_at and not ae.hint_used
  order by ae.attempted_at,ae.attempt_id limit 1
) nxt on true;

create or replace view public.calibration_item_analysis_v
with (security_invoker = true) as
select
  item_id,item_code,item_template_id,template_code,difficulty,difficulty_band,
  count(distinct student_id) distinct_learners,count(*) attempt_count,
  avg(correct::int) raw_correct_rate,
  avg(learner_correct_rate) learner_aggregated_correct_rate,
  percentile_cont(0.5) within group (order by response_time_ms) median_response_time_ms,
  avg(hint_used::int) hint_rate,
  bool_and(item_response_formal_eligible) formal_eligible,
  min(contract_version) contract_version,min(metric_set_version) metric_set_version
from (
  select ae.*,
    avg(ae.correct::int) over (partition by ae.item_id,ae.student_id) learner_correct_rate
  from public.calibration_attempt_evidence_v ae
) x
group by item_id,item_code,item_template_id,template_code,difficulty,difficulty_band;

create or replace view public.calibration_repeat_influence_v
with (security_invoker = true) as
select student_id,learning_session_id,mode,
  count(*) exposure_attempts,
  count(*) filter (where selection_reason like '%repeat%' or selection_reason like '%exhaust%') repeat_or_exhaustion_attempts,
  avg((selection_reason like '%repeat%' or selection_reason like '%exhaust%')::int) repeat_or_exhaustion_rate,
  avg(correct::int) filter (where selection_reason like '%repeat%' or selection_reason like '%exhaust%') repeat_correct_rate,
  avg(correct::int) filter (where selection_reason is null or (selection_reason not like '%repeat%' and selection_reason not like '%exhaust%')) nonrepeat_correct_rate,
  bool_and(repeat_pool_formal_eligible) formal_eligible,
  min(contract_version) contract_version,min(metric_set_version) metric_set_version
from public.calibration_attempt_evidence_v
group by student_id,learning_session_id,mode;

-- Rename the two observation keys that did not match the immutable r2 registry.
create or replace view public.calibration_metric_observations_v
with (security_invoker = true) as
select * from (
  select 'practice_burden'::text metric_key,se.learning_session_id::text observation_id,se.student_id,se.learning_session_id,se.target_skill_id skill_id,null::uuid item_id,null::uuid item_template_id,se.started_at observed_at,se.governance_tier,se.practice_burden_eligible formal_eligible,case when se.practice_burden_eligible then 'eligible' else se.base_eligibility_reason end eligibility_reason,(se.session_status<>'completed') right_censored,se.contract_version,se.metric_set_version,se.release_key,se.blueprint_key,se.model_version,se.runtime_build_key from public.calibration_session_eligibility_v se where se.mode='practice'
  union all select 'mastery_evidence_to_secure',t.student_id::text||':'||t.skill_id::text,t.student_id,null,t.skill_id,null,null,t.trajectory_started_at,'core_calibration',true,'eligible',t.right_censored,t.contract_version,t.metric_set_version,null,null,null,null from public.calibration_mastery_trajectory_v t
  union all select 'hint_assistance_effect',h.remediation_event_id::text,h.student_id,h.learning_session_id,h.skill_id,h.item_id,h.item_template_id,h.event_at,h.governance_tier,h.formal_eligible,h.eligibility_reason,false,h.contract_version,h.metric_set_version,null,null,null,null from public.calibration_hint_evidence_v h
  union all select 'item_difficulty_response_time',a.attempt_id::text,a.student_id,a.learning_session_id,a.skill_id,a.item_id,a.item_template_id,a.attempted_at,a.governance_tier,a.item_response_formal_eligible,a.item_response_eligibility_reason,false,a.contract_version,a.metric_set_version,a.release_key,a.blueprint_key,a.model_version,a.runtime_build_key from public.calibration_attempt_evidence_v a
  union all select 'repeat_pool_exhaustion_influence',a.attempt_id::text,a.student_id,a.learning_session_id,a.skill_id,a.item_id,a.item_template_id,a.attempted_at,a.governance_tier,a.repeat_pool_formal_eligible,a.repeat_pool_eligibility_reason,false,a.contract_version,a.metric_set_version,a.release_key,a.blueprint_key,a.model_version,a.runtime_build_key from public.calibration_attempt_evidence_v a
  union all select 'threshold_sensitivity',a.attempt_id::text,a.student_id,a.learning_session_id,a.skill_id,a.item_id,a.item_template_id,a.attempted_at,a.governance_tier,a.item_response_formal_eligible,a.item_response_eligibility_reason,false,a.contract_version,a.metric_set_version,a.release_key,a.blueprint_key,a.model_version,a.runtime_build_key from public.calibration_attempt_evidence_v a
  union all select 'recent_recovery_stability',r.recovery_attempt_id::text,r.student_id,r.learning_session_id,r.skill_id,null,null,r.recovery_at,case when r.formal_eligible then 'core_calibration' else 'excluded' end,r.formal_eligible,r.eligibility_reason,(not r.followup_observed),r.contract_version,r.metric_set_version,r.release_key,r.blueprint_key,r.model_version,r.runtime_build_key from public.calibration_recent_recovery_events_v r
  union all select 'recommendation_path_accuracy',p.recommendation_instance_id::text,p.student_id,p.started_session_id,p.target_skill_id,null,null,p.issued_at,coalesce(p.governance_tier,'excluded'),p.formal_eligible,p.eligibility_reason,false,p.contract_version,p.metric_set_version,null,null,null,null from public.calibration_recommendation_paths_v p
  union all select 'diagnostic_predictive_alignment',se.learning_session_id::text,se.student_id,se.learning_session_id,se.target_skill_id,null,null,se.completed_at,se.governance_tier,false,case when not se.diagnostic_predictive_alignment_eligible then se.base_eligibility_reason else 'downstream_outcome_required' end,false,se.contract_version,se.metric_set_version,se.release_key,se.blueprint_key,se.model_version,se.runtime_build_key from public.calibration_session_eligibility_v se where se.mode='diagnostic'
  union all select 'mastery_check_outcome',se.learning_session_id::text,se.student_id,se.learning_session_id,se.target_skill_id,null,null,se.completed_at,se.governance_tier,se.mastery_check_outcome_eligible,case when se.mastery_check_outcome_eligible then 'eligible' else se.base_eligibility_reason end,false,se.contract_version,se.metric_set_version,se.release_key,se.blueprint_key,se.model_version,se.runtime_build_key from public.calibration_session_eligibility_v se where se.mode='mastery_check'
  union all select 'mastery_check_skill_failure',a.attempt_id::text,a.student_id,a.learning_session_id,a.skill_id,a.item_id,a.item_template_id,a.attempted_at,a.governance_tier,(a.base_formal_eligible and a.mode='mastery_check' and a.session_status='completed'),case when a.base_formal_eligible and a.mode='mastery_check' and a.session_status='completed' then 'eligible' else a.base_eligibility_reason end,false,a.contract_version,a.metric_set_version,a.release_key,a.blueprint_key,a.model_version,a.runtime_build_key from public.calibration_attempt_evidence_v a where a.mode='mastery_check'
) q;

create or replace view public.calibration_metric_sample_summary_v
with (security_invoker = true) as
with metric_catalog(metric_key) as (values
 ('practice_burden'),('mastery_evidence_to_secure'),('hint_assistance_effect'),('item_difficulty_response_time'),
 ('repeat_pool_exhaustion_influence'),('threshold_sensitivity'),('diagnostic_predictive_alignment'),
 ('mastery_check_outcome'),('mastery_check_skill_failure'),('recent_recovery_stability'),('recommendation_path_accuracy'))
select mc.metric_key,max(o.contract_version) contract_version,max(o.metric_set_version) metric_set_version,
 count(o.observation_id) observations_total,count(o.observation_id) filter(where o.formal_eligible) observations_formal,
 count(o.observation_id) filter(where o.governance_tier='context_only') observations_context_only,
 count(o.observation_id) filter(where o.governance_tier='excluded') observations_excluded,
 count(distinct o.student_id) distinct_learners,
 count(distinct (o.student_id,o.skill_id)) filter(where o.skill_id is not null) learner_skill_trajectories,
 count(distinct o.learning_session_id) sessions,count(distinct o.skill_id) skills,count(distinct o.item_id) items,
 count(distinct o.item_template_id) item_templates,min(o.observed_at) window_start,max(o.observed_at) window_end,
 count(o.observation_id) filter(where o.right_censored) right_censored_observations,
 coalesce(array_agg(distinct o.release_key) filter(where o.release_key is not null),'{}') release_keys,
 coalesce(array_agg(distinct o.blueprint_key) filter(where o.blueprint_key is not null),'{}') blueprint_keys,
 coalesce(array_agg(distinct o.model_version) filter(where o.model_version is not null),'{}') model_versions,
 coalesce(array_agg(distinct o.runtime_build_key) filter(where o.runtime_build_key is not null),'{}') runtime_builds
from metric_catalog mc left join public.calibration_metric_observations_v o on o.metric_key=mc.metric_key
group by mc.metric_key;

comment on table public.calibration_analysis_scopes is 'Immutable binding of an evidence contract and metric set to one explicit pilot run.';
comment on view public.calibration_mastery_replay_v is 'Attempt-by-attempt replay of the frozen baseline model; threshold simulation input only.';
comment on view public.calibration_recent_recovery_events_v is 'Actual first transition into the 4-of-5 independent recovery condition, with follow-up.';

revoke all on public.calibration_mastery_replay_v,public.calibration_mastery_trajectory_v,
 public.calibration_practice_burden_v,public.calibration_recent_recovery_events_v,
 public.calibration_hint_followup_v,public.calibration_item_analysis_v,
 public.calibration_repeat_influence_v from public,anon,authenticated;
revoke all on public.calibration_session_eligibility_v,public.calibration_attempt_evidence_v,
 public.calibration_hint_evidence_v,public.calibration_recommendation_paths_v,
 public.calibration_metric_observations_v,public.calibration_metric_sample_summary_v
 from public,anon,authenticated;
grant select on public.calibration_mastery_replay_v,public.calibration_mastery_trajectory_v,
 public.calibration_practice_burden_v,public.calibration_recent_recovery_events_v,
 public.calibration_hint_followup_v,public.calibration_item_analysis_v,
 public.calibration_repeat_influence_v to service_role;
grant select on public.calibration_session_eligibility_v,public.calibration_attempt_evidence_v,
 public.calibration_hint_evidence_v,public.calibration_recommendation_paths_v,
 public.calibration_metric_observations_v,public.calibration_metric_sample_summary_v
 to service_role;
