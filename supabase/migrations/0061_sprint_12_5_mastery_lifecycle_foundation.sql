-- Sprint 12.5A-B: universal versioned mastery policy and atomic lifecycle foundation.

create table public.academic_mastery_policy_versions (
  id uuid primary key default gen_random_uuid(),
  policy_key text not null unique,
  version_number integer not null check (version_number > 0),
  status text not null check (status in ('active','retired')),
  maximum_mastery_attempts smallint not null check (maximum_mastery_attempts = 3),
  review_required_after_failed_attempts smallint[] not null
    check (review_required_after_failed_attempts = array[1,2]::smallint[]),
  review_optional_after_pass boolean not null default true check (review_optional_after_pass),
  review_available_after_final_failure boolean not null default true check (review_available_after_final_failure),
  additional_attempt_after_final_failure boolean not null default false check (not additional_attempt_after_final_failure),
  target_review_question_count smallint not null default 12
    check (target_review_question_count between 1 and 100),
  effective_from timestamptz not null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  unique (version_number)
);

comment on table public.academic_mastery_policy_versions is
  'Append-only platform-wide Chapter Mastery and Review policies. Historical lifecycle records retain their policy version.';

create unique index academic_mastery_policy_one_active_idx
  on public.academic_mastery_policy_versions ((true)) where status='active';

alter table public.academic_mastery_policy_versions enable row level security;
revoke all on table public.academic_mastery_policy_versions from public, anon, authenticated;
grant select, insert on table public.academic_mastery_policy_versions to service_role;
revoke update, delete, truncate on table public.academic_mastery_policy_versions from service_role;

create or replace function public.reject_academic_mastery_policy_mutation()
returns trigger language plpgsql set search_path='' as $$
begin
  raise exception 'academic_mastery_policy_versions is append-only; publish a new version';
end;
$$;

create trigger academic_mastery_policy_versions_immutable
before update or delete on public.academic_mastery_policy_versions
for each row execute function public.reject_academic_mastery_policy_mutation();

insert into public.academic_mastery_policy_versions(
  policy_key, version_number, status, maximum_mastery_attempts,
  review_required_after_failed_attempts, review_optional_after_pass,
  review_available_after_final_failure, additional_attempt_after_final_failure,
  target_review_question_count, effective_from, notes
) values (
  'chapter-mastery-review-2026-r1', 1, 'active', 3,
  array[1,2]::smallint[], true, true, false, 12,
  '2026-09-21T00:00:00Z',
  'Initial universal lifecycle: at most three Mastery Checks; qualifying Chapter Review required after failures 1 and 2.'
);

