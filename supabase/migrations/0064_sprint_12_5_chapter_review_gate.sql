-- Sprint 12.5C-D: first-class Chapter Review and qualifying retry gate.

-- Policy versions remain immutable. A separate singleton binding selects the active version.
drop index if exists public.academic_mastery_policy_one_active_idx;

create table public.academic_mastery_policy_activation (
  singleton boolean primary key default true check (singleton),
  policy_id uuid not null references public.academic_mastery_policy_versions(id) on delete restrict,
  activated_at timestamptz not null default now(),
  activated_by uuid references public.profiles(id) on delete set null,
  notes text not null default ''
);

insert into public.academic_mastery_policy_activation(singleton,policy_id,notes)
select true,id,'Initial Sprint 12.5 policy activation'
from public.academic_mastery_policy_versions
where policy_key='chapter-mastery-review-2026-r1'
on conflict (singleton) do nothing;

alter table public.academic_mastery_policy_activation enable row level security;
revoke all on table public.academic_mastery_policy_activation from public,anon,authenticated;
grant select,insert,update on table public.academic_mastery_policy_activation to service_role;
revoke delete,truncate on table public.academic_mastery_policy_activation from service_role;

alter table public.learning_sessions drop constraint if exists learning_sessions_mode_check;
alter table public.learning_sessions add constraint learning_sessions_mode_check
  check (mode in ('diagnostic','practice','mastery_check','chapter_review'));

create table public.chapter_review_requirements (
  id uuid primary key default gen_random_uuid(),
  chapter_mastery_state_id uuid not null references public.chapter_mastery_states(id) on delete restrict,
  originating_mastery_attempt_id uuid not null references public.mastery_check_attempts(id) on delete restrict,
  required_after_attempt smallint not null check (required_after_attempt in (1,2)),
  status text not null default 'required' check (status in ('required','satisfied','cancelled')),
  qualifying_review_session_id uuid,
  required_at timestamptz not null default now(),
  satisfied_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  unique(chapter_mastery_state_id,required_after_attempt),
  check (
    (status='required' and qualifying_review_session_id is null and satisfied_at is null and cancelled_at is null)
    or (status='satisfied' and qualifying_review_session_id is not null and satisfied_at is not null and cancelled_at is null)
    or (status='cancelled' and cancelled_at is not null)
  )
);

create table public.chapter_review_sessions (
  id uuid primary key default gen_random_uuid(),
  learning_session_id uuid not null unique references public.learning_sessions(id) on delete restrict,
  chapter_mastery_state_id uuid not null references public.chapter_mastery_states(id) on delete restrict,
  review_requirement_id uuid references public.chapter_review_requirements(id) on delete restrict,
  academic_mastery_policy_id uuid not null references public.academic_mastery_policy_versions(id) on delete restrict,
  review_context text not null check (review_context in (
    'required_after_attempt_1_failure',
    'required_after_attempt_2_failure',
    'voluntary_after_mastery_pass',
    'voluntary_after_final_failure'
  )),
  target_question_count smallint not null check (target_question_count between 1 and 100),
  qualifying boolean not null default false,
  status text not null default 'active' check (status in ('active','completed','abandoned')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    (review_context like 'required_%' and review_requirement_id is not null)
    or (review_context like 'voluntary_%' and review_requirement_id is null)
  ),
  check ((status='completed' and completed_at is not null) or (status<>'completed' and completed_at is null))
);

alter table public.chapter_review_requirements
  add constraint chapter_review_requirements_qualifying_session_fkey
  foreign key (qualifying_review_session_id)
  references public.chapter_review_sessions(id) on delete restrict;

alter table public.mastery_check_attempts
  add constraint mastery_check_attempts_preceding_review_fkey
  foreign key (preceding_required_review_id)
  references public.chapter_review_sessions(id) on delete restrict;

create unique index chapter_review_requirements_one_open_idx
  on public.chapter_review_requirements(chapter_mastery_state_id) where status='required';
