-- Sprint 12.5E-F: deterministic whole-chapter Review cycles and selection provenance.

create table public.chapter_review_cycles (
  id uuid primary key default gen_random_uuid(),
  chapter_mastery_state_id uuid not null references public.chapter_mastery_states(id) on delete restrict,
  curriculum_release_id uuid not null references public.curriculum_releases(id) on delete restrict,
  unit_code text not null,
  cycle_number integer not null check (cycle_number > 0),
  eligible_pool_size integer not null check (eligible_pool_size > 0),
  status text not null default 'active' check (status in ('active','completed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (chapter_mastery_state_id,cycle_number),
  check ((status='active' and completed_at is null) or (status='completed' and completed_at is not null))
);

create unique index chapter_review_cycles_one_active_idx
  on public.chapter_review_cycles(chapter_mastery_state_id) where status='active';
create index chapter_review_cycles_release_unit_idx
  on public.chapter_review_cycles(curriculum_release_id,unit_code,chapter_mastery_state_id);

alter table public.chapter_review_sessions
  add column review_cycle_id uuid references public.chapter_review_cycles(id) on delete restrict,
  add column review_cycle_number integer,
  add column review_session_number integer,
  add column preceding_mastery_attempt_number smallint,
  add column eligible_pool_size integer;

alter table public.chapter_review_sessions
  add constraint chapter_review_sessions_cycle_numbers_check check (
    (review_cycle_id is null and review_cycle_number is null and review_session_number is null and eligible_pool_size is null)
    or (review_cycle_id is not null and review_cycle_number > 0 and review_session_number > 0 and eligible_pool_size > 0)
  );
create unique index chapter_review_sessions_cycle_session_idx
  on public.chapter_review_sessions(review_cycle_id,review_session_number)
  where review_cycle_id is not null;
create index chapter_review_sessions_cycle_idx on public.chapter_review_sessions(review_cycle_id);

create table public.chapter_review_item_exposures (
  id uuid primary key default gen_random_uuid(),
  chapter_review_session_id uuid not null references public.chapter_review_sessions(id) on delete restrict,
  review_cycle_id uuid not null references public.chapter_review_cycles(id) on delete restrict,
  learning_session_item_id uuid not null unique references public.learning_session_items(id) on delete restrict,
  item_id uuid not null references public.items(id) on delete restrict,
  item_code text not null,
  item_version integer not null,
  item_template_id uuid references public.item_templates(id) on delete restrict,
  template_code text,
  item_family_id uuid references public.item_families(id) on delete restrict,
  family_code text,
  variant_key text,
  skill_id uuid not null references public.skills(id) on delete restrict,
  selection_reason text not null,
  prior_exposure_count integer not null check (prior_exposure_count >= 0),
  seen_in_current_cycle boolean not null,
  exact_repeat boolean not null,
  pool_exhausted boolean not null,
  selected_at timestamptz not null default now(),
  unique(chapter_review_session_id,item_id),
  check (exact_repeat = seen_in_current_cycle),
  check (not exact_repeat or pool_exhausted)
);

create index chapter_review_item_exposures_cycle_item_idx
  on public.chapter_review_item_exposures(review_cycle_id,item_id);
create index chapter_review_item_exposures_skill_selected_idx
  on public.chapter_review_item_exposures(skill_id,selected_at desc);
create index chapter_review_item_exposures_item_selected_idx
  on public.chapter_review_item_exposures(item_id,selected_at desc);
create index chapter_review_item_exposures_template_idx
  on public.chapter_review_item_exposures(item_template_id) where item_template_id is not null;
create index chapter_review_item_exposures_family_idx
  on public.chapter_review_item_exposures(item_family_id) where item_family_id is not null;

alter table public.chapter_review_cycles enable row level security;
alter table public.chapter_review_item_exposures enable row level security;
revoke all on table public.chapter_review_cycles,public.chapter_review_item_exposures from public,anon,authenticated;
grant select,insert,update on table public.chapter_review_cycles to service_role;
revoke delete,truncate on table public.chapter_review_cycles from service_role;
grant select,insert on table public.chapter_review_item_exposures to service_role;
revoke update,delete,truncate on table public.chapter_review_item_exposures from service_role;

create view public.chapter_review_item_catalog_v
with (security_invoker=true) as
select i.id as item_id,i.code as item_code,i.version_no as item_version,i.skill_id,
       i.item_template_id,t.code as template_code,t.item_family_id,f.code as family_code,
       i.variant_key
from public.items i
left join public.item_templates t on t.id=i.item_template_id
left join public.item_families f on f.id=t.item_family_id
where i.status='published';

create view public.chapter_review_item_evidence_v
with (security_invoker=true) as
select e.id,e.chapter_review_session_id,e.review_cycle_id,crs.chapter_mastery_state_id,
       crs.review_context,crs.review_cycle_number,crs.review_session_number,
       crs.preceding_mastery_attempt_number,e.learning_session_item_id,e.item_id,
       e.item_code,e.item_version,e.item_template_id,e.template_code,e.item_family_id,
       e.family_code,e.variant_key,e.skill_id,e.selection_reason,e.prior_exposure_count,
       e.seen_in_current_cycle,e.exact_repeat,e.pool_exhausted,e.selected_at,
       lsi.hint_level_used,a.hint_used,a.response_time_ms,a.correct,a.created_at as answered_at,
       case when a.id is null then null else not coalesce(a.hint_used,false) end as independent,
       case when a.id is null then null else coalesce(a.hint_used,false) end as assisted
from public.chapter_review_item_exposures e
join public.chapter_review_sessions crs on crs.id=e.chapter_review_session_id
join public.learning_session_items lsi on lsi.id=e.learning_session_item_id
left join public.attempts a on a.id=lsi.attempt_id;

revoke all on table public.chapter_review_item_catalog_v,public.chapter_review_item_evidence_v
  from public,anon,authenticated;
grant select on table public.chapter_review_item_catalog_v,public.chapter_review_item_evidence_v to service_role;

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
begin
  if jsonb_typeof(p_items)<>'array' then raise exception 'invalid_review_items'; end if;
  if p_eligible_pool_size<1 then raise exception 'invalid_review_pool_size'; end if;
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
    select count(distinct item_id) into v_cycle_seen from public.chapter_review_item_exposures where review_cycle_id=v_cycle.id;
    if v_cycle.eligible_pool_size<>p_eligible_pool_size or v_cycle_seen>=v_cycle.eligible_pool_size then
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
  if p_expected_cycle_number<>v_cycle_number or p_expected_session_number<>v_session_number then
    raise exception 'stale_review_selection_context';
  end if;

  insert into public.learning_sessions(student_id,curriculum_release_id,assessment_blueprint_id,unit_code,
    mode,planned_item_count,metadata,academic_mastery_policy_id)
  values(p_student_id,p_curriculum_release_id,p_assessment_blueprint_id,p_unit_code,'chapter_review',v_target,
    coalesce(p_metadata,'{}'::jsonb)||jsonb_build_object('reviewContext',v_context,'reviewCycleNumber',v_cycle_number,
      'reviewSessionNumber',v_session_number,'eligiblePoolSize',p_eligible_pool_size),v_policy.id)
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
    selection_reason,prior_exposure_count,seen_in_current_cycle,exact_repeat,pool_exhausted)
  select v_review.id,v_cycle.id,lsi.id,i.id,i.code,i.version_no,i.item_template_id,t.code,t.item_family_id,f.code,
    i.variant_key,i.skill_id,lsi.selection_reason,
    (select count(*) from public.chapter_review_item_exposures pe join public.chapter_review_sessions prs on prs.id=pe.chapter_review_session_id
      where prs.chapter_mastery_state_id=v_state.id and pe.item_id=i.id),
    exists(select 1 from public.chapter_review_item_exposures ce where ce.review_cycle_id=v_cycle.id and ce.item_id=i.id),
    exists(select 1 from public.chapter_review_item_exposures ce where ce.review_cycle_id=v_cycle.id and ce.item_id=i.id),
    x.pool_exhausted
  from public.learning_session_items lsi
  join jsonb_to_recordset(p_items) x(ordinal integer,skill_id uuid,item_id uuid,selection_reason text,pool_exhausted boolean)
    on x.ordinal=lsi.ordinal and x.item_id=lsi.item_id
  join public.items i on i.id=lsi.item_id
  left join public.item_templates t on t.id=i.item_template_id left join public.item_families f on f.id=t.item_family_id
  where lsi.session_id=v_session.id;

  if exists(select 1 from public.chapter_review_item_exposures where chapter_review_session_id=v_review.id and exact_repeat and not pool_exhausted) then
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
    select count(distinct item_id) into v_seen from public.chapter_review_item_exposures
      where review_cycle_id=new.review_cycle_id;
    update public.chapter_review_cycles
      set status='completed',completed_at=coalesce(new.completed_at,now())
      where id=new.review_cycle_id and status='active' and v_seen>=eligible_pool_size;
  end if;
  return new;
end;
$$;
create trigger chapter_review_cycle_completion_trigger
after update of status on public.chapter_review_sessions
for each row execute function public.complete_chapter_review_cycle_when_covered();

comment on table public.chapter_review_cycles is 'Durable per-learner whole-chapter Review rotations.';
comment on table public.chapter_review_item_exposures is 'Immutable selection-time provenance for every Chapter Review item.';
