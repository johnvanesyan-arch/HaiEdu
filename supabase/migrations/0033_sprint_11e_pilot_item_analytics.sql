-- Sprint 11E — pilot analytics and assessment-integrity evidence.
-- These metrics are operational pilot evidence only; they are not validated psychometrics.

create index if not exists idx_exposure_item_purpose_served
  on public.student_item_exposure_events(item_id, purpose, served_at desc);
create index if not exists idx_exposure_item_answered
  on public.student_item_exposure_events(item_id, answered_at)
  where answered_at is not null;
create index if not exists idx_learning_session_items_selection_reason
  on public.learning_session_items(selection_reason)
  where selection_reason is not null;

create or replace function public.service_get_pilot_item_analytics(
  p_unit_code text default 'PHY7-U01'
) returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
with scope_items as (
  select distinct
    i.id,
    i.code,
    i.skill_id,
    s.code as skill_code,
    s.name_hy as skill_name_hy,
    i.version_no,
    i.status::text as lifecycle_status,
    i.review_status,
    i.retired_at,
    i.replacement_item_id,
    i.variant_key
  from public.items i
  join public.skills s on s.id=i.skill_id
  join public.item_curriculum_scopes ics on ics.item_id=i.id and ics.is_primary=true
  join public.units u on u.id=ics.unit_id
  where u.code=p_unit_code
), exposure_ranked as (
  select
    e.*,
    ls.status as session_status,
    row_number() over(partition by e.student_id,e.item_id order by e.served_at,e.id) as repeat_ordinal
  from public.student_item_exposure_events e
  join scope_items si on si.id=e.item_id
  left join public.learning_sessions ls on ls.id=e.session_id
), item_agg as (
  select
    si.id,
    si.code,
    si.skill_id,
    si.skill_code,
    si.skill_name_hy,
    si.version_no,
    si.lifecycle_status,
    si.review_status,
    si.retired_at,
    si.replacement_item_id,
    si.variant_key,
    count(er.id)::integer as exposure_count,
    count(er.id) filter(where er.answered_at is not null)::integer as answered_count,
    count(er.id) filter(where er.correct=true)::integer as correct_count,
    count(er.id) filter(where er.correct=false)::integer as incorrect_count,
    count(er.id) filter(where er.help_used=true)::integer as help_used_count,
    count(er.id) filter(where er.hint_level_used>0)::integer as hint_used_count,
    count(er.id) filter(where er.repeat_ordinal>1)::integer as exact_repeat_count,
    count(er.id) filter(where er.repeat_ordinal=1 and er.answered_at is not null)::integer as first_answered_count,
    count(er.id) filter(where er.repeat_ordinal=1 and er.correct=true)::integer as first_correct_count,
    count(er.id) filter(where er.repeat_ordinal>1 and er.answered_at is not null)::integer as repeat_answered_count,
    count(er.id) filter(where er.repeat_ordinal>1 and er.correct=true)::integer as repeat_correct_count,
    count(er.id) filter(where er.answered_at is null)::integer as unanswered_count,
    count(er.id) filter(where er.answered_at is null and er.session_status='abandoned')::integer as abandoned_unanswered_count,
    count(er.id) filter(where er.answered_at is null and er.session_status='completed')::integer as completed_unanswered_count,
    count(distinct er.student_id)::integer as distinct_students,
    round(avg(er.response_time_ms) filter(where er.response_time_ms is not null))::integer as average_response_time_ms,
    round(percentile_cont(0.5) within group(order by er.response_time_ms) filter(where er.response_time_ms is not null))::integer as median_response_time_ms,
    min(er.served_at) as first_served_at,
    max(er.served_at) as last_served_at,
    count(er.id) filter(where er.purpose='practice')::integer as practice_exposures,
    count(er.id) filter(where er.purpose='diagnostic')::integer as diagnostic_exposures,
    count(er.id) filter(where er.purpose='mastery_check')::integer as mastery_exposures
  from scope_items si
  left join exposure_ranked er on er.item_id=si.id
  group by si.id,si.code,si.skill_id,si.skill_code,si.skill_name_hy,si.version_no,
           si.lifecycle_status,si.review_status,si.retired_at,si.replacement_item_id,si.variant_key
), item_rates as (
  select a.*,
    case when answered_count>0 then round(correct_count::numeric/answered_count,4) else null end as correctness_rate,
    case when answered_count>0 then round(help_used_count::numeric/answered_count,4) else null end as help_use_rate,
    case when exposure_count>0 then round(exact_repeat_count::numeric/exposure_count,4) else 0 end as exact_repeat_rate,
    case when first_answered_count>0 then round(first_correct_count::numeric/first_answered_count,4) else null end as first_time_correctness_rate,
    case when repeat_answered_count>0 then round(repeat_correct_count::numeric/repeat_answered_count,4) else null end as repeat_correctness_rate
  from item_agg a
), item_payload as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'itemId',id,
    'itemCode',code,
    'skillId',skill_id,
    'skillCode',skill_code,
    'skillNameHy',skill_name_hy,
    'versionNo',version_no,
    'variantKey',variant_key,
    'lifecycleStatus',lifecycle_status,
    'reviewStatus',review_status,
    'retiredAt',retired_at,
    'replacementItemId',replacement_item_id,
    'exposureCount',exposure_count,
    'answeredCount',answered_count,
    'correctCount',correct_count,
    'incorrectCount',incorrect_count,
    'correctnessRate',correctness_rate,
    'averageResponseTimeMs',average_response_time_ms,
    'medianResponseTimeMs',median_response_time_ms,
    'helpUsedCount',help_used_count,
    'helpUseRate',help_use_rate,
    'hintUsedCount',hint_used_count,
    'exactRepeatCount',exact_repeat_count,
    'exactRepeatRate',exact_repeat_rate,
    'firstTimeCorrectnessRate',first_time_correctness_rate,
    'repeatCorrectnessRate',repeat_correctness_rate,
    'unansweredCount',unanswered_count,
    'abandonedUnansweredCount',abandoned_unanswered_count,
    'completedUnansweredCount',completed_unanswered_count,
    'distinctStudents',distinct_students,
    'practiceExposures',practice_exposures,
    'diagnosticExposures',diagnostic_exposures,
    'masteryExposures',mastery_exposures,
    'firstServedAt',first_served_at,
    'lastServedAt',last_served_at,
    'flags',to_jsonb(array_remove(array[
      case when exposure_count>=10 then 'high_exposure' end,
      case when answered_count>=5 and correctness_rate>=0.95 then 'unexpectedly_easy' end,
      case when answered_count>=5 and correctness_rate<=0.35 then 'unexpectedly_hard' end,
      case when incorrect_count>=5 then 'frequently_missed' end,
      case when answered_count>=5 and help_use_rate>=0.50 then 'high_help_use' end,
      case when exposure_count>=5 and exact_repeat_rate>=0.25 then 'high_exact_repeat' end,
      case when first_answered_count>=3 and repeat_answered_count>=3 and repeat_correctness_rate-first_time_correctness_rate>=0.25 then 'possible_memorisation_signal' end,
      case when unanswered_count>=2 then 'unanswered_signal' end
    ]::text[],null))
  ) order by skill_code,code),'[]'::jsonb) as items,
  count(*) filter(where cardinality(array_remove(array[
      case when exposure_count>=10 then 'high_exposure' end,
      case when answered_count>=5 and correctness_rate>=0.95 then 'unexpectedly_easy' end,
      case when answered_count>=5 and correctness_rate<=0.35 then 'unexpectedly_hard' end,
      case when incorrect_count>=5 then 'frequently_missed' end,
      case when answered_count>=5 and help_use_rate>=0.50 then 'high_help_use' end,
      case when exposure_count>=5 and exact_repeat_rate>=0.25 then 'high_exact_repeat' end,
      case when first_answered_count>=3 and repeat_answered_count>=3 and repeat_correctness_rate-first_time_correctness_rate>=0.25 then 'possible_memorisation_signal' end,
      case when unanswered_count>=2 then 'unanswered_signal' end
    ]::text[],null))>0)::integer as flagged_item_count
  from item_rates
), integrity as (
  select
    count(er.id)::integer as exposure_count,
    count(distinct er.student_id)::integer as distinct_students,
    count(er.id) filter(where er.repeat_ordinal>1)::integer as exact_repeat_count,
    case when count(er.id)>0 then round(count(er.id) filter(where er.repeat_ordinal>1)::numeric/count(er.id),4) else 0 end as exact_repeat_rate,
    count(er.id) filter(where exists(
      select 1
      from public.assessment_pool_items api
      join public.assessment_pools p on p.id=api.pool_id
      where api.item_id=er.item_id and api.enabled=true and p.is_protected=true and p.purpose='mastery_check'
    ))::integer as protected_pool_exposure_count,
    count(er.id) filter(where er.purpose<>'mastery_check' and exists(
      select 1
      from public.assessment_pool_items api
      join public.assessment_pools p on p.id=api.pool_id
      where api.item_id=er.item_id and api.enabled=true and p.is_protected=true and p.purpose='mastery_check'
    ))::integer as protected_pool_leak_count,
    count(er.id) filter(where er.answered_at is null)::integer as unanswered_exposure_count
  from exposure_ranked er
), fallback as (
  select
    count(lsi.id)::integer as session_item_count,
    count(lsi.id) filter(where lsi.selection_reason='pool_exhausted_exact_repeat')::integer as exact_repeat_fallback_count
  from public.learning_session_items lsi
  join public.learning_sessions ls on ls.id=lsi.session_id
  where ls.unit_code=p_unit_code
), pool_counts as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'poolCode',p.code,
    'purpose',p.purpose,
    'protected',p.is_protected,
    'enabledItemCount',coalesce(x.enabled_count,0)
  ) order by p.purpose),'[]'::jsonb) pools
  from public.assessment_pools p
  left join lateral (
    select count(distinct api.item_id)::integer enabled_count
    from public.assessment_pool_items api
    where api.pool_id=p.id and api.enabled=true
  ) x on true
  where p.unit_code=p_unit_code and p.status='active'
), diagnostic_usage as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'formCode',form_code,
    'formVersion',form_version,
    'sessionCount',session_count
  ) order by form_code,form_version),'[]'::jsonb) forms
  from (
    select
      coalesce(ls.metadata->>'formCode','unknown') form_code,
      coalesce((ls.metadata->>'formVersion')::integer,0) form_version,
      count(*)::integer session_count
    from public.learning_sessions ls
    where ls.unit_code=p_unit_code and ls.mode='diagnostic'
    group by 1,2
  ) q
)
select jsonb_build_object(
  'unitCode',p_unit_code,
  'generatedAt',now(),
  'evidenceLabel','pilot_operational_evidence_not_validated_psychometrics',
  'thresholds',jsonb_build_object(
    'minimumAnsweredForDifficultyFlag',5,
    'unexpectedlyEasyRate',0.95,
    'unexpectedlyHardRate',0.35,
    'highHelpUseRate',0.50,
    'highExactRepeatRate',0.25,
    'possibleMemorisationRepeatLift',0.25
  ),
  'integrity',jsonb_build_object(
    'distinctStudents',integrity.distinct_students,
    'exposureCount',integrity.exposure_count,
    'exactRepeatCount',integrity.exact_repeat_count,
    'exactRepeatRate',integrity.exact_repeat_rate,
    'exactRepeatFallbackCount',fallback.exact_repeat_fallback_count,
    'sessionItemCount',fallback.session_item_count,
    'protectedPoolExposureCount',integrity.protected_pool_exposure_count,
    'protectedPoolLeakCount',integrity.protected_pool_leak_count,
    'unansweredExposureCount',integrity.unanswered_exposure_count,
    'flaggedItemCount',item_payload.flagged_item_count
  ),
  'pools',pool_counts.pools,
  'diagnosticFormUsage',diagnostic_usage.forms,
  'items',item_payload.items
)
from integrity cross join fallback cross join pool_counts cross join diagnostic_usage cross join item_payload;
$$;

revoke all on function public.service_get_pilot_item_analytics(text) from public, anon, authenticated;
grant execute on function public.service_get_pilot_item_analytics(text) to service_role;

comment on function public.service_get_pilot_item_analytics(text) is
  'Sprint 11E operational item/integrity evidence for controlled pilots. Not validated psychometrics.';
