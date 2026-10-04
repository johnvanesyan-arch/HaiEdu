-- Atomic evidence accumulation. No content, historical evidence, model configuration,
-- threshold, enrolment, diagnostic prerequisite or release-gate changes.
-- The transaction boundary is shared core; weighted evidence uses the attempt's
-- existing immutable learning-model configuration (linear difficulty contract).
create or replace function private.apply_configured_mastery_attempt(p_attempt_id uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  a public.attempts%rowtype;
  m public.student_skill_mastery_by_release%rowtype;
  v_model_id uuid; v_rules jsonb; v_difficulty double precision; v_terms text[];
  v_alpha double precision; v_beta double precision; v_count integer; v_score double precision;
  v_weight double precision; v_hint_factor double precision; v_status public.mastery_status;
  v_before jsonb; v_after jsonb;
begin
  select * into strict a from public.attempts where id = p_attempt_id;
  select difficulty into strict v_difficulty from public.items
    where id = a.item_id and skill_id = a.skill_id;
  if a.learning_session_id is not null then
    select learning_model_configuration_id into v_model_id
    from public.learning_sessions where id = a.learning_session_id
      and student_id = a.student_id and curriculum_release_id = a.curriculum_release_id;
  end if;
  if v_model_id is null then
    select b.learning_model_configuration_id into strict v_model_id
    from public.learning_model_runtime_bindings b
    join public.item_curriculum_scopes s on s.item_id = a.item_id and s.is_primary
    join public.units u on u.id = s.unit_id and u.code = b.unit_code
    where b.curriculum_release_id = a.curriculum_release_id and b.status = 'active';
  end if;
  select configuration->'mastery' into strict v_rules
    from public.learning_model_configurations where id = v_model_id;
  -- Recognize a numeric intercept + numeric slope * difficulty, never execute SQL
  -- from configuration. Future different model contracts require their own adapter.
  v_terms := pg_catalog.regexp_match(v_rules#>>'{difficultyWeight,formula}',
    '^([0-9]+[.]?[0-9]*) [+] ([0-9]+[.]?[0-9]*)[*]difficulty$');
  if v_terms is null or not (v_rules ?& array['priorAlpha','priorBeta',
      'minimumEvidenceCount','needsSupportBelow','secureAtOrAbove',
      'hintedPositiveMultiplier','incorrectEvidenceHintReduction'])
     or not ((v_rules->'difficultyWeight') ?& array['difficultyMin','difficultyMax'])
     or (v_rules->>'incorrectEvidenceHintReduction')::boolean is distinct from false
     or (v_rules->>'priorAlpha')::numeric <= 0 or (v_rules->>'priorBeta')::numeric <= 0
     or (v_rules->>'minimumEvidenceCount')::integer < 1
     or (v_rules->>'hintedPositiveMultiplier')::numeric <= 0
     or (v_rules->>'hintedPositiveMultiplier')::numeric > 1
     or (v_rules->>'needsSupportBelow')::numeric < 0
     or (v_rules->>'secureAtOrAbove')::numeric > 1
     or (v_rules->>'secureAtOrAbove')::numeric <= (v_rules->>'needsSupportBelow')::numeric
     or (v_rules#>>'{difficultyWeight,difficultyMax}')::numeric < (v_rules#>>'{difficultyWeight,difficultyMin}')::numeric
  then raise exception 'unsupported_learning_model_mastery_contract'; end if;
  -- Preserve the TypeScript model's binary64 arithmetic, including band boundaries.
  v_difficulty := greatest((v_rules#>>'{difficultyWeight,difficultyMin}')::double precision,
    least((v_rules#>>'{difficultyWeight,difficultyMax}')::double precision,v_difficulty));
  v_weight := v_terms[1]::double precision + v_terms[2]::double precision * v_difficulty;
  if v_weight <= 0 then raise exception 'invalid_mastery_evidence_weight'; end if;
  v_score := greatest(0,least(1,a.score));
  v_hint_factor := case when a.hint_used and v_score > 0
    then (v_rules->>'hintedPositiveMultiplier')::double precision else 1 end;

  -- Covers absent rows and also serializes the legacy mirror across releases.
  -- A hash collision can only serialize unrelated writes, never mix their state.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'mastery-evidence:' || a.student_id::text || ':' || a.skill_id::text, 0));
  select * into m from public.student_skill_mastery_by_release
    where curriculum_release_id=a.curriculum_release_id and student_id=a.student_id
      and skill_id=a.skill_id for update;
  v_alpha := coalesce(m.alpha_evidence::double precision,(v_rules->>'priorAlpha')::double precision);
  v_beta := coalesce(m.beta_evidence::double precision,(v_rules->>'priorBeta')::double precision);
  v_count := coalesce(m.evidence_count,0);
  v_before := jsonb_build_object('alpha',v_alpha,'beta',v_beta,
    'masteryScore',v_alpha/(v_alpha+v_beta),'evidenceCount',v_count,
    'status',coalesce(m.status,'insufficient_evidence'::public.mastery_status));
  v_alpha := v_alpha + v_score*(v_weight*v_hint_factor);
  v_beta := v_beta + (1-v_score)*v_weight;
  v_count := v_count + 1;
  v_score := v_alpha/(v_alpha+v_beta);
  v_status := case
    when v_count < (v_rules->>'minimumEvidenceCount')::integer then 'insufficient_evidence'
    when v_score < (v_rules->>'needsSupportBelow')::double precision then 'needs_support'
    when v_score < (v_rules->>'secureAtOrAbove')::double precision then 'developing'
    else 'secure' end;
  insert into public.student_skill_mastery_by_release(
    curriculum_release_id,student_id,skill_id,alpha_evidence,beta_evidence,
    mastery_score,evidence_count,status,last_attempt_at,updated_at
  ) values (a.curriculum_release_id,a.student_id,a.skill_id,v_alpha::text::numeric,v_beta::text::numeric,
    v_score::text::numeric,v_count,v_status,a.created_at,a.created_at)
  on conflict (curriculum_release_id,student_id,skill_id) do update set
    alpha_evidence=excluded.alpha_evidence,beta_evidence=excluded.beta_evidence,
    mastery_score=excluded.mastery_score,evidence_count=excluded.evidence_count,
    status=excluded.status,last_attempt_at=excluded.last_attempt_at,updated_at=excluded.updated_at;
  insert into public.student_skill_mastery(student_id,skill_id,alpha_evidence,
    beta_evidence,mastery_score,evidence_count,status,last_attempt_at,updated_at)
  values (a.student_id,a.skill_id,v_alpha::text::numeric,v_beta::text::numeric,v_score::text::numeric,v_count,v_status,a.created_at,a.created_at)
  on conflict (student_id,skill_id) do update set
    alpha_evidence=excluded.alpha_evidence,beta_evidence=excluded.beta_evidence,
    mastery_score=excluded.mastery_score,evidence_count=excluded.evidence_count,
    status=excluded.status,last_attempt_at=excluded.last_attempt_at,updated_at=excluded.updated_at;
  v_after := jsonb_build_object('alpha',v_alpha,'beta',v_beta,'masteryScore',v_score,
    'evidenceCount',v_count,'status',v_status);
  return jsonb_build_object('masteryBefore',v_before,'masteryAfter',v_after,
    'hintUsed',a.hint_used,'modelConfigurationId',v_model_id);
end;
$$;
revoke all on function private.apply_configured_mastery_attempt(uuid)
  from public,anon,authenticated,service_role;

create or replace function public.service_record_session_answer_atomic(
  p_student_id uuid,p_session_id uuid,p_session_item_id uuid,p_item_id uuid,
  p_skill_id uuid,p_response jsonb,p_normalized_response jsonb,p_score numeric,
  p_correct boolean,p_error_code text,p_hint_used boolean,p_response_time_ms integer,
  p_attempted_at timestamptz
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  s public.learning_sessions%rowtype; i public.learning_session_items%rowtype;
  v_attempt_id uuid; v_result jsonb; v_answered integer; v_planned integer;
begin
  select * into s from public.learning_sessions where id=p_session_id
    and student_id=p_student_id for update;
  if not found then raise exception 'invalid_or_inactive_session_item'; end if;
  select * into i from public.learning_session_items where id=p_session_item_id
    and session_id=p_session_id and item_id=p_item_id and skill_id=p_skill_id for update;
  if not found then raise exception 'invalid_or_inactive_session_item'; end if;
  if i.attempt_id is not null then
    return jsonb_build_object('attemptId',i.attempt_id,'replayed',true);
  end if;
  if s.status <> 'active' or i.answered_at is not null then
    raise exception 'invalid_or_inactive_session_item'; end if;
  -- Help is server-owned, read again after acquiring the assignment lock.
  p_hint_used := coalesce(i.hint_level_used,0)>0;
  insert into public.attempts(student_id,item_id,skill_id,response,normalized_response,
    score,correct,error_code,hint_used,response_time_ms,created_at,
    learning_session_id,learning_session_item_id)
  values(p_student_id,p_item_id,p_skill_id,p_response,p_normalized_response,p_score,
    p_correct,p_error_code,p_hint_used,p_response_time_ms,p_attempted_at,
    p_session_id,p_session_item_id) returning id into v_attempt_id;
  v_result := private.apply_configured_mastery_attempt(v_attempt_id);
  update public.learning_session_items set attempt_id=v_attempt_id,correct=p_correct,
    answered_at=p_attempted_at where id=p_session_item_id;
  perform public.service_finalize_item_exposure(p_student_id,p_session_id,
    p_session_item_id,p_item_id,v_attempt_id,p_correct,p_hint_used,p_response_time_ms,p_attempted_at);
  update public.learning_sessions set answered_count=answered_count+1,
    correct_count=correct_count+case when p_correct then 1 else 0 end,updated_at=p_attempted_at
    where id=p_session_id returning planned_item_count,answered_count into v_planned,v_answered;
  if v_answered>=v_planned then
    update public.learning_sessions set status='completed',completed_at=p_attempted_at,
      updated_at=p_attempted_at where id=p_session_id;
  end if;
  return v_result || jsonb_build_object('attemptId',v_attempt_id,'replayed',false);
end;
$$;
revoke all on function public.service_record_session_answer_atomic(uuid,uuid,uuid,uuid,uuid,jsonb,jsonb,numeric,boolean,text,boolean,integer,timestamptz) from public,anon,authenticated;
grant execute on function public.service_record_session_answer_atomic(uuid,uuid,uuid,uuid,uuid,jsonb,jsonb,numeric,boolean,text,boolean,integer,timestamptz) to service_role;

create or replace function public.service_record_answer_atomic(
  p_student_id uuid,p_item_id uuid,p_skill_id uuid,p_response jsonb,
  p_normalized_response jsonb,p_score numeric,p_correct boolean,p_error_code text,
  p_hint_used boolean,p_response_time_ms integer,p_attempted_at timestamptz
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_attempt_id uuid; v_result jsonb;
begin
  -- Existing provenance and diagnostic prerequisite triggers still run here.
  insert into public.attempts(student_id,item_id,skill_id,response,normalized_response,
    score,correct,error_code,hint_used,response_time_ms,created_at)
  values(p_student_id,p_item_id,p_skill_id,p_response,p_normalized_response,p_score,
    p_correct,p_error_code,p_hint_used,p_response_time_ms,p_attempted_at)
  returning id into v_attempt_id;
  v_result := private.apply_configured_mastery_attempt(v_attempt_id);
  return v_result || jsonb_build_object('attemptId',v_attempt_id,'replayed',false);
end;
$$;
revoke all on function public.service_record_answer_atomic(uuid,uuid,uuid,jsonb,jsonb,numeric,boolean,text,boolean,integer,timestamptz) from public,anon,authenticated;
grant execute on function public.service_record_answer_atomic(uuid,uuid,uuid,jsonb,jsonb,numeric,boolean,text,boolean,integer,timestamptz) to service_role;

-- Preserve old signatures for an ordered SQL-before-Edge deployment and any old
-- callers. Absolute precomputed mastery inputs are no longer used to overwrite state.
create or replace function public.record_session_graded_attempt(
  p_student_id uuid,p_session_id uuid,p_session_item_id uuid,p_item_id uuid,p_skill_id uuid,
  p_response jsonb,p_normalized_response jsonb,p_score numeric,p_correct boolean,
  p_error_code text,p_hint_used boolean,p_response_time_ms integer,p_alpha numeric,
  p_beta numeric,p_mastery_score numeric,p_evidence_count integer,
  p_status public.mastery_status,p_attempted_at timestamptz
) returns uuid language sql security definer set search_path = '' as $$
  select (public.service_record_session_answer_atomic(p_student_id,p_session_id,
    p_session_item_id,p_item_id,p_skill_id,p_response,p_normalized_response,p_score,
    p_correct,p_error_code,p_hint_used,p_response_time_ms,p_attempted_at)->>'attemptId')::uuid;
$$;
revoke all on function public.record_session_graded_attempt(uuid,uuid,uuid,uuid,uuid,jsonb,jsonb,numeric,boolean,text,boolean,integer,numeric,numeric,numeric,integer,public.mastery_status,timestamptz) from public,anon,authenticated;
grant execute on function public.record_session_graded_attempt(uuid,uuid,uuid,uuid,uuid,jsonb,jsonb,numeric,boolean,text,boolean,integer,numeric,numeric,numeric,integer,public.mastery_status,timestamptz) to service_role;
create or replace function public.record_graded_attempt(
  p_student_id uuid,p_item_id uuid,p_skill_id uuid,p_response jsonb,
  p_normalized_response jsonb,p_score numeric,p_correct boolean,p_error_code text,
  p_hint_used boolean,p_response_time_ms integer,p_alpha numeric,p_beta numeric,
  p_mastery_score numeric,p_evidence_count integer,p_status public.mastery_status,
  p_attempted_at timestamptz
) returns uuid language sql security definer set search_path = '' as $$
  select (public.service_record_answer_atomic(p_student_id,p_item_id,p_skill_id,
    p_response,p_normalized_response,p_score,p_correct,p_error_code,p_hint_used,
    p_response_time_ms,p_attempted_at)->>'attemptId')::uuid;
$$;
revoke all on function public.record_graded_attempt(uuid,uuid,uuid,jsonb,jsonb,numeric,boolean,text,boolean,integer,numeric,numeric,numeric,integer,public.mastery_status,timestamptz) from public,anon,authenticated;
grant execute on function public.record_graded_attempt(uuid,uuid,uuid,jsonb,jsonb,numeric,boolean,text,boolean,integer,numeric,numeric,numeric,integer,public.mastery_status,timestamptz) to service_role;