create unique index chapter_review_sessions_one_active_idx
  on public.chapter_review_sessions(chapter_mastery_state_id) where status='active';
create index chapter_review_requirements_attempt_idx
  on public.chapter_review_requirements(originating_mastery_attempt_id);
create index chapter_review_sessions_requirement_idx
  on public.chapter_review_sessions(review_requirement_id) where review_requirement_id is not null;
create index chapter_review_sessions_policy_idx
  on public.chapter_review_sessions(academic_mastery_policy_id);

alter table public.chapter_review_requirements enable row level security;
alter table public.chapter_review_sessions enable row level security;
revoke all on table public.chapter_review_requirements,public.chapter_review_sessions
  from public,anon,authenticated;
grant select,insert,update on table public.chapter_review_requirements,public.chapter_review_sessions
  to service_role;
revoke delete,truncate on table public.chapter_review_requirements,public.chapter_review_sessions
  from service_role;

create or replace function public.start_mastery_check_atomic(
  p_student_id uuid,
  p_curriculum_release_id uuid,
  p_assessment_blueprint_id uuid,
  p_unit_code text,
  p_planned_item_count integer,
  p_metadata jsonb,
  p_items jsonb
) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare
  v_policy public.academic_mastery_policy_versions%rowtype;
  v_state public.chapter_mastery_states%rowtype;
  v_existing public.learning_sessions%rowtype;
  v_session public.learning_sessions%rowtype;
  v_attempt smallint;
  v_expected_items integer;
  v_review_id uuid;
begin
  if p_student_id is null or p_curriculum_release_id is null
     or p_assessment_blueprint_id is null or nullif(trim(p_unit_code),'') is null then
    raise exception 'missing_mastery_context';
  end if;
  if p_planned_item_count < 1 or p_planned_item_count > 100 then
    raise exception 'invalid_planned_item_count';
  end if;
  if jsonb_typeof(p_items)<>'array' then raise exception 'invalid_mastery_items'; end if;

  perform pg_advisory_xact_lock(hashtextextended(
    p_student_id::text || '|' || p_curriculum_release_id::text || '|' || p_unit_code,0
  ));

  select p.* into v_policy
  from public.academic_mastery_policy_activation a
  join public.academic_mastery_policy_versions p on p.id=a.policy_id
  where a.singleton=true;
  if not found then raise exception 'active_mastery_policy_not_found'; end if;

  select * into v_existing from public.learning_sessions
  where student_id=p_student_id and curriculum_release_id=p_curriculum_release_id
    and unit_code=p_unit_code and mode='mastery_check' and status='active'
  order by created_at desc limit 1 for update;
  if found then
    return jsonb_build_object('sessionId',v_existing.id,'attemptNumber',v_existing.mastery_attempt_number,'resumed',true);
  end if;

  select * into v_state from public.chapter_mastery_states
  where student_id=p_student_id and curriculum_release_id=p_curriculum_release_id and unit_code=p_unit_code
  for update;
  if not found then
    insert into public.chapter_mastery_states(
      student_id,curriculum_release_id,unit_code,academic_mastery_policy_id,lifecycle_state
    ) values (p_student_id,p_curriculum_release_id,p_unit_code,v_policy.id,'mastery_ready')
    returning * into v_state;
  end if;

  if v_state.academic_mastery_policy_id<>v_policy.id then
    select * into v_policy from public.academic_mastery_policy_versions where id=v_state.academic_mastery_policy_id;
  end if;

  v_attempt:=case v_state.lifecycle_state
    when 'mastery_ready' then 1
    when 'mastery_retry_2_ready' then 2
    when 'mastery_retry_3_ready' then 3
    else null
  end;
  if v_attempt is null then raise exception 'mastery_check_not_allowed:%',v_state.lifecycle_state; end if;
  if v_attempt>v_policy.maximum_mastery_attempts then raise exception 'mastery_attempt_limit_reached'; end if;
  if v_attempt<>v_state.attempts_used+1 then raise exception 'mastery_attempt_sequence_invalid'; end if;

  if v_attempt>1 then
    select crs.id into v_review_id
    from public.chapter_review_requirements r
    join public.chapter_review_sessions crs on crs.id=r.qualifying_review_session_id
    where r.chapter_mastery_state_id=v_state.id
      and r.required_after_attempt=v_attempt-1
      and r.status='satisfied'
      and crs.qualifying=true and crs.status='completed';
    if v_review_id is null then raise exception 'qualifying_chapter_review_required'; end if;
  end if;

  select count(*) into v_expected_items from jsonb_array_elements(p_items);
  if v_expected_items<>p_planned_item_count then raise exception 'mastery_item_count_mismatch'; end if;

  insert into public.learning_sessions(
    student_id,curriculum_release_id,assessment_blueprint_id,unit_code,
    mode,planned_item_count,metadata,academic_mastery_policy_id,mastery_attempt_number
  ) values (
    p_student_id,p_curriculum_release_id,p_assessment_blueprint_id,p_unit_code,
    'mastery_check',p_planned_item_count,coalesce(p_metadata,'{}'::jsonb),
    v_policy.id,v_attempt
  ) returning * into v_session;

  insert into public.learning_session_items(session_id,ordinal,skill_id,item_id,selection_reason)
  select v_session.id,x.ordinal,x.skill_id,x.item_id,x.selection_reason
  from jsonb_to_recordset(p_items) as x(ordinal integer,skill_id uuid,item_id uuid,selection_reason text);

  insert into public.mastery_check_attempts(
    chapter_mastery_state_id,learning_session_id,attempt_number,
    academic_mastery_policy_id,preceding_required_review_id,status,started_at
  ) values (v_state.id,v_session.id,v_attempt,v_policy.id,v_review_id,'active',v_session.started_at);

  return jsonb_build_object('sessionId',v_session.id,'attemptNumber',v_attempt,'resumed',false);
