-- Chapter Review coverage means one canonical answer per question per cycle.
-- Existing allocation/exact-repeat provenance is retained; no historic rows are rewritten.

create view public.chapter_review_answered_items_v with (security_invoker=true) as
select e.review_cycle_id,e.item_id,min(a.created_at) as first_answered_at
from public.chapter_review_item_exposures e
join public.learning_session_items lsi on lsi.id=e.learning_session_item_id and lsi.item_id=e.item_id
join public.chapter_review_sessions crs on crs.id=e.chapter_review_session_id and crs.learning_session_id=lsi.session_id
  and crs.review_cycle_id=e.review_cycle_id
join public.chapter_mastery_states s on s.id=crs.chapter_mastery_state_id
join public.attempts a on a.id=lsi.attempt_id and a.learning_session_item_id=lsi.id
  and a.learning_session_id=lsi.session_id and a.item_id=e.item_id and a.student_id=s.student_id
where lsi.answered_at is not null
group by e.review_cycle_id,e.item_id;
revoke all on table public.chapter_review_answered_items_v from public,anon,authenticated;
grant select on table public.chapter_review_answered_items_v to service_role;
comment on view public.chapter_review_answered_items_v is
  'Distinct canonically answered questions per Review cycle, including wrong or assisted answers and partial/abandoned sessions.';

-- One row per cycle avoids silently truncating coverage at a Data API row limit.
create view public.chapter_review_answered_totals_v with (security_invoker=true) as
select review_cycle_id,array_agg(item_id order by item_id) as answered_item_ids
from public.chapter_review_answered_items_v group by review_cycle_id;
revoke all on table public.chapter_review_answered_totals_v from public,anon,authenticated;
grant select on table public.chapter_review_answered_totals_v to service_role;

alter table public.chapter_review_item_exposures add column answered_in_current_cycle boolean;
comment on column public.chapter_review_item_exposures.answered_in_current_cycle is
  'Selection-time answered coverage under the new policy; NULL for legacy records. exact_repeat remains allocation history.';
alter table public.chapter_review_item_exposures drop constraint chapter_review_item_exposures_check1;
alter table public.chapter_review_item_exposures add constraint chapter_review_answered_repeat_guard check (
  (answered_in_current_cycle is null and (not exact_repeat or pool_exhausted))
  or (answered_in_current_cycle is not null and (not answered_in_current_cycle or pool_exhausted))
);

create or replace function public.start_chapter_review_atomic(
  p_student_id uuid,p_curriculum_release_id uuid,p_assessment_blueprint_id uuid,
  p_unit_code text,p_metadata jsonb,p_items jsonb,p_eligible_pool_size integer,
  p_expected_cycle_number integer,p_expected_session_number integer
) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare
  v_state public.chapter_mastery_states%rowtype;
  v_policy public.academic_mastery_policy_versions%rowtype;
  v_requirement public.chapter_review_requirements%rowtype;
  v_existing public.learning_sessions%rowtype;
  v_review public.chapter_review_sessions%rowtype;
  v_session public.learning_sessions%rowtype;
  v_cycle public.chapter_review_cycles%rowtype;
  v_context text; v_target integer; v_cycle_seen integer; v_cycle_number integer;
  v_session_number integer; v_preceding_attempt smallint;
  v_eligible_ids uuid[]; v_answered_ids uuid[]; v_unanswered_ids uuid[]; v_first_repeat integer;
