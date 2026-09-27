-- Universal chapter prerequisite: no subject, grade, school, class, or score exceptions.
-- Existing evidence and unfinished practice remain intact.
create or replace function public.has_completed_chapter_diagnostic(p_student_id uuid, p_unit_code text)
returns boolean language sql stable security invoker set search_path = '' as $$
  select exists (select 1 from public.learning_sessions
    where student_id = p_student_id and unit_code = p_unit_code
      and mode = 'diagnostic' and status = 'completed');
$$;
revoke all on function public.has_completed_chapter_diagnostic(uuid,text) from public, anon, authenticated;
grant execute on function public.has_completed_chapter_diagnostic(uuid,text) to service_role;

create or replace function public.guard_practice_diagnostic_session()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.mode in ('practice', 'chapter_review') and new.status in ('active', 'completed') then
    -- Do not reinterpret or prevent routine maintenance of historical completed records.
    if tg_op = 'UPDATE' and old.status = 'completed' and
      (new.student_id,new.unit_code,new.mode,new.status) is not distinct from
      (old.student_id,old.unit_code,old.mode,old.status) then return new; end if;
    if not public.has_completed_chapter_diagnostic(new.student_id,new.unit_code) then
      raise exception 'chapter_diagnostic_required' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.guard_practice_diagnostic_session() from public, anon, authenticated;
grant execute on function public.guard_practice_diagnostic_session() to service_role;
create trigger learning_sessions_practice_diagnostic_guard before insert or update on public.learning_sessions
  for each row execute function public.guard_practice_diagnostic_session();

create or replace function public.guard_practice_diagnostic_item()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare v_session public.learning_sessions%rowtype;
begin
  select * into v_session from public.learning_sessions where id = new.session_id;
  if v_session.mode in ('practice', 'chapter_review') and
     not public.has_completed_chapter_diagnostic(v_session.student_id,v_session.unit_code) then
    raise exception 'chapter_diagnostic_required' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_practice_diagnostic_item() from public, anon, authenticated;
grant execute on function public.guard_practice_diagnostic_item() to service_role;
create trigger learning_session_items_practice_diagnostic_guard before insert or update on public.learning_session_items
  for each row execute function public.guard_practice_diagnostic_item();

create or replace function public.guard_practice_diagnostic_attempt()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare v_unit text; v_mode text;
begin
  if new.learning_session_id is not null then
    select unit_code,mode into v_unit,v_mode from public.learning_sessions
      where id = new.learning_session_id and student_id = new.student_id;
  else
    -- Legacy sessionless callers must still have an exact chapter and its diagnostic.
    select u.code,b.purpose into v_unit,v_mode from public.assessment_blueprints b
      join public.units u on u.id=b.unit_id where b.id=new.assessment_blueprint_id;
    v_mode := 'practice';
  end if;
  if v_unit is null then raise exception 'practice_chapter_context_required'; end if;
  if v_mode in ('practice', 'chapter_review') and
     not public.has_completed_chapter_diagnostic(new.student_id,v_unit) then
    raise exception 'chapter_diagnostic_required' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_practice_diagnostic_attempt() from public, anon, authenticated;
grant execute on function public.guard_practice_diagnostic_attempt() to service_role;
create trigger attempts_practice_diagnostic_guard before insert on public.attempts
  for each row execute function public.guard_practice_diagnostic_attempt();

