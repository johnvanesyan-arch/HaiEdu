-- BF-04: durable answer receipts. No re-grading, history backfill or policy changes.
-- New responses are recoverable; older responses without a receipt stay explicit.
create table private.learning_answer_receipts (
  session_item_id uuid not null references public.learning_session_items(id) on delete cascade,
  kind text not null check (kind in ('governed','legacy-answer','legacy-mastery')),
  student_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid not null references public.learning_sessions(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  attempt_id uuid references public.attempts(id) on delete cascade,
  request jsonb not null check(jsonb_typeof(request)='object'),
  core_result jsonb check(core_result is null or jsonb_typeof(core_result)='object'),
  response jsonb check(response is null or jsonb_typeof(response)='object'),
  created_at timestamptz not null default clock_timestamp(),
  primary key(session_item_id,kind)
);
alter table private.learning_answer_receipts enable row level security;
revoke all on private.learning_answer_receipts from public,anon,authenticated,service_role;
create index learning_answer_receipts_student_idx on private.learning_answer_receipts(student_id);
create index learning_answer_receipts_session_idx on private.learning_answer_receipts(session_id);
create index learning_answer_receipts_item_idx on private.learning_answer_receipts(item_id);
create index learning_answer_receipts_attempt_idx on private.learning_answer_receipts(attempt_id);
create index if not exists recommendation_issued_answer_receipt_idx
on public.recommendation_events(attempt_id,student_id,surface)
where event_type='issued' and attempt_id is not null;

create function private.protect_learning_answer_receipt() returns trigger
language plpgsql set search_path='' as $$
begin
  if (to_jsonb(new)-'response') is distinct from (to_jsonb(old)-'response')
     or old.response is not null or new.response is null then
    raise exception 'answer_receipt_immutable';
  end if;
  return new;
end;
$$;
revoke all on function private.protect_learning_answer_receipt() from public,anon,authenticated,service_role;
create trigger learning_answer_receipt_immutable before update on private.learning_answer_receipts
for each row execute function private.protect_learning_answer_receipt();

-- Keep the original accumulator and all its scoring/audio/exposure guards intact.
alter function public.service_record_session_answer_atomic(uuid,uuid,uuid,uuid,uuid,jsonb,jsonb,numeric,boolean,text,boolean,integer,timestamptz)
rename to record_session_answer_before_recovery;
alter function public.record_session_answer_before_recovery(uuid,uuid,uuid,uuid,uuid,jsonb,jsonb,numeric,boolean,text,boolean,integer,timestamptz)
set schema private;
revoke all on function private.record_session_answer_before_recovery(uuid,uuid,uuid,uuid,uuid,jsonb,jsonb,numeric,boolean,text,boolean,integer,timestamptz)
from public,anon,authenticated,service_role;

create function public.service_record_session_answer_atomic(
  p_student_id uuid,p_session_id uuid,p_session_item_id uuid,p_item_id uuid,
  p_skill_id uuid,p_response jsonb,p_normalized_response jsonb,p_score numeric,
  p_correct boolean,p_error_code text,p_hint_used boolean,p_response_time_ms integer,
  p_attempted_at timestamptz
) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.learning_sessions%rowtype; li public.learning_session_items%rowtype;
  result jsonb; receipt private.learning_answer_receipts%rowtype; snapshot jsonb;
begin
  select * into s from public.learning_sessions where id=p_session_id and student_id=p_student_id for update;
  if not found then raise exception 'invalid_or_inactive_session_item'; end if;
  if s.assessment_policy_binding_id is not null then
    return private.record_session_answer_before_recovery(p_student_id,p_session_id,p_session_item_id,p_item_id,
      p_skill_id,p_response,p_normalized_response,p_score,p_correct,p_error_code,p_hint_used,p_response_time_ms,p_attempted_at);
  end if;
  select * into li from public.learning_session_items where id=p_session_item_id and session_id=s.id
    and item_id=p_item_id and skill_id=p_skill_id for update;
  if not found then raise exception 'invalid_or_inactive_session_item'; end if;
  select * into receipt from private.learning_answer_receipts where session_item_id=li.id and kind='legacy-answer';
  if found then
    -- Compatibility RPC callers still receive their original committed core state.
    -- The learner API additionally checks the exact submitted request below.
    return receipt.core_result || jsonb_build_object('replayed',true);
  end if;
  if li.attempt_id is not null then raise exception 'answer_result_unavailable'; end if;
  result:=private.record_session_answer_before_recovery(p_student_id,p_session_id,p_session_item_id,p_item_id,
    p_skill_id,p_response,p_normalized_response,p_score,p_correct,p_error_code,p_hint_used,p_response_time_ms,p_attempted_at);
  select * into strict s from public.learning_sessions where id=s.id;
  snapshot:=result || jsonb_build_object(
    'grading',jsonb_build_object('correct',p_correct,'score',p_score,'errorCode',p_error_code,
      'feedbackCode',(select feedback_code from public.item_answer_keys where item_id=p_item_id),'usedHelp',result->'hintUsed'),
    'item',jsonb_build_object('id',p_item_id,'skill_id',p_skill_id),
    'sessionAfter',jsonb_build_object('status',s.status,'planned_item_count',s.planned_item_count,
      'answered_count',s.answered_count,'correct_count',s.correct_count));
  insert into private.learning_answer_receipts(session_item_id,kind,student_id,session_id,item_id,attempt_id,request,core_result)
  values(li.id,'legacy-answer',p_student_id,s.id,p_item_id,(result->>'attemptId')::uuid,
    jsonb_build_object('sessionId',s.id,'sessionItemId',li.id,'itemId',p_item_id,'response',p_response,
      'responseTimeMs',p_response_time_ms,'hintUsed',coalesce(p_hint_used,false)),snapshot);
  return snapshot;
end;
$$;
revoke all on function public.service_record_session_answer_atomic(uuid,uuid,uuid,uuid,uuid,jsonb,jsonb,numeric,boolean,text,boolean,integer,timestamptz) from public,anon,authenticated;
grant execute on function public.service_record_session_answer_atomic(uuid,uuid,uuid,uuid,uuid,jsonb,jsonb,numeric,boolean,text,boolean,integer,timestamptz) to service_role;

-- One transaction wins final response + telemetry publication. An interrupted
-- Edge response builder can resume from the frozen core state without grading.
create function public.service_legacy_answer_response(
  p_student_id uuid,p_auth_session_id uuid,p_kind text,p_request jsonb,
  p_response jsonb default null,p_telemetry jsonb default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.learning_sessions%rowtype; li public.learning_session_items%rowtype;
  r private.learning_answer_receipts%rowtype; core private.learning_answer_receipts%rowtype;
  final jsonb; event_id uuid; issued public.recommendation_events%rowtype;
begin
  if p_kind is null or p_kind not in ('legacy-answer','legacy-mastery') or jsonb_typeof(p_request) is distinct from 'object'
    or public.service_validate_active_session(p_student_id,p_auth_session_id) is distinct from true then raise exception 'learning_context_unavailable'; end if;
  select * into s from public.learning_sessions where id=(p_request->>'sessionId')::uuid and student_id=p_student_id for update;
  if not found or s.assessment_policy_binding_id is not null or s.status not in ('active','completed')
    or (p_kind='legacy-mastery' and s.mode<>'mastery_check')
    or not public.service_is_registered_legacy_learning_session(p_student_id,s.id)
    then raise exception 'learning_context_unavailable'; end if;
  select * into li from public.learning_session_items where id=(p_request->>'sessionItemId')::uuid
    and session_id=s.id and item_id=(p_request->>'itemId')::uuid for update;
  if not found then raise exception 'learning_context_unavailable'; end if;
  select * into r from private.learning_answer_receipts where session_item_id=li.id and kind=p_kind;
  if found and (r.student_id<>p_student_id or r.session_id<>s.id or r.request is distinct from p_request)
    then raise exception 'answer_response_conflict'; end if;
  if r.response is not null then return jsonb_build_object('response',r.response,'replayed',true); end if;
  select * into core from private.learning_answer_receipts where session_item_id=li.id and kind='legacy-answer';
  if core.session_item_id is not null and core.request is distinct from p_request then raise exception 'answer_response_conflict'; end if;
  if p_response is null then
    if li.attempt_id is not null and core.session_item_id is null then raise exception 'answer_result_unavailable'; end if;
    return jsonb_build_object('response',null,'coreResult',core.core_result,'replayed',false);
  end if;
  if core.attempt_id is null or core.attempt_id is distinct from li.attempt_id or jsonb_typeof(p_response) is distinct from 'object'
    then raise exception 'answer_result_unavailable'; end if;
  final:=p_response;
  if p_telemetry is not null then
    if p_kind<>'legacy-answer' or s.mode in ('diagnostic','mastery_check') then raise exception 'answer_response_invalid'; end if;
    select * into issued from public.recommendation_events
      where student_id=p_student_id and attempt_id=li.attempt_id and event_type='issued'
        and policy_scope='core_after_attempt' and surface=p_telemetry->>'surface' order by id limit 1;
    if found then
      -- A SQL-before-Edge rollout may already have an issued legacy recommendation.
      event_id:=issued.recommendation_instance_id;
      final:=jsonb_set(final,'{recommendation}',(final->'recommendation')||issued.recommendation_snapshot);
    else
    begin
    event_id:=gen_random_uuid();
    insert into public.recommendation_events(recommendation_instance_id,student_id,event_type,policy_scope,surface,
      action,target_skill_id,curriculum_release_id,assessment_blueprint_id,learning_model_configuration_id,
      model_provenance_status,learning_session_id,attempt_id,state_snapshot,recommendation_snapshot)
    values(event_id,p_student_id,'issued',p_telemetry->>'policyScope',p_telemetry->>'surface',p_telemetry->>'action',
      (p_telemetry->>'targetSkillId')::uuid,s.curriculum_release_id,s.assessment_blueprint_id,s.learning_model_configuration_id,
      coalesce(p_telemetry->>'modelProvenanceStatus','unbound_legacy'),s.id,li.attempt_id,
      p_telemetry->'stateSnapshot',p_telemetry->'recommendationSnapshot');
    exception when others then
      -- Preserve the existing optional telemetry contract: a saved answer is
      -- still delivered if telemetry is unavailable. Never retry issuance on replay.
      event_id:=null;
      raise log 'answer recommendation telemetry unavailable (%)',SQLSTATE;
    end;
    end if;
    final:=jsonb_set(final,'{recommendation,instanceId}',coalesce(to_jsonb(event_id),'null'::jsonb));
  end if;
  if r.session_item_id is null then
    insert into private.learning_answer_receipts(session_item_id,kind,student_id,session_id,item_id,attempt_id,request,response)
    values(li.id,p_kind,p_student_id,s.id,li.item_id,li.attempt_id,p_request,final);
  else
    update private.learning_answer_receipts set response=final where session_item_id=li.id and kind=p_kind;
  end if;
  return jsonb_build_object('response',final,'replayed',false);
end;
$$;
revoke all on function public.service_legacy_answer_response(uuid,uuid,text,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.service_legacy_answer_response(uuid,uuid,text,jsonb,jsonb,jsonb) to service_role;

-- Wrap the current complete governed transaction, including final assessment,
-- remediation/recommendation and frozen mastery. Drafts/reads/help are unchanged.
alter function public.service_governed_learning_operation(uuid,uuid,uuid,text,jsonb) rename to governed_operation_before_recovery;
alter function public.governed_operation_before_recovery(uuid,uuid,uuid,text,jsonb) set schema private;
revoke all on function private.governed_operation_before_recovery(uuid,uuid,uuid,text,jsonb) from public,anon,authenticated,service_role;
create function public.service_governed_learning_operation(
  p_student_id uuid,p_auth_session_id uuid,p_session_id uuid,p_action text,p_payload jsonb default '{}'
) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.learning_sessions%rowtype; li public.learning_session_items%rowtype;
  r private.learning_answer_receipts%rowtype; result jsonb;
begin
  if p_action is distinct from 'answer' then
    return private.governed_operation_before_recovery(p_student_id,p_auth_session_id,p_session_id,p_action,p_payload);
  end if;
  s:=private.lock_governed_learning_session(p_student_id,p_auth_session_id,p_session_id);
  if s.status not in ('active','completed') or
    (p_payload->>'expectedMode' is not null and s.mode<>p_payload->>'expectedMode') then raise exception 'learning_context_unavailable'; end if;
  select * into li from public.learning_session_items where id=(p_payload->>'sessionItemId')::uuid
    and session_id=s.id and item_id=(p_payload->>'itemId')::uuid for update;
  if not found then raise exception 'learning_context_unavailable'; end if;
  select * into r from private.learning_answer_receipts where session_item_id=li.id and kind='governed';
  if found then
    if r.student_id<>p_student_id or r.request is distinct from p_payload then raise exception 'answer_response_conflict'; end if;
    return private.authorized_governed_result(p_student_id,p_auth_session_id,s.institutional_class_enrollment_id,
      s.curriculum_release_id,s.governed_unit_id,r.response || jsonb_build_object('replayed',true));
  end if;
  if li.attempt_id is not null or li.answered_at is not null then raise exception 'answer_result_unavailable'; end if;
  result:=private.governed_operation_before_recovery(p_student_id,p_auth_session_id,p_session_id,p_action,p_payload);
  insert into private.learning_answer_receipts(session_item_id,kind,student_id,session_id,item_id,attempt_id,request,response)
  values(li.id,'governed',p_student_id,s.id,li.item_id,(result->>'attemptId')::uuid,p_payload,result);
  return result;
end;
$$;
revoke all on function public.service_governed_learning_operation(uuid,uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.service_governed_learning_operation(uuid,uuid,uuid,text,jsonb) to service_role;