begin
  if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'invalid_review_items'; end if;
  if p_eligible_pool_size is null or p_eligible_pool_size<1 then raise exception 'invalid_review_pool_size'; end if;
  perform pg_advisory_xact_lock(hashtextextended(
    p_student_id::text||'|'||p_curriculum_release_id::text||'|'||p_unit_code,0));

  select * into v_state from public.chapter_mastery_states
  where student_id=p_student_id and curriculum_release_id=p_curriculum_release_id and unit_code=p_unit_code for update;
  if not found then raise exception 'chapter_mastery_state_not_found'; end if;
  select * into v_policy from public.academic_mastery_policy_versions where id=v_state.academic_mastery_policy_id;

  select ls.* into v_existing from public.chapter_review_sessions crs
  join public.learning_sessions ls on ls.id=crs.learning_session_id
  where crs.chapter_mastery_state_id=v_state.id and crs.status='active' limit 1 for update of crs,ls;
  if found then
    select * into v_review from public.chapter_review_sessions where learning_session_id=v_existing.id;
    return jsonb_build_object('sessionId',v_existing.id,'reviewSessionId',v_review.id,
      'reviewContext',v_review.review_context,'required',v_review.review_requirement_id is not null,
      'reviewCycleNumber',v_review.review_cycle_number,'reviewSessionNumber',v_review.review_session_number,'resumed',true);
  end if;

  if p_metadata->>'coverageBasis' is distinct from 'answered_once' then
    raise exception 'answered_review_policy_required';
  end if;
  select coalesce(array_agg(i.id order by i.id),array[]::uuid[]) into v_eligible_ids
  from public.assessment_blueprints ab
  join public.units u on u.id=ab.unit_id
  join public.assessment_blueprint_items bi on bi.assessment_blueprint_id=ab.id
  join public.items i on i.id=bi.item_id and i.status='published'
  where ab.id=p_assessment_blueprint_id and ab.curriculum_release_id=p_curriculum_release_id
    and ab.purpose='chapter_review' and ab.status in ('pilot','production') and u.code=p_unit_code;
  if cardinality(v_eligible_ids)<>p_eligible_pool_size then raise exception 'invalid_review_pool_size'; end if;
  if exists (
    select 1 from jsonb_to_recordset(p_items) x(item_id uuid,skill_id uuid)
    left join public.items i on i.id=x.item_id
    where not coalesce(x.item_id=any(v_eligible_ids),false) or x.skill_id is distinct from i.skill_id
  ) then raise exception 'ineligible_review_item'; end if;

  if v_state.lifecycle_state='review_required_attempt_2' then v_context:='required_after_attempt_1_failure'; v_preceding_attempt:=1;
  elsif v_state.lifecycle_state='review_required_attempt_3' then v_context:='required_after_attempt_2_failure'; v_preceding_attempt:=2;
  elsif v_state.lifecycle_state='mastery_passed' then v_context:='voluntary_after_mastery_pass'; v_preceding_attempt:=v_state.passed_on_attempt;
  elsif v_state.lifecycle_state='mastery_failed_final' then v_context:='voluntary_after_final_failure'; v_preceding_attempt:=v_state.attempts_used;
  else raise exception 'chapter_review_not_available:%',v_state.lifecycle_state; end if;

  if v_context like 'required_%' then
    select * into v_requirement from public.chapter_review_requirements
    where chapter_mastery_state_id=v_state.id and status='required' for update;
    if not found then raise exception 'chapter_review_requirement_not_found'; end if;
  end if;

  v_target:=least(v_policy.target_review_question_count,p_eligible_pool_size);
  if jsonb_array_length(p_items)<>v_target then raise exception 'invalid_review_item_count'; end if;
  if (select count(distinct x.item_id) from jsonb_to_recordset(p_items) x(item_id uuid))<>v_target then
    raise exception 'duplicate_review_item';
  end if;

  select * into v_cycle from public.chapter_review_cycles
  where chapter_mastery_state_id=v_state.id and status='active' for update;
  if found then
    select count(*) into v_cycle_seen from public.chapter_review_answered_items_v where review_cycle_id=v_cycle.id and item_id=any(v_eligible_ids);
    if v_cycle.eligible_pool_size<>p_eligible_pool_size then raise exception 'review_pool_changed'; end if;
    if v_cycle_seen>=v_cycle.eligible_pool_size then
      update public.chapter_review_cycles set status='completed',completed_at=now() where id=v_cycle.id;
      v_cycle.id:=null;
    end if;
  end if;
  if v_cycle.id is null then
    select coalesce(max(cycle_number),0)+1 into v_cycle_number from public.chapter_review_cycles
      where chapter_mastery_state_id=v_state.id;
    insert into public.chapter_review_cycles(chapter_mastery_state_id,curriculum_release_id,unit_code,cycle_number,eligible_pool_size)
      values(v_state.id,p_curriculum_release_id,p_unit_code,v_cycle_number,p_eligible_pool_size) returning * into v_cycle;
  end if;
  v_cycle_number:=v_cycle.cycle_number;
  select coalesce(max(review_session_number),0)+1 into v_session_number
    from public.chapter_review_sessions where review_cycle_id=v_cycle.id;
  if p_expected_cycle_number is distinct from v_cycle_number or p_expected_session_number is distinct from v_session_number then
    raise exception 'stale_review_selection_context';
  end if;

  -- Recompute coverage under the lifecycle lock; never trust caller repeat/exhaustion flags.
  select coalesce(array_agg(item_id),array[]::uuid[]) into v_answered_ids
    from public.chapter_review_answered_items_v where review_cycle_id=v_cycle.id and item_id=any(v_eligible_ids);
  select coalesce(array_agg(id),array[]::uuid[]) into v_unanswered_ids
    from unnest(v_eligible_ids) id where not (id=any(v_answered_ids));
  if (select count(distinct x.ordinal) from jsonb_to_recordset(p_items) x(ordinal integer)
      where x.ordinal between 1 and v_target)<>v_target then raise exception 'invalid_review_item_order'; end if;
  select min(x.ordinal) into v_first_repeat from jsonb_to_recordset(p_items) x(ordinal integer,item_id uuid)
    where x.item_id=any(v_answered_ids);
  if v_first_repeat is not null and exists (
    select 1 from unnest(v_unanswered_ids) id where not exists (
      select 1 from jsonb_to_recordset(p_items) x(ordinal integer,item_id uuid)
      where x.item_id=id and x.ordinal<v_first_repeat
    )
  ) then raise exception 'review_repeat_before_answered_coverage'; end if;

  insert into public.learning_sessions(student_id,curriculum_release_id,assessment_blueprint_id,unit_code,
    mode,planned_item_count,metadata,academic_mastery_policy_id)
  values(p_student_id,p_curriculum_release_id,p_assessment_blueprint_id,p_unit_code,'chapter_review',v_target,
    coalesce(p_metadata,'{}'::jsonb)||jsonb_build_object('reviewContext',v_context,'reviewCycleNumber',v_cycle_number,
      'reviewSessionNumber',v_session_number,'eligiblePoolSize',p_eligible_pool_size,'coverageBasis','answered_once'),v_policy.id)
  returning * into v_session;

  insert into public.learning_session_items(session_id,ordinal,skill_id,item_id,selection_reason)
  select v_session.id,x.ordinal,x.skill_id,x.item_id,x.selection_reason
  from jsonb_to_recordset(p_items) x(ordinal integer,skill_id uuid,item_id uuid,selection_reason text);

  insert into public.chapter_review_sessions(learning_session_id,chapter_mastery_state_id,review_requirement_id,
    academic_mastery_policy_id,review_context,target_question_count,review_cycle_id,review_cycle_number,
    review_session_number,preceding_mastery_attempt_number,eligible_pool_size)
  values(v_session.id,v_state.id,case when v_context like 'required_%' then v_requirement.id else null end,
    v_policy.id,v_context,v_target,v_cycle.id,v_cycle_number,v_session_number,v_preceding_attempt,p_eligible_pool_size)
  returning * into v_review;

  insert into public.chapter_review_item_exposures(chapter_review_session_id,review_cycle_id,learning_session_item_id,
    item_id,item_code,item_version,item_template_id,template_code,item_family_id,family_code,variant_key,skill_id,
    selection_reason,prior_exposure_count,seen_in_current_cycle,exact_repeat,pool_exhausted,answered_in_current_cycle)
  select v_review.id,v_cycle.id,lsi.id,i.id,i.code,i.version_no,i.item_template_id,t.code,t.item_family_id,f.code,
    i.variant_key,i.skill_id,lsi.selection_reason,
    (select count(*) from public.chapter_review_item_exposures pe join public.chapter_review_sessions prs on prs.id=pe.chapter_review_session_id
      where prs.chapter_mastery_state_id=v_state.id and pe.item_id=i.id),
    exists(select 1 from public.chapter_review_item_exposures ce where ce.review_cycle_id=v_cycle.id and ce.item_id=i.id),
    exists(select 1 from public.chapter_review_item_exposures ce where ce.review_cycle_id=v_cycle.id and ce.item_id=i.id),
    i.id=any(v_answered_ids),
    i.id=any(v_answered_ids)
  from public.learning_session_items lsi
  join jsonb_to_recordset(p_items) x(ordinal integer,skill_id uuid,item_id uuid,selection_reason text,pool_exhausted boolean)
    on x.ordinal=lsi.ordinal and x.item_id=lsi.item_id
  join public.items i on i.id=lsi.item_id
  left join public.item_templates t on t.id=i.item_template_id left join public.item_families f on f.id=t.item_family_id
  where lsi.session_id=v_session.id;

  if exists(select 1 from public.chapter_review_item_exposures where chapter_review_session_id=v_review.id and answered_in_current_cycle and not pool_exhausted) then
    raise exception 'review_repeat_before_pool_exhaustion';
  end if;

  return jsonb_build_object('sessionId',v_session.id,'reviewSessionId',v_review.id,'reviewContext',v_context,
    'required',v_review.review_requirement_id is not null,'reviewCycleNumber',v_cycle_number,
    'reviewSessionNumber',v_session_number,'resumed',false);