end;
$$;

create or replace function public.finalize_mastery_check_atomic(
  p_student_id uuid,
  p_session_id uuid,
  p_passed boolean,
  p_score_percent numeric,
  p_result_metadata jsonb
) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare
  v_session public.learning_sessions%rowtype;
  v_attempt public.mastery_check_attempts%rowtype;
  v_state public.chapter_mastery_states%rowtype;
  v_policy public.academic_mastery_policy_versions%rowtype;
  v_result text;
  v_next_state text;
  v_expected_percent numeric;
  v_requirement_id uuid;
begin
  select * into v_session from public.learning_sessions
  where id=p_session_id and student_id=p_student_id and mode='mastery_check' for update;
  if not found then raise exception 'mastery_session_not_found'; end if;
  if v_session.status<>'completed' then raise exception 'mastery_session_not_completed'; end if;

  perform pg_advisory_xact_lock(hashtextextended(
    p_student_id::text || '|' || v_session.curriculum_release_id::text || '|' || v_session.unit_code,0
  ));

  select * into v_attempt from public.mastery_check_attempts where learning_session_id=p_session_id for update;
  if not found then raise exception 'mastery_attempt_not_found'; end if;
  select * into v_state from public.chapter_mastery_states where id=v_attempt.chapter_mastery_state_id for update;
  select * into v_policy from public.academic_mastery_policy_versions where id=v_attempt.academic_mastery_policy_id;

  if v_attempt.status='completed' then
    return jsonb_build_object(
      'attemptNumber',v_attempt.attempt_number,'result',v_attempt.result,
      'lifecycleState',v_state.lifecycle_state,'idempotent',true
    );
  end if;
  if v_attempt.attempt_number<>v_state.attempts_used+1 then raise exception 'mastery_attempt_sequence_invalid'; end if;

  v_expected_percent:=case when v_session.answered_count=0 then 0
    else round((v_session.correct_count::numeric/v_session.answered_count::numeric)*100) end;
  if p_score_percent<>v_expected_percent then raise exception 'mastery_score_mismatch'; end if;

  v_result:=case when p_passed then 'passed' else 'failed' end;
  v_next_state:=case
    when p_passed then 'mastery_passed'
    when v_attempt.attempt_number=1 then 'review_required_attempt_2'
    when v_attempt.attempt_number=2 then 'review_required_attempt_3'
    when v_attempt.attempt_number=v_policy.maximum_mastery_attempts then 'mastery_failed_final'
    else null
  end;
  if v_next_state is null then raise exception 'invalid_mastery_transition'; end if;

  update public.learning_sessions
  set assessment_result=v_result,score_percent=p_score_percent,
      metadata=coalesce(metadata,'{}'::jsonb)||coalesce(p_result_metadata,'{}'::jsonb),updated_at=now()
  where id=p_session_id;
  update public.mastery_check_attempts
  set result=v_result,score_percent=p_score_percent,status='completed',completed_at=now()
  where id=v_attempt.id;
  update public.chapter_mastery_states
  set lifecycle_state=v_next_state,attempts_used=v_attempt.attempt_number,
      passed_on_attempt=case when p_passed then v_attempt.attempt_number else null end,updated_at=now()
  where id=v_state.id;

  if p_passed then
    update public.chapter_review_requirements
    set status='cancelled',cancelled_at=now()
    where chapter_mastery_state_id=v_state.id and status='required';
  elsif v_attempt.attempt_number in (1,2) then
    insert into public.chapter_review_requirements(
      chapter_mastery_state_id,originating_mastery_attempt_id,required_after_attempt,status
    ) values (v_state.id,v_attempt.id,v_attempt.attempt_number,'required')
    on conflict (chapter_mastery_state_id,required_after_attempt) do update
      set status='required',qualifying_review_session_id=null,satisfied_at=null,cancelled_at=null
    returning id into v_requirement_id;
  end if;

  return jsonb_build_object(
    'attemptNumber',v_attempt.attempt_number,'result',v_result,'lifecycleState',v_next_state,
    'attemptsUsed',v_attempt.attempt_number,
    'attemptsRemaining',v_policy.maximum_mastery_attempts-v_attempt.attempt_number,
    'reviewRequirementId',v_requirement_id,'idempotent',false
  );
