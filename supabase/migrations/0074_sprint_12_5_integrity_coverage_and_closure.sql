-- Sprint 12.5P-Y: attempt-link integrity, assessment-purpose eligibility,
-- Review coverage reporting and historical-provenance closure.

create index if not exists mastery_check_attempts_preceding_review_idx
  on public.mastery_check_attempts(preceding_required_review_id)
  where preceding_required_review_id is not null;

create or replace function public.validate_mastery_attempt_integrity()
returns trigger language plpgsql security invoker set search_path='' as $$
declare
  v_session public.learning_sessions%rowtype;
  v_review public.chapter_review_sessions%rowtype;
  v_requirement public.chapter_review_requirements%rowtype;
begin
  select * into v_session from public.learning_sessions where id=new.learning_session_id;
  if not found or v_session.mode<>'mastery_check' then
    raise exception 'mastery_attempt_requires_mastery_session';
  end if;
  if v_session.mastery_attempt_number is distinct from new.attempt_number
     or v_session.academic_mastery_policy_id is distinct from new.academic_mastery_policy_id then
    raise exception 'mastery_attempt_session_identity_mismatch';
  end if;

  if new.attempt_number=1 then
    if new.preceding_required_review_id is not null then
      raise exception 'attempt_1_must_not_reference_review';
    end if;
  else
    if new.preceding_required_review_id is null then
      raise exception 'retry_requires_preceding_review';
    end if;
    select * into v_review from public.chapter_review_sessions
      where id=new.preceding_required_review_id;
    if not found
       or v_review.chapter_mastery_state_id<>new.chapter_mastery_state_id
       or v_review.status<>'completed'
       or not v_review.qualifying
       or v_review.preceding_mastery_attempt_number<>new.attempt_number-1 then
      raise exception 'invalid_preceding_review';
    end if;
    select * into v_requirement from public.chapter_review_requirements
      where id=v_review.review_requirement_id;
    if not found
       or v_requirement.chapter_mastery_state_id<>new.chapter_mastery_state_id
       or v_requirement.required_after_attempt<>new.attempt_number-1
       or v_requirement.status<>'satisfied'
       or v_requirement.qualifying_review_session_id<>v_review.id then
      raise exception 'invalid_satisfied_review_requirement';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists mastery_attempt_integrity_guard on public.mastery_check_attempts;
create trigger mastery_attempt_integrity_guard
before insert or update of chapter_mastery_state_id,learning_session_id,attempt_number,
  academic_mastery_policy_id,preceding_required_review_id
on public.mastery_check_attempts
for each row execute function public.validate_mastery_attempt_integrity();

create or replace function public.prevent_mastery_attempt_identity_mutation()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if row(new.chapter_mastery_state_id,new.learning_session_id,new.attempt_number,
         new.academic_mastery_policy_id,new.preceding_required_review_id,new.provenance_status)
     is distinct from
     row(old.chapter_mastery_state_id,old.learning_session_id,old.attempt_number,
         old.academic_mastery_policy_id,old.preceding_required_review_id,old.provenance_status) then
    raise exception 'mastery attempt identity and provenance are immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists mastery_attempt_identity_immutable on public.mastery_check_attempts;
create trigger mastery_attempt_identity_immutable
before update of chapter_mastery_state_id,learning_session_id,attempt_number,
  academic_mastery_policy_id,preceding_required_review_id,provenance_status
on public.mastery_check_attempts
for each row execute function public.prevent_mastery_attempt_identity_mutation();

create view public.assessment_item_purpose_eligibility_v
with (security_invoker=true) as
select ab.curriculum_release_id,ab.unit_id,abi.item_id,
  bool_or(ab.purpose='practice') as practice_eligible,
  bool_or(ab.purpose='chapter_review') as review_eligible,
  bool_or(ab.purpose='mastery_check') as mastery_check_eligible,
  array_agg(distinct ab.purpose order by ab.purpose) as eligible_purposes
from public.assessment_blueprints ab
join public.assessment_blueprint_items abi on abi.assessment_blueprint_id=ab.id
where ab.status in ('pilot','production')
group by ab.curriculum_release_id,ab.unit_id,abi.item_id;

create view public.chapter_review_coverage_v
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
  left join public.chapter_review_item_exposures e on e.review_cycle_id=c.id
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

create view public.chapter_mastery_history_provenance_v
with (security_invoker=true) as
select s.id as chapter_mastery_state_id,s.student_id,s.curriculum_release_id,s.unit_code,
  s.lifecycle_state,s.attempts_used,s.passed_on_attempt,s.history_provenance,
  count(a.id)::integer as recorded_attempts,
  count(*) filter (where a.provenance_status='legacy_attempt_history')::integer as legacy_attempt_records,
  bool_and(a.attempt_number between 1 and 3) filter (where a.id is not null) as attempt_numbers_valid
from public.chapter_mastery_states s
left join public.mastery_check_attempts a on a.chapter_mastery_state_id=s.id
group by s.id,s.student_id,s.curriculum_release_id,s.unit_code,
  s.lifecycle_state,s.attempts_used,s.passed_on_attempt,s.history_provenance;

revoke all on table public.assessment_item_purpose_eligibility_v,
  public.chapter_review_coverage_v,public.chapter_mastery_history_provenance_v
  from public,anon,authenticated;
grant select on table public.assessment_item_purpose_eligibility_v,
  public.chapter_review_coverage_v,public.chapter_mastery_history_provenance_v to service_role;

comment on view public.assessment_item_purpose_eligibility_v is
  'Explicit item eligibility by governed assessment purpose; used to audit Review/Mastery pool separation.';
comment on view public.chapter_review_coverage_v is
  'Review coverage only; never a mastery classification or initial-Practice burden measure.';
comment on view public.chapter_mastery_history_provenance_v is
  'Historical migration audit surface; legacy ambiguity remains explicit and is never fabricated.';