end;
$$;

revoke all on function public.start_chapter_review_atomic(uuid,uuid,uuid,text,jsonb,jsonb,integer,integer,integer)
  from public,anon,authenticated;
grant execute on function public.start_chapter_review_atomic(uuid,uuid,uuid,text,jsonb,jsonb,integer,integer,integer)
  to service_role;
revoke execute on function public.start_chapter_review_atomic(uuid,uuid,uuid,text,jsonb,jsonb) from service_role;

create or replace function public.complete_chapter_review_cycle_when_covered()
returns trigger language plpgsql security invoker set search_path='' as $$
declare v_seen integer;
begin
  if new.status='completed' and old.status<>'completed' and new.review_cycle_id is not null then
    select count(*) into v_seen from public.chapter_review_answered_items_v
      where review_cycle_id=new.review_cycle_id;
    update public.chapter_review_cycles
      set status='completed',completed_at=coalesce(new.completed_at,now())
      where id=new.review_cycle_id and status='active' and v_seen>=eligible_pool_size;
  end if;
  return new;
end;
$$;
create or replace view public.chapter_review_coverage_v
with (security_invoker=true) as
with exposure as (
  select crs.chapter_mastery_state_id,
    count(*)::integer as total_item_exposures,
    count(distinct e.item_id)::integer as lifetime_unique_items_seen,
    count(*) filter (where e.exact_repeat)::integer as exact_repeat_count,
    count(*) filter (where e.pool_exhausted)::integer as pool_exhaustion_event_count
  from public.chapter_review_item_exposures e
  join public.chapter_review_sessions crs on crs.id=e.chapter_review_session_id
  group by crs.chapter_mastery_state_id
), current_cycle as (
  select c.chapter_mastery_state_id,c.cycle_number,c.eligible_pool_size,
    count(distinct e.item_id)::integer as unique_items_seen
  from public.chapter_review_cycles c
  left join public.chapter_review_answered_items_v e on e.review_cycle_id=c.id
  where c.status='active'
  group by c.chapter_mastery_state_id,c.cycle_number,c.eligible_pool_size
)
select s.id as chapter_mastery_state_id,s.student_id,s.curriculum_release_id,s.unit_code,
  c.cycle_number as current_cycle_number,
  coalesce(c.unique_items_seen,0) as current_cycle_unique_items_seen,
  c.eligible_pool_size as current_cycle_eligible_pool_size,
  case when c.eligible_pool_size is null or c.eligible_pool_size=0 then null
    else round(c.unique_items_seen::numeric/c.eligible_pool_size::numeric*100) end as current_cycle_coverage_percent,
  coalesce(e.lifetime_unique_items_seen,0) as lifetime_unique_items_seen,
  coalesce(e.total_item_exposures,0) as total_item_exposures,
  coalesce(e.exact_repeat_count,0) as exact_repeat_count,
  coalesce(e.pool_exhaustion_event_count,0) as pool_exhaustion_event_count