create table public.chapter_mastery_states (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  curriculum_release_id uuid not null references public.curriculum_releases(id) on delete restrict,
  unit_code text not null,
  academic_mastery_policy_id uuid not null references public.academic_mastery_policy_versions(id) on delete restrict,
  lifecycle_state text not null check (lifecycle_state in (
    'mastery_ready',
    'review_required_attempt_2',
    'mastery_retry_2_ready',
    'review_required_attempt_3',
    'mastery_retry_3_ready',
    'mastery_passed',
    'mastery_failed_final'
  )),
  attempts_used smallint not null default 0 check (attempts_used between 0 and 3),
  passed_on_attempt smallint check (passed_on_attempt between 1 and 3),
  history_provenance text not null default 'exact'
    check (history_provenance in ('exact','legacy_attempt_history')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(student_id, curriculum_release_id, unit_code),
  check (
    (lifecycle_state='mastery_passed' and passed_on_attempt is not null)
    or (lifecycle_state<>'mastery_passed' and passed_on_attempt is null)
  ),
  check (lifecycle_state<>'mastery_failed_final' or attempts_used=3)
);

create table public.mastery_check_attempts (
  id uuid primary key default gen_random_uuid(),
  chapter_mastery_state_id uuid not null references public.chapter_mastery_states(id) on delete restrict,
  learning_session_id uuid not null unique references public.learning_sessions(id) on delete restrict,
  attempt_number smallint not null check (attempt_number between 1 and 3),
  academic_mastery_policy_id uuid not null references public.academic_mastery_policy_versions(id) on delete restrict,
  preceding_required_review_id uuid,
  result text check (result in ('passed','failed')),
  score_percent numeric check (score_percent between 0 and 100),
  status text not null default 'active' check (status in ('active','completed','abandoned')),
  provenance_status text not null default 'exact'
    check (provenance_status in ('exact','legacy_attempt_history')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(chapter_mastery_state_id, attempt_number),
  check (
    (status='completed' and result is not null and completed_at is not null)
    or (status<>'completed' and result is null and completed_at is null)
  )
);

create unique index mastery_check_attempts_one_active_idx
  on public.mastery_check_attempts(chapter_mastery_state_id) where status='active';
create index chapter_mastery_states_student_unit_idx
  on public.chapter_mastery_states(student_id, unit_code);
create index mastery_check_attempts_state_completed_idx
  on public.mastery_check_attempts(chapter_mastery_state_id, completed_at desc);

alter table public.chapter_mastery_states enable row level security;
alter table public.mastery_check_attempts enable row level security;
revoke all on table public.chapter_mastery_states, public.mastery_check_attempts
  from public, anon, authenticated;
grant select, insert, update on table public.chapter_mastery_states, public.mastery_check_attempts
  to service_role;
revoke delete, truncate on table public.chapter_mastery_states, public.mastery_check_attempts
  from service_role;

alter table public.learning_sessions
  add column academic_mastery_policy_id uuid
    references public.academic_mastery_policy_versions(id) on delete restrict,
  add column mastery_attempt_number smallint
    check (mastery_attempt_number between 1 and 3);

create unique index learning_sessions_one_active_mastery_check_idx
  on public.learning_sessions(student_id, curriculum_release_id, unit_code)
  where mode='mastery_check' and status='active';

-- Preserve completed legacy checks. Their chronological attempt number is exact only
-- when the stored history contains no more than the governed maximum.
with active_policy as (
  select id from public.academic_mastery_policy_versions where status='active'
), ranked as (
  select s.id, s.student_id, s.curriculum_release_id, s.unit_code,
         row_number() over (
           partition by s.student_id,s.curriculum_release_id,s.unit_code
           order by s.started_at,s.id
         )::smallint as attempt_number,
         count(*) over (
           partition by s.student_id,s.curriculum_release_id,s.unit_code
         ) as attempt_count
  from public.learning_sessions s
  where s.mode='mastery_check' and s.status='completed'
)
update public.learning_sessions s
set academic_mastery_policy_id=p.id,
    mastery_attempt_number=r.attempt_number
from ranked r cross join active_policy p
where s.id=r.id and r.attempt_count<=3;

with active_policy as (
  select id from public.academic_mastery_policy_versions where status='active'
), histories as (
  select student_id,curriculum_release_id,unit_code,
         count(*)::smallint as attempts_used,
         min(mastery_attempt_number) filter(where assessment_result='passed')::smallint as passed_on_attempt,
         count(*) filter(where mastery_attempt_number is null) as ambiguous_count
  from public.learning_sessions
  where mode='mastery_check' and status='completed'
  group by student_id,curriculum_release_id,unit_code
)
insert into public.chapter_mastery_states(
  student_id,curriculum_release_id,unit_code,academic_mastery_policy_id,
  lifecycle_state,attempts_used,passed_on_attempt,history_provenance
)
select h.student_id,h.curriculum_release_id,h.unit_code,p.id,
  case
    when h.passed_on_attempt is not null then 'mastery_passed'
    when h.attempts_used>=3 then 'mastery_failed_final'
    when h.attempts_used=2 then 'review_required_attempt_3'
    when h.attempts_used=1 then 'review_required_attempt_2'
    else 'mastery_ready'
  end,
  least(h.attempts_used,3),
  h.passed_on_attempt,
  case when h.ambiguous_count=0 then 'exact' else 'legacy_attempt_history' end
from histories h cross join active_policy p
on conflict (student_id,curriculum_release_id,unit_code) do nothing;

insert into public.mastery_check_attempts(
  chapter_mastery_state_id,learning_session_id,attempt_number,
  academic_mastery_policy_id,result,score_percent,status,
  provenance_status,started_at,completed_at
)
select cms.id,s.id,s.mastery_attempt_number,s.academic_mastery_policy_id,
       s.assessment_result,s.score_percent,'completed','exact',s.started_at,s.completed_at
from public.learning_sessions s
join public.chapter_mastery_states cms
  on cms.student_id=s.student_id
 and cms.curriculum_release_id=s.curriculum_release_id
 and cms.unit_code=s.unit_code
where s.mode='mastery_check' and s.status='completed'
  and s.mastery_attempt_number is not null
on conflict (learning_session_id) do nothing;

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
    p_student_id::text || '|' || p_curriculum_release_id::text || '|' || p_unit_code, 0
  ));

  select * into v_policy
  from public.academic_mastery_policy_versions
  where status='active';

  if not found then raise exception 'active_mastery_policy_not_found'; end if;

  select * into v_existing
  from public.learning_sessions
  where student_id=p_student_id
    and curriculum_release_id=p_curriculum_release_id
    and unit_code=p_unit_code
    and mode='mastery_check'
    and status='active'
  order by created_at desc limit 1
  for update;

  if found then
    return jsonb_build_object(
      'sessionId',v_existing.id,
      'attemptNumber',v_existing.mastery_attempt_number,
      'resumed',true
    );
  end if;

  select * into v_state
  from public.chapter_mastery_states
  where student_id=p_student_id
    and curriculum_release_id=p_curriculum_release_id
    and unit_code=p_unit_code
  for update;

  if not found then
    insert into public.chapter_mastery_states(
      student_id,curriculum_release_id,unit_code,academic_mastery_policy_id,lifecycle_state
    ) values (
      p_student_id,p_curriculum_release_id,p_unit_code,v_policy.id,'mastery_ready'
    ) returning * into v_state;
  end if;

  if v_state.academic_mastery_policy_id<>v_policy.id then
    select * into v_policy from public.academic_mastery_policy_versions
    where id=v_state.academic_mastery_policy_id;
  end if;

  v_attempt := case v_state.lifecycle_state
    when 'mastery_ready' then 1
    when 'mastery_retry_2_ready' then 2
    when 'mastery_retry_3_ready' then 3
    else null
  end;

  if v_attempt is null then
    raise exception 'mastery_check_not_allowed:%',v_state.lifecycle_state;
  end if;
  if v_attempt>v_policy.maximum_mastery_attempts then
    raise exception 'mastery_attempt_limit_reached';
  end if;
  if v_attempt<>v_state.attempts_used+1 then
    raise exception 'mastery_attempt_sequence_invalid';
  end if;

  select count(*) into v_expected_items from jsonb_array_elements(p_items);
  if v_expected_items<>p_planned_item_count then
    raise exception 'mastery_item_count_mismatch';
  end if;

  insert into public.learning_sessions(
    student_id,curriculum_release_id,assessment_blueprint_id,unit_code,
    mode,planned_item_count,metadata,academic_mastery_policy_id,mastery_attempt_number
  ) values (
    p_student_id,p_curriculum_release_id,p_assessment_blueprint_id,p_unit_code,
    'mastery_check',p_planned_item_count,coalesce(p_metadata,'{}'::jsonb),
    v_policy.id,v_attempt
  ) returning * into v_session;

  insert into public.learning_session_items(
    session_id,ordinal,skill_id,item_id,selection_reason
  )
  select v_session.id,x.ordinal,x.skill_id,x.item_id,x.selection_reason
  from jsonb_to_recordset(p_items) as x(
    ordinal integer,skill_id uuid,item_id uuid,selection_reason text
  );

  insert into public.mastery_check_attempts(
    chapter_mastery_state_id,learning_session_id,attempt_number,
    academic_mastery_policy_id,status,started_at
  ) values (
    v_state.id,v_session.id,v_attempt,v_policy.id,'active',v_session.started_at
  );

  return jsonb_build_object(
    'sessionId',v_session.id,
    'attemptNumber',v_attempt,
    'resumed',false
  );