end;
$$;

create or replace function public.start_chapter_review_atomic(
  p_student_id uuid,
  p_curriculum_release_id uuid,
  p_assessment_blueprint_id uuid,
  p_unit_code text,
  p_metadata jsonb,
  p_items jsonb
) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare
  v_state public.chapter_mastery_states%rowtype;
  v_policy public.academic_mastery_policy_versions%rowtype;
  v_requirement public.chapter_review_requirements%rowtype;
  v_existing public.learning_sessions%rowtype;
  v_review public.chapter_review_sessions%rowtype;
  v_session public.learning_sessions%rowtype;
  v_context text;
  v_target integer;
  v_item_count integer;
begin
  if jsonb_typeof(p_items)<>'array' then raise exception 'invalid_review_items'; end if;
  perform pg_advisory_xact_lock(hashtextextended(
    p_student_id::text || '|' || p_curriculum_release_id::text || '|' || p_unit_code,0
  ));

  select * into v_state from public.chapter_mastery_states
  where student_id=p_student_id and curriculum_release_id=p_curriculum_release_id and unit_code=p_unit_code
  for update;
  if not found then raise exception 'chapter_mastery_state_not_found'; end if;
  select * into v_policy from public.academic_mastery_policy_versions where id=v_state.academic_mastery_policy_id;

  select ls.* into v_existing
  from public.chapter_review_sessions crs
  join public.learning_sessions ls on ls.id=crs.learning_session_id
  where crs.chapter_mastery_state_id=v_state.id and crs.status='active'
  limit 1 for update of crs,ls;
  if found then
    select * into v_review from public.chapter_review_sessions where learning_session_id=v_existing.id;
    return jsonb_build_object(
      'sessionId',v_existing.id,'reviewSessionId',v_review.id,
      'reviewContext',v_review.review_context,'required',v_review.review_requirement_id is not null,'resumed',true
    );
  end if;

  if v_state.lifecycle_state='review_required_attempt_2' then
    v_context:='required_after_attempt_1_failure';
  elsif v_state.lifecycle_state='review_required_attempt_3' then
    v_context:='required_after_attempt_2_failure';
  elsif v_state.lifecycle_state='mastery_passed' then
    v_context:='voluntary_after_mastery_pass';
  elsif v_state.lifecycle_state='mastery_failed_final' then
    v_context:='voluntary_after_final_failure';
  else
    raise exception 'chapter_review_not_available:%',v_state.lifecycle_state;
  end if;

  if v_context like 'required_%' then
    select * into v_requirement from public.chapter_review_requirements
    where chapter_mastery_state_id=v_state.id and status='required' for update;
    if not found then raise exception 'chapter_review_requirement_not_found'; end if;
  end if;

  v_target:=least(v_policy.target_review_question_count,jsonb_array_length(p_items));
  if v_target<1 or jsonb_array_length(p_items)<>v_target then raise exception 'invalid_review_item_count'; end if;

  insert into public.learning_sessions(
    student_id,curriculum_release_id,assessment_blueprint_id,unit_code,
    mode,planned_item_count,metadata,academic_mastery_policy_id
  ) values (
    p_student_id,p_curriculum_release_id,p_assessment_blueprint_id,p_unit_code,
    'chapter_review',v_target,coalesce(p_metadata,'{}'::jsonb)||jsonb_build_object('reviewContext',v_context),
    v_policy.id
  ) returning * into v_session;

  insert into public.learning_session_items(session_id,ordinal,skill_id,item_id,selection_reason)
  select v_session.id,x.ordinal,x.skill_id,x.item_id,x.selection_reason
  from jsonb_to_recordset(p_items) as x(ordinal integer,skill_id uuid,item_id uuid,selection_reason text);

  insert into public.chapter_review_sessions(
    learning_session_id,chapter_mastery_state_id,review_requirement_id,
    academic_mastery_policy_id,review_context,target_question_count
  ) values (
    v_session.id,v_state.id,case when v_context like 'required_%' then v_requirement.id else null end,
    v_policy.id,v_context,v_target
  ) returning * into v_review;

  return jsonb_build_object(
    'sessionId',v_session.id,'reviewSessionId',v_review.id,
    'reviewContext',v_context,'required',v_review.review_requirement_id is not null,'resumed',false
  );
