-- Keep hint charging and the expected question phase in the same transaction.
-- This replacement preserves the existing recorder and answer recovery grants.
create or replace function public.record_remediation_help_atomic(
  p_student_id uuid,p_session_id uuid,p_session_item_id uuid,p_skill_id uuid,p_item_id uuid,
  p_stage text,p_context text,p_hint_level integer,p_guide_scope text,p_guide_source_id uuid,
  p_guide_version integer,p_item_template_id uuid,p_error_code text,p_rendered_title_hy text,
  p_rendered_strategy_hy text,p_rendered_content_hy text,p_metadata jsonb
) returns uuid
language plpgsql security invoker set search_path='' as $$
declare event_id uuid; changed integer; s public.learning_sessions%rowtype;
begin
  if p_hint_level not between 1 and 3 then raise exception 'invalid hint level'; end if;
  select * into s from public.learning_sessions
  where id=p_session_id and student_id=p_student_id for update;
  if not found or s.mode not in ('practice','chapter_review') then
    raise exception 'learning_context_unavailable';
  end if;

  update public.learning_session_items li
  set hint_level_used=p_hint_level
  where li.id=p_session_item_id and li.session_id=s.id
    and li.skill_id=p_skill_id and li.item_id=p_item_id
    and s.status='active' and coalesce(li.hint_level_used,0)=p_hint_level-1
    and (
      (p_context='pre_answer' and li.answered_at is null and li.ordinal=s.answered_count+1)
      or
      (p_context='post_error' and li.answered_at is not null and li.correct is false
        and li.ordinal=s.answered_count and not exists (
          select 1 from public.student_item_exposure_events e
          join public.learning_session_items newer on newer.id=e.session_item_id
          where e.session_id=s.id and newer.ordinal>li.ordinal
        ))
    );
  get diagnostics changed=row_count;
  if changed<>1 then raise exception 'hint_state_conflict' using errcode='HNT01'; end if;
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

create or replace function public.service_governed_learning_operation(
  p_student_id uuid,p_auth_session_id uuid,p_session_id uuid,p_action text,p_payload jsonb default '{}'
) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.learning_sessions%rowtype; li public.learning_session_items%rowtype;
  r private.learning_answer_receipts%rowtype; result jsonb; hint_state jsonb;
begin
  if p_action='help' and p_payload ? 'hintState' then
    -- Authorize before inspecting the learner's saved state. The session lock
    -- serializes help with the governed answer and serve paths.
    s:=private.lock_governed_learning_session(p_student_id,p_auth_session_id,p_session_id);
    if s.mode not in ('practice','chapter_review') then raise exception 'help_not_available_in_assessment'; end if;
    select * into li from public.learning_session_items
    where id=(p_payload->>'sessionItemId')::uuid and session_id=s.id;
    if not found then raise exception 'learning_context_unavailable'; end if;
    hint_state:=p_payload->'hintState';
    if s.status<>'active' or coalesce(li.hint_level_used,0)>=3
      or to_jsonb(coalesce(li.hint_level_used,0)) is distinct from hint_state->'level'
      or to_jsonb(li.answered_at is not null) is distinct from hint_state->'afterAnswer'
      or (li.answered_at is null and li.ordinal<>s.answered_count+1) then
      raise exception 'hint_state_conflict' using errcode='HNT01';
    end if;
  end if;
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