end;
$$;

revoke all on function public.start_mastery_check_atomic(uuid,uuid,uuid,text,integer,jsonb,jsonb)
  from public,anon,authenticated;
grant execute on function public.start_mastery_check_atomic(uuid,uuid,uuid,text,integer,jsonb,jsonb)
  to service_role;

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
begin
  select * into v_session
  from public.learning_sessions
  where id=p_session_id and student_id=p_student_id and mode='mastery_check'
  for update;
  if not found then raise exception 'mastery_session_not_found'; end if;
  if v_session.status<>'completed' then raise exception 'mastery_session_not_completed'; end if;

  perform pg_advisory_xact_lock(hashtextextended(
    p_student_id::text || '|' || v_session.curriculum_release_id::text || '|' || v_session.unit_code, 0
  ));

  select * into v_attempt
  from public.mastery_check_attempts
  where learning_session_id=p_session_id
  for update;
  if not found then raise exception 'mastery_attempt_not_found'; end if;

  select * into v_state from public.chapter_mastery_states
  where id=v_attempt.chapter_mastery_state_id for update;
  select * into v_policy from public.academic_mastery_policy_versions
  where id=v_attempt.academic_mastery_policy_id;

  if v_attempt.status='completed' then
    return jsonb_build_object(
      'attemptNumber',v_attempt.attempt_number,
      'result',v_attempt.result,
      'lifecycleState',v_state.lifecycle_state,
      'idempotent',true
    );
  end if;

  if v_attempt.attempt_number<>v_state.attempts_used+1 then
    raise exception 'mastery_attempt_sequence_invalid';
  end if;

  v_expected_percent := case when v_session.answered_count=0 then 0
    else round((v_session.correct_count::numeric/v_session.answered_count::numeric)*100) end;
  if p_score_percent<>v_expected_percent then raise exception 'mastery_score_mismatch'; end if;

  v_result := case when p_passed then 'passed' else 'failed' end;
  v_next_state := case
    when p_passed then 'mastery_passed'
    when v_attempt.attempt_number=1 then 'review_required_attempt_2'
    when v_attempt.attempt_number=2 then 'review_required_attempt_3'
    when v_attempt.attempt_number=v_policy.maximum_mastery_attempts then 'mastery_failed_final'
    else null
  end;
  if v_next_state is null then raise exception 'invalid_mastery_transition'; end if;

  update public.learning_sessions
  set assessment_result=v_result,
      score_percent=p_score_percent,
      metadata=coalesce(metadata,'{}'::jsonb)||coalesce(p_result_metadata,'{}'::jsonb),
      updated_at=now()
  where id=p_session_id;

  update public.mastery_check_attempts
  set result=v_result,score_percent=p_score_percent,status='completed',completed_at=now()
  where id=v_attempt.id;

  update public.chapter_mastery_states
  set lifecycle_state=v_next_state,
      attempts_used=v_attempt.attempt_number,
      passed_on_attempt=case when p_passed then v_attempt.attempt_number else null end,
      updated_at=now()
  where id=v_state.id;

  return jsonb_build_object(
    'attemptNumber',v_attempt.attempt_number,
    'result',v_result,
    'lifecycleState',v_next_state,
    'attemptsUsed',v_attempt.attempt_number,
    'attemptsRemaining',v_policy.maximum_mastery_attempts-v_attempt.attempt_number,
    'idempotent',false
  );