end;
$$;

create or replace function public.finalize_chapter_review_atomic(
  p_student_id uuid,
  p_session_id uuid
) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare
  v_session public.learning_sessions%rowtype;
  v_review public.chapter_review_sessions%rowtype;
  v_state public.chapter_mastery_states%rowtype;
  v_requirement public.chapter_review_requirements%rowtype;
  v_next_state text;
begin
  select * into v_session from public.learning_sessions
  where id=p_session_id and student_id=p_student_id and mode='chapter_review' for update;
  if not found then raise exception 'chapter_review_session_not_found'; end if;
  if v_session.status<>'completed' or v_session.answered_count<v_session.planned_item_count then
    raise exception 'chapter_review_not_complete';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    p_student_id::text || '|' || v_session.curriculum_release_id::text || '|' || v_session.unit_code,0
  ));

  select * into v_review from public.chapter_review_sessions
  where learning_session_id=p_session_id for update;
  if not found then raise exception 'chapter_review_record_not_found'; end if;
  select * into v_state from public.chapter_mastery_states where id=v_review.chapter_mastery_state_id for update;

  if v_review.status='completed' then
    return jsonb_build_object(
      'reviewSessionId',v_review.id,'qualifying',v_review.qualifying,
      'lifecycleState',v_state.lifecycle_state,'idempotent',true
    );
  end if;

  if v_review.review_requirement_id is not null then
    select * into v_requirement from public.chapter_review_requirements
    where id=v_review.review_requirement_id for update;
    if v_requirement.status<>'required' then raise exception 'chapter_review_requirement_not_open'; end if;

    v_next_state:=case
      when v_requirement.required_after_attempt=1 and v_state.lifecycle_state='review_required_attempt_2'
        then 'mastery_retry_2_ready'
      when v_requirement.required_after_attempt=2 and v_state.lifecycle_state='review_required_attempt_3'
        then 'mastery_retry_3_ready'
      else null
    end;
    if v_next_state is null then raise exception 'chapter_review_transition_invalid'; end if;

    update public.chapter_review_sessions
    set status='completed',qualifying=true,completed_at=coalesce(v_session.completed_at,now())
    where id=v_review.id;
    update public.chapter_review_requirements
    set status='satisfied',qualifying_review_session_id=v_review.id,
        satisfied_at=coalesce(v_session.completed_at,now())
    where id=v_requirement.id;
    update public.chapter_mastery_states set lifecycle_state=v_next_state,updated_at=now()
    where id=v_state.id;
  else
    v_next_state:=v_state.lifecycle_state;
    update public.chapter_review_sessions
    set status='completed',qualifying=false,completed_at=coalesce(v_session.completed_at,now())
    where id=v_review.id;
  end if;

  return jsonb_build_object(
    'reviewSessionId',v_review.id,'qualifying',v_review.review_requirement_id is not null,
    'lifecycleState',v_next_state,'idempotent',false
  );