-- A locked pre-diagnostic practice session does not block starting/resuming the diagnostic.
-- Its header, answers, and progress are preserved and become usable after completion.
create or replace function public.start_initial_diagnostic_atomic(
  p_student_id uuid, p_unit_code text, p_curriculum_release_id uuid,
  p_assessment_blueprint_id uuid, p_form_id uuid, p_items jsonb
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_session public.learning_sessions%rowtype;
  v_form public.assessment_forms%rowtype;
  v_pool public.assessment_pools%rowtype;
  v_count integer;
begin
  if p_student_id is null or p_unit_code is null then raise exception 'invalid_diagnostic_context'; end if;
  perform pg_advisory_xact_lock(hashtextextended('initial-diagnostic:' || p_student_id::text || ':' || p_unit_code, 0));
  select * into v_session from public.learning_sessions
    where student_id = p_student_id and unit_code = p_unit_code and mode = 'diagnostic' and status = 'completed'
    order by completed_at, id limit 1;
  if found then
    return jsonb_build_object('diagnosticCompleted', true, 'baselineSessionId', v_session.id);
  end if;
  select * into v_session from public.learning_sessions
    where student_id = p_student_id and unit_code = p_unit_code and status = 'active'
      and mode not in ('practice', 'chapter_review')
    order by started_at, id limit 1;
  if found then
    if v_session.mode = 'diagnostic' then
      return jsonb_build_object('session', to_jsonb(v_session), 'resumed', true);
    end if;
    return jsonb_build_object('activeSession', to_jsonb(v_session));
  end if;

  select * into v_form from public.assessment_forms where id = p_form_id and status = 'active';
  if not found then raise exception 'invalid_diagnostic_form'; end if;
  select * into v_pool from public.assessment_pools
    where id = v_form.pool_id and unit_code = p_unit_code and purpose = 'diagnostic' and status = 'active';
  if not found then raise exception 'invalid_diagnostic_pool'; end if;
  if not exists (select 1 from public.assessment_blueprints b join public.units u on u.id = b.unit_id
    where b.id = p_assessment_blueprint_id and b.curriculum_release_id = p_curriculum_release_id
      and b.assessment_pool_id = v_pool.id and b.purpose = 'diagnostic'
      and b.status in ('pilot', 'production') and u.code = p_unit_code) then
    raise exception 'invalid_diagnostic_blueprint';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'invalid_diagnostic_items'; end if;
  select count(*) into v_count from public.assessment_form_items where form_id = p_form_id;
  if v_count = 0 or jsonb_array_length(p_items) <> v_count then raise exception 'incomplete_diagnostic_form'; end if;
  if (select count(distinct (value->>'item_id')) from jsonb_array_elements(p_items)) <> v_count then
    raise exception 'duplicate_diagnostic_items';
  end if;
  if exists (select 1 from jsonb_array_elements(p_items) entry
    where not exists (select 1 from public.assessment_form_items fi
      join public.items i on i.id = fi.item_id
      join public.assessment_blueprint_items bi on bi.item_id = i.id and bi.assessment_blueprint_id = p_assessment_blueprint_id
      where fi.form_id = p_form_id and i.id = (entry->>'item_id')::uuid
        and i.skill_id = (entry->>'skill_id')::uuid and i.status = 'published')) then
    raise exception 'ineligible_diagnostic_item';
  end if;
  -- Retain the existing two-items-per-skill diagnostic blueprint contract.
  if exists (select 1 from jsonb_array_elements(p_items) entry group by entry->>'skill_id' having count(*) <> 2) then
    raise exception 'invalid_diagnostic_skill_coverage';
  end if;

  insert into public.learning_sessions
    (student_id, unit_code, mode, curriculum_release_id, assessment_blueprint_id, planned_item_count, metadata)
  values (p_student_id, p_unit_code, 'diagnostic', p_curriculum_release_id, p_assessment_blueprint_id, v_count,
    jsonb_build_object('itemsPerSkill', 2, 'noRepeats', true, 'poolCode', v_pool.code,
      'selectionPolicyVersion', 'single-initial-diagnostic-v1', 'formCode', v_form.code,
      'formVersion', v_form.form_version, 'formSelectionReason', 'stable_student_chapter_assignment',
      'provisionalParallelism', true, 'maximumCompletedAttempts', 1))
    returning * into v_session;
  insert into public.learning_session_items (session_id, ordinal, skill_id, item_id, selection_reason)
    select v_session.id, ord::integer, (entry->>'skill_id')::uuid, (entry->>'item_id')::uuid,
      'diagnostic_initial_assignment:' || v_form.code
    from jsonb_array_elements(p_items) with ordinality as x(entry, ord);
  return jsonb_build_object('session', to_jsonb(v_session), 'resumed', false);
end;
$$;
revoke all on function public.start_initial_diagnostic_atomic(uuid,text,uuid,uuid,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.start_initial_diagnostic_atomic(uuid,text,uuid,uuid,uuid,jsonb) to service_role;

comment on function public.start_initial_diagnostic_atomic(uuid,text,uuid,uuid,uuid,jsonb)
  is 'Service-only single initial diagnostic. Edge authentication and course entitlement remain mandatory. Historical answers are never reset.';