from public.chapter_mastery_states s
left join exposure e on e.chapter_mastery_state_id=s.id
left join current_cycle c on c.chapter_mastery_state_id=s.id;

create or replace view public.chapter_review_summary_v
with (security_invoker=true) as
with completed_reviews as (
  select crs.chapter_mastery_state_id,
    count(*) filter (where crs.status='completed')::integer as total_reviews_completed,
    count(*) filter (where crs.status='completed' and crs.qualifying)::integer as required_reviews_completed,
    count(*) filter (where crs.status='completed' and not crs.qualifying)::integer as optional_reviews_completed,
    max(crs.completed_at) filter (where crs.status='completed') as last_review_at
  from public.chapter_review_sessions crs
  group by crs.chapter_mastery_state_id
), review_evidence as (
  select e.chapter_mastery_state_id,
    count(*) filter (where e.answered_at is not null and e.independent)::integer as independent_answered,
    count(*) filter (where e.answered_at is not null and e.independent and e.correct)::integer as independent_correct,
    count(*) filter (where e.answered_at is not null and e.assisted)::integer as hint_assisted_responses
  from public.chapter_review_item_evidence_v e
  group by e.chapter_mastery_state_id
), current_cycle as (
  select c.chapter_mastery_state_id,c.cycle_number,c.eligible_pool_size,
    count(distinct e.item_id)::integer as unique_items_seen
  from public.chapter_review_cycles c
  left join public.chapter_review_answered_items_v e on e.review_cycle_id=c.id
  where c.status='active'
  group by c.chapter_mastery_state_id,c.cycle_number,c.eligible_pool_size
)
select s.id as chapter_mastery_state_id,s.student_id,s.curriculum_release_id,s.unit_code,
  s.lifecycle_state,s.attempts_used,s.passed_on_attempt,p.maximum_mastery_attempts,
  coalesce(r.required_reviews_completed,0) as required_reviews_completed,
  coalesce(r.optional_reviews_completed,0) as optional_reviews_completed,
  coalesce(r.total_reviews_completed,0) as total_reviews_completed,r.last_review_at,
  c.cycle_number as current_review_cycle,c.unique_items_seen as current_cycle_unique_seen,
  c.eligible_pool_size as current_cycle_eligible_pool_size,
  coalesce(e.independent_answered,0) as review_independent_answered,
  coalesce(e.independent_correct,0) as review_independent_correct,
  case when coalesce(e.independent_answered,0)=0 then null
    else round(e.independent_correct::numeric/e.independent_answered::numeric*100) end as review_independent_accuracy_percent,
  coalesce(e.hint_assisted_responses,0) as hint_assisted_responses
from public.chapter_mastery_states s
join public.academic_mastery_policy_versions p on p.id=s.academic_mastery_policy_id
left join completed_reviews r on r.chapter_mastery_state_id=s.id
left join review_evidence e on e.chapter_mastery_state_id=s.id
left join current_cycle c on c.chapter_mastery_state_id=s.id;

revoke all on table public.chapter_review_coverage_v,public.chapter_review_summary_v from public,anon,authenticated;
grant select on table public.chapter_review_coverage_v,public.chapter_review_summary_v to service_role;
comment on view public.chapter_review_coverage_v is
  'Current-cycle coverage counts canonically answered questions. Legacy *_seen field names remain API-compatible; lifetime exposure counters retain allocation semantics.';
comment on view public.chapter_review_summary_v is
  'Teacher Review summary; current-cycle coverage counts canonically answered questions, not reserved questions or correct answers only.';