end;
$$;

revoke all on function public.start_chapter_review_atomic(uuid,uuid,uuid,text,jsonb,jsonb)
  from public,anon,authenticated;
grant execute on function public.start_chapter_review_atomic(uuid,uuid,uuid,text,jsonb,jsonb) to service_role;
revoke all on function public.finalize_chapter_review_atomic(uuid,uuid)
  from public,anon,authenticated;
grant execute on function public.finalize_chapter_review_atomic(uuid,uuid) to service_role;

-- Hints are allowed in Practice and Chapter Review, never in Mastery Check.
create or replace function public.record_remediation_help_atomic(
  p_student_id uuid,p_session_id uuid,p_session_item_id uuid,p_skill_id uuid,p_item_id uuid,
  p_stage text,p_context text,p_hint_level integer,p_guide_scope text,p_guide_source_id uuid,
  p_guide_version integer,p_item_template_id uuid,p_error_code text,p_rendered_title_hy text,
  p_rendered_strategy_hy text,p_rendered_content_hy text,p_metadata jsonb
) returns uuid
language plpgsql security invoker set search_path='' as $$
declare event_id uuid; changed integer;
begin
  if p_hint_level not between 1 and 3 then raise exception 'invalid hint level'; end if;
  update public.learning_session_items li
  set hint_level_used=p_hint_level
  from public.learning_sessions ls
  where li.id=p_session_item_id and li.session_id=p_session_id
    and li.skill_id=p_skill_id and li.item_id=p_item_id and ls.id=li.session_id
    and ls.student_id=p_student_id and ls.mode in ('practice','chapter_review')
    and ls.status='active' and coalesce(li.hint_level_used,0)=p_hint_level-1;
  get diagnostics changed=row_count;
  if changed<>1 then raise exception 'stale or invalid remediation state'; end if;
  insert into public.remediation_events(
    student_id,session_id,session_item_id,skill_id,item_id,stage,context,hint_level,
    guide_scope,guide_source_id,guide_version,item_template_id,error_code,
    rendered_title_hy,rendered_strategy_hy,rendered_content_hy,metadata
  ) values (
    p_student_id,p_session_id,p_session_item_id,p_skill_id,p_item_id,p_stage,p_context,p_hint_level,
    p_guide_scope,p_guide_source_id,p_guide_version,p_item_template_id,p_error_code,
    p_rendered_title_hy,p_rendered_strategy_hy,p_rendered_content_hy,coalesce(p_metadata,'{}'::jsonb)
  ) returning id into event_id;
  return event_id;
end;
$$;

comment on table public.chapter_review_requirements is
  'Authoritative mandatory Review gates created atomically after failed Mastery attempts 1 and 2.';
comment on table public.chapter_review_sessions is
  'First-class Chapter Review evidence, distinct from Practice and Mastery Check.';
