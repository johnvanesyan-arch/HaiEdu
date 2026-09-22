-- Sprint 12.5L-N: teacher Review analytics, threshold-free attention inputs,
-- and explicit evidence-stream separation.

create view public.chapter_review_summary_v
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
  left join public.chapter_review_item_exposures e on e.review_cycle_id=c.id
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

create view public.chapter_review_skill_attention_inputs_v
with (security_invoker=true) as
with ranked_review as (
  select e.*,row_number() over (
    partition by e.chapter_mastery_state_id,e.skill_id order by e.answered_at desc nulls last,e.selected_at desc
  ) as recent_rank
  from public.chapter_review_item_evidence_v e
), latest_mastery_attempt as (
  select distinct on (m.chapter_mastery_state_id)
    m.chapter_mastery_state_id,m.learning_session_id,m.result
  from public.mastery_check_attempts m
  where m.status='completed'
  order by m.chapter_mastery_state_id,m.attempt_number desc
), failed_mastery_skill as (
  select l.chapter_mastery_state_id,lsi.skill_id,true as failed_latest_mastery
  from latest_mastery_attempt l
  join public.learning_session_items lsi on lsi.session_id=l.learning_session_id
  where l.result='failed' and lsi.correct=false
  group by l.chapter_mastery_state_id,lsi.skill_id
)
select r.chapter_mastery_state_id,s.student_id,s.curriculum_release_id,s.unit_code,
  r.skill_id,sk.code as skill_code,sk.name_hy as skill_name_hy,
  count(*) filter (where r.answered_at is not null)::integer as review_observations,
  count(*) filter (where r.answered_at is not null and r.independent)::integer as independent_observations,
  count(*) filter (where r.answered_at is not null and r.independent and r.correct)::integer as independent_correct,
  count(*) filter (where r.answered_at is not null and r.assisted)::integer as hint_assisted_responses,
  count(*) filter (where r.answered_at is not null and not r.correct and r.exact_repeat)::integer as repeat_errors,
  count(*) filter (where r.recent_rank<=10 and r.answered_at is not null and r.independent)::integer as recent_independent_observations,
  count(*) filter (where r.recent_rank<=10 and r.answered_at is not null and r.independent and r.correct)::integer as recent_independent_correct,
  max(r.answered_at) as last_seen_at,coalesce(f.failed_latest_mastery,false) as failed_latest_mastery,
  'insufficient_review_evidence'::text as attention_state,
  'thresholds_not_governed'::text as attention_policy_status
from ranked_review r
join public.chapter_mastery_states s on s.id=r.chapter_mastery_state_id
join public.skills sk on sk.id=r.skill_id
left join failed_mastery_skill f on f.chapter_mastery_state_id=r.chapter_mastery_state_id and f.skill_id=r.skill_id
group by r.chapter_mastery_state_id,s.student_id,s.curriculum_release_id,s.unit_code,
  r.skill_id,sk.code,sk.name_hy,f.failed_latest_mastery;

create view public.learning_evidence_stream_v
with (security_invoker=true) as
select ls.id as learning_session_id,ls.student_id,ls.curriculum_release_id,ls.unit_code,
  ls.mode,ls.status,ls.mastery_attempt_number,crs.review_context,
  case
    when ls.mode='diagnostic' then 'diagnostic'
    when ls.mode='practice' then 'pre_mastery_practice'
    when ls.mode='mastery_check' then 'mastery_check'
    when crs.review_context in ('required_after_attempt_1_failure','required_after_attempt_2_failure') then 'required_post_failure_chapter_review'
    when crs.review_context='voluntary_after_mastery_pass' then 'optional_post_pass_chapter_review'
    when crs.review_context='voluntary_after_final_failure' then 'optional_post_final_failure_chapter_review'
    else 'unclassified'
  end as evidence_stream,
  (ls.mode='practice') as counts_toward_initial_practice_burden,
  (ls.mode='chapter_review') as excluded_from_initial_practice_burden
from public.learning_sessions ls
left join public.chapter_review_sessions crs on crs.learning_session_id=ls.id;

revoke all on table public.chapter_review_summary_v,public.chapter_review_skill_attention_inputs_v,
  public.learning_evidence_stream_v from public,anon,authenticated;
grant select on table public.chapter_review_summary_v,public.chapter_review_skill_attention_inputs_v,
  public.learning_evidence_stream_v to service_role;

comment on view public.chapter_review_summary_v is
  'Teacher-facing chapter Review counts, coverage and assistance facts; separate from lifetime mastery.';
comment on view public.chapter_review_skill_attention_inputs_v is
  'Review-specific attention inputs. States remain insufficient_review_evidence until thresholds are governed.';
comment on view public.learning_evidence_stream_v is
  'Explicit evidence-stream classification preventing Chapter Review from contaminating initial Practice burden.';