end;
$$;

revoke all on function public.finalize_mastery_check_atomic(uuid,uuid,boolean,numeric,jsonb)
  from public,anon,authenticated;
grant execute on function public.finalize_mastery_check_atomic(uuid,uuid,boolean,numeric,jsonb)
  to service_role;

create or replace function public.prevent_learning_session_identity_mutation()
returns trigger language plpgsql set search_path='' as $$
begin
  if row(new.unit_code,new.mode,new.target_skill_id,new.curriculum_release_id,
         new.assessment_blueprint_id,new.provenance_status,
         new.learning_model_configuration_id,new.model_provenance_status,
         new.runtime_build_id,new.runtime_provenance_status,
         new.academic_mastery_policy_id,new.mastery_attempt_number)
     is distinct from
     row(old.unit_code,old.mode,old.target_skill_id,old.curriculum_release_id,
         old.assessment_blueprint_id,old.provenance_status,
         old.learning_model_configuration_id,old.model_provenance_status,
         old.runtime_build_id,old.runtime_provenance_status,
         old.academic_mastery_policy_id,old.mastery_attempt_number) then
    raise exception 'learning session identity and provenance are immutable after insert';
  end if;
  return new;
end;
$$;

drop trigger if exists learning_sessions_identity_immutable on public.learning_sessions;
create trigger learning_sessions_identity_immutable
before update of unit_code,mode,target_skill_id,curriculum_release_id,
  assessment_blueprint_id,provenance_status,learning_model_configuration_id,
  model_provenance_status,runtime_build_id,runtime_provenance_status,
  academic_mastery_policy_id,mastery_attempt_number
on public.learning_sessions
for each row execute function public.prevent_learning_session_identity_mutation();

comment on column public.learning_sessions.mastery_attempt_number is
  'Authoritative governed attempt number for Mastery Check sessions; never greater than three.';
comment on column public.learning_sessions.academic_mastery_policy_id is
  'Versioned platform policy under which this Mastery Check was created.';
