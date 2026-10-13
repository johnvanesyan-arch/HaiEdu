-- Opt-in whole-form mastery assignment. No release, content or learner data is seeded.
-- The exact v1 assessmentPolicy contract and unconfigured dynamic selection remain intact.
-- Durable fences force a PostgreSQL serialization error if a Repeatable Read
-- mutation waited for a first binding that its older snapshot cannot see.
create table private.mastery_form_serialization_fences (
 fence_kind text not null check(fence_kind in ('learner','item','form','pool')),
 entity_id uuid not null,
 generation bigint not null default 1,
 primary key(fence_kind,entity_id)
);
alter table private.mastery_form_serialization_fences enable row level security;
revoke all on private.mastery_form_serialization_fences from public,anon,authenticated,service_role;
create function private.advance_mastery_form_fence(p_kind text,p_entity uuid)
returns void language plpgsql set search_path='' as $$
begin
 insert into private.mastery_form_serialization_fences(fence_kind,entity_id) values(p_kind,p_entity)
 on conflict(fence_kind,entity_id) do update set generation=private.mastery_form_serialization_fences.generation+1;
end;
$$;

create table private.mastery_form_selection_bindings (
 assessment_policy_binding_id uuid primary key references public.assessment_policy_bindings(id),
 selection_snapshot jsonb not null,
 snapshot_fingerprint text generated always as (md5(selection_snapshot::text)) stored,
 created_at timestamptz not null default now()
);
alter table private.mastery_form_selection_bindings enable row level security;
revoke all on private.mastery_form_selection_bindings from public,anon,authenticated,service_role;
create trigger mastery_form_selection_bindings_immutable before update or delete
 on private.mastery_form_selection_bindings for each row
 execute function private.reject_assessment_policy_binding_mutation();

create function private.validate_mastery_form_selection(p_blueprint_id uuid,p_policy jsonb)
returns jsonb language plpgsql set search_path='' as $$
declare bp public.assessment_blueprints%rowtype; config jsonb; manifest jsonb; form record; entry record;
 form_ids uuid[]; form_items jsonb; forms jsonb:='[]'; previous jsonb; n integer;
begin
 select * into strict bp from public.assessment_blueprints where id=p_blueprint_id for share;
 select fb.selection_snapshot into previous from private.mastery_form_selection_bindings fb
 join public.assessment_policy_bindings pb on pb.id=fb.assessment_policy_binding_id
 where pb.assessment_blueprint_id=bp.id;
 if not (bp.configuration_snapshot ? 'masteryFormSelection') then
   if previous is not null then raise exception 'mastery_form_selection_snapshot_conflict'; end if;
   return null;
 end if;
 if current_setting('transaction_isolation')<>'read committed' then raise exception 'mastery_form_selection_requires_read_committed'; end if;
 config:=bp.configuration_snapshot->'masteryFormSelection';
 if bp.purpose<>'mastery_check' or jsonb_typeof(config) is distinct from 'object'
   or config->>'schemaVersion' is distinct from 'haiedu-mastery-form-selection-v1'
   or config->>'selectionStrategy' is distinct from 'ordered-unseen-whole-form-v1'
   or jsonb_typeof(config->'formIds') is distinct from 'array'
 then raise exception 'mastery_form_selection_invalid'; end if;
 if exists(select 1 from jsonb_object_keys(config) k where k not in ('schemaVersion','selectionStrategy','formIds'))
   or jsonb_array_length(config->'formIds') not between 1 and 100
   or exists(select 1 from jsonb_array_elements(config->'formIds') x where jsonb_typeof(x)<>'string'
     or trim(both '"' from x::text) !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
 then raise exception 'mastery_form_selection_invalid'; end if;
 select array_agg(value::uuid order by ord) into form_ids
 from jsonb_array_elements_text(config->'formIds') with ordinality f(value,ord);
 if (select count(distinct x) from unnest(form_ids) x)<>cardinality(form_ids)
   or cardinality(form_ids)<(select maximum_mastery_attempts from public.academic_mastery_policy_versions
      where id=(p_policy->>'academicMasteryPolicyId')::uuid)
   or not exists(select 1 from public.assessment_pools where id=bp.assessment_pool_id and is_protected)
 then raise exception 'mastery_form_selection_invalid'; end if;
 n:=(p_policy->>'plannedQuestionCount')::integer;
 -- Parent/pool locks serialize governed edits; row locks also defend against retirement/removal.
 perform 1 from public.assessment_forms where id=any(form_ids) order by id for share;
 perform 1 from public.assessment_form_items where form_id=any(form_ids) order by form_id,item_id for share;
 if (select count(*) from public.assessment_forms where id=any(form_ids) and pool_id=bp.assessment_pool_id and status='active')<>cardinality(form_ids)
   or exists(select fi.item_id from public.assessment_form_items fi where fi.form_id=any(form_ids) group by fi.item_id having count(*)>1)
 then raise exception 'mastery_form_selection_invalid'; end if;
 for form in select value::uuid id,ord from jsonb_array_elements_text(config->'formIds') with ordinality f(value,ord) order by ord loop
   if (select count(*) from public.assessment_form_items where form_id=form.id)<>n
     or exists(select 1 from public.assessment_form_items fi where fi.form_id=form.id and not exists(
       select 1 from public.assessment_blueprint_items bi join public.items i on i.id=bi.item_id
       join public.assessment_pool_items pi on pi.item_id=i.id and pi.pool_id=bp.assessment_pool_id and pi.enabled
       where bi.assessment_blueprint_id=bp.id and bi.item_id=fi.item_id and i.status='published' and i.version_no=bi.item_version_snapshot))
   then raise exception 'mastery_form_selection_invalid'; end if;
   for entry in select * from jsonb_each_text(p_policy->'questionCountBySkill') loop
     if (select count(*) from public.assessment_form_items fi join public.items i on i.id=fi.item_id
       where fi.form_id=form.id and i.skill_id=entry.key::uuid)<>entry.value::integer
     then raise exception 'mastery_form_selection_invalid'; end if;
   end loop;
   if exists(select 1 from public.assessment_form_items fi join public.items i on i.id=fi.item_id
     where fi.form_id=form.id and not (p_policy->'questionCountBySkill' ? i.skill_id::text))
   then raise exception 'mastery_form_selection_invalid'; end if;
   select jsonb_agg(jsonb_build_object('itemId',i.id,'itemVersion',bi.item_version_snapshot,'skillId',i.skill_id) order by i.id)
   into form_items from public.assessment_form_items fi join public.items i on i.id=fi.item_id
   join public.assessment_blueprint_items bi on bi.item_id=i.id and bi.assessment_blueprint_id=bp.id where fi.form_id=form.id;
   forms:=forms||jsonb_build_array(jsonb_build_object('formId',form.id,
     'formVersion',(select form_version from public.assessment_forms where id=form.id),'items',form_items));
 end loop;
 -- Protected form items cannot also be eligible for a practice/review/diagnostic pool, including staged pools.
 if exists(select 1 from public.assessment_form_items fi join public.assessment_pool_items pi on pi.item_id=fi.item_id and pi.enabled
   join public.assessment_pools p on p.id=pi.pool_id
   where fi.form_id=any(form_ids) and (p.purpose<>'mastery_check' or not p.is_protected))
 then raise exception 'mastery_form_pool_overlap'; end if;
 manifest:=jsonb_build_object('selection',config,'forms',forms);
 if previous is not null and previous is distinct from manifest then raise exception 'mastery_form_selection_snapshot_conflict'; end if;
 return manifest;
end;
$$;

create function private.bind_mastery_form_selection(p_binding_id uuid)
returns void language plpgsql set search_path='' as $$
declare b public.assessment_policy_bindings%rowtype; manifest jsonb; previous jsonb; protected_id uuid;
begin
 select * into strict b from public.assessment_policy_bindings where id=p_binding_id;
 -- Validation is read-only; only actual binding advances durable mutation fences.
 for protected_id in select f.id from public.assessment_forms f join public.assessment_blueprints bp on bp.assessment_pool_id=f.pool_id
   where bp.id=b.assessment_blueprint_id and bp.configuration_snapshot ? 'masteryFormSelection' order by f.id loop
   perform private.advance_mastery_form_fence('form',protected_id);
 end loop;
 for protected_id in select distinct fi.item_id from public.assessment_form_items fi join public.assessment_forms f on f.id=fi.form_id
   join public.assessment_blueprints bp on bp.assessment_pool_id=f.pool_id
   where bp.id=b.assessment_blueprint_id and bp.configuration_snapshot ? 'masteryFormSelection' order by fi.item_id loop
   perform private.advance_mastery_form_fence('item',protected_id);
 end loop;
 manifest:=private.validate_mastery_form_selection(b.assessment_blueprint_id,b.policy_snapshot);
 if manifest is null then return; end if;
 if not exists(select 1 from private.mastery_form_selection_bindings where assessment_policy_binding_id=b.id)
   and exists(select 1 from public.learning_sessions where assessment_policy_binding_id=b.id)
 then raise exception 'mastery_form_selection_requires_new_blueprint'; end if;
 insert into private.mastery_form_selection_bindings(assessment_policy_binding_id,selection_snapshot)
 values(b.id,manifest) on conflict(assessment_policy_binding_id) do nothing;
 select selection_snapshot into strict previous from private.mastery_form_selection_bindings where assessment_policy_binding_id=b.id;
 if previous is distinct from manifest then raise exception 'mastery_form_selection_snapshot_conflict'; end if;
end;
$$;

create function private.mastery_form_item_seen(p_student uuid,p_item uuid)
returns boolean language sql stable set search_path='' as $$
 select exists(select 1 from public.student_item_exposure_events where student_id=p_student and item_id=p_item)
 or exists(select 1 from public.learning_session_items li join public.learning_sessions s on s.id=li.session_id
   where s.student_id=p_student and li.item_id=p_item)
 or exists(select 1 from public.attempts where student_id=p_student and item_id=p_item);
$$;

create function private.guard_registered_mastery_form_exposure()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 -- Take this before registry lookup: a first binding may be uncommitted.
 perform pg_advisory_xact_lock(hashtextextended('governed-mastery-form:'||new.student_id::text,0));
 perform private.advance_mastery_form_fence('learner',new.student_id);
 if not exists(select 1 from private.mastery_form_selection_bindings
   where selection_snapshot->'forms' @> jsonb_build_array(jsonb_build_object('items',jsonb_build_array(jsonb_build_object('itemId',new.item_id)))))
 then return new; end if;
 if exists(select 1 from public.learning_session_items li join public.learning_sessions s on s.id=li.session_id
   join private.mastery_form_selection_bindings fb on fb.assessment_policy_binding_id=s.assessment_policy_binding_id
   where s.student_id=new.student_id and li.item_id=new.item_id and s.id is distinct from new.session_id)
 then raise exception 'mastery_form_item_reserved'; end if;
 return new;
end;
$$;
create trigger guard_registered_mastery_form_exposure before insert on public.student_item_exposure_events
 for each row execute function private.guard_registered_mastery_form_exposure();

create function private.guard_registered_mastery_form_membership()
returns trigger language plpgsql security definer set search_path='' as $$
declare form_id uuid;
begin
 for form_id in select distinct x from unnest(case when tg_op='INSERT' then array[new.form_id]
   when tg_op='DELETE' then array[old.form_id] else array[old.form_id,new.form_id] end) x order by x loop
   perform private.advance_mastery_form_fence('form',form_id);
   perform 1 from public.assessment_forms where id=form_id for update;
   if exists(select 1 from private.mastery_form_selection_bindings
     where selection_snapshot->'forms' @> jsonb_build_array(jsonb_build_object('formId',form_id)))
   then raise exception 'mastery_form_membership_immutable'; end if;
 end loop;
 return case when tg_op='DELETE' then old else new end;
end;
$$;
create trigger guard_registered_mastery_form_membership before insert or update or delete on public.assessment_form_items
 for each row execute function private.guard_registered_mastery_form_membership();

create function private.guard_registered_mastery_pool_membership()
returns trigger language plpgsql security definer set search_path='' as $$
declare protected_item uuid; protected_pool uuid;
begin
 -- Lock the parent before its fence, matching a pool row update. This also
 -- covers an empty pool whose first membership is still uncommitted.
 for protected_pool in select distinct x from unnest(case when tg_op='INSERT' then array[new.pool_id] else array[old.pool_id,new.pool_id] end) x order by x loop
   perform 1 from public.assessment_pools where id=protected_pool for share;
   perform private.advance_mastery_form_fence('pool',protected_pool);
 end loop;
 for protected_item in select distinct x from unnest(case when tg_op='INSERT' then array[new.item_id] else array[old.item_id,new.item_id] end) x order by x loop
   perform private.advance_mastery_form_fence('item',protected_item);
 end loop;
 if new.enabled and exists(select 1 from private.mastery_form_selection_bindings
   where selection_snapshot->'forms' @> jsonb_build_array(jsonb_build_object('items',jsonb_build_array(jsonb_build_object('itemId',new.item_id)))))
   and exists(select 1 from public.assessment_pools where id=new.pool_id and (purpose<>'mastery_check' or not is_protected))
 then raise exception 'mastery_form_pool_overlap'; end if;
 return new;
end;
$$;
create trigger guard_registered_mastery_pool_membership before insert or update on public.assessment_pool_items
 for each row execute function private.guard_registered_mastery_pool_membership();

create function private.guard_registered_mastery_pool_scope()
returns trigger language plpgsql security definer set search_path='' as $$
declare protected_item uuid;
begin
 if (new.purpose,new.is_protected,new.status) is not distinct from (old.purpose,old.is_protected,old.status) then return new; end if;
 perform private.advance_mastery_form_fence('pool',new.id);
 for protected_item in select item_id from public.assessment_pool_items where pool_id=new.id and enabled order by item_id loop
   perform private.advance_mastery_form_fence('item',protected_item);
   if (new.purpose<>'mastery_check' or not new.is_protected) and exists(select 1 from private.mastery_form_selection_bindings
     where selection_snapshot->'forms' @> jsonb_build_array(jsonb_build_object('items',jsonb_build_array(jsonb_build_object('itemId',protected_item)))))
   then raise exception 'mastery_form_pool_overlap'; end if;
 end loop;
 return new;
end;
$$;
create trigger guard_registered_mastery_pool_scope before update of purpose,is_protected,status on public.assessment_pools
 for each row execute function private.guard_registered_mastery_pool_scope();

revoke all on function private.validate_mastery_form_selection(uuid,jsonb),private.bind_mastery_form_selection(uuid),
 private.mastery_form_item_seen(uuid,uuid),private.guard_registered_mastery_form_exposure(),
 private.guard_registered_mastery_form_membership(),private.guard_registered_mastery_pool_membership(),private.guard_registered_mastery_pool_scope(),
 private.advance_mastery_form_fence(text,uuid)
 from public,anon,authenticated,service_role;


create or replace function public.service_bind_assessment_policy(p_blueprint_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare policy jsonb; result uuid; skill_scope jsonb; existing public.assessment_policy_bindings%rowtype;
begin
  policy:=private.validate_assessment_policy_v1(p_blueprint_id);
  select jsonb_agg(distinct i.skill_id order by i.skill_id) into skill_scope
    from public.assessment_blueprint_items bi join public.items i on i.id=bi.item_id
    where bi.assessment_blueprint_id=p_blueprint_id;
  insert into public.assessment_policy_bindings(assessment_blueprint_id,curriculum_release_id,unit_id,
    subject_program_id,learning_model_configuration_id,academic_mastery_policy_id,policy_snapshot,skill_scope_snapshot)
  values(p_blueprint_id,(policy->>'curriculumReleaseId')::uuid,(policy->>'unitId')::uuid,
    (policy->>'subjectProgramId')::uuid,(policy->>'learningModelConfigurationId')::uuid,
    (policy->>'academicMasteryPolicyId')::uuid,policy,skill_scope)
  on conflict (assessment_blueprint_id) do nothing returning id into result;
  if result is null then
    select * into existing from public.assessment_policy_bindings where assessment_blueprint_id=p_blueprint_id;
    if existing.policy_snapshot is distinct from policy or existing.skill_scope_snapshot is distinct from skill_scope then
      raise exception 'assessment_policy_snapshot_conflict'; end if;
    result:=existing.id;
  end if;
  perform private.bind_mastery_form_selection(result);
  return result;
end;
$$;

create or replace function private.lock_governed_learning_session(p_student uuid,p_auth uuid,p_session uuid)
returns public.learning_sessions language plpgsql set search_path='' as $$
declare s public.learning_sessions%rowtype; b public.assessment_policy_bindings%rowtype;
begin
 select * into s from public.learning_sessions where id=p_session and student_id=p_student;
 if not found or s.assessment_policy_binding_id is null then raise exception 'learning_context_unavailable'; end if;
 -- Exposure serialization starts before a session row lock, including an older
 -- governed session resumed while a prospective form blueprint is selected.
 perform pg_advisory_xact_lock(hashtextextended('governed-mastery-form:'||p_student::text,0));
 perform private.lock_student_learning_context(p_student,p_auth,s.institutional_class_enrollment_id,s.curriculum_release_id,s.governed_unit_id);
 select * into strict s from public.learning_sessions where id=p_session and student_id=p_student for update;
 select * into strict b from public.assessment_policy_bindings where id=s.assessment_policy_binding_id;
 if (s.curriculum_release_id,s.governed_unit_id,s.subject_program_id,s.learning_model_configuration_id,s.academic_mastery_policy_id)
 is distinct from (b.curriculum_release_id,b.unit_id,b.subject_program_id,b.learning_model_configuration_id,b.academic_mastery_policy_id)
 or s.metadata->>'assessmentPolicyFingerprint' is distinct from b.snapshot_fingerprint
 then raise exception 'learning_context_unavailable'; end if;
 return s;
end;
$$;

create or replace function public.service_start_governed_session_atomic(p_student_id uuid,p_auth_session_id uuid,
  p_enrollment_id uuid,p_policy_binding_id uuid,p_form_id uuid,p_target_skill_id uuid,p_item_ids uuid[])
returns jsonb language plpgsql security definer set search_path='' as $$
declare b public.assessment_policy_bindings%rowtype; e public.institutional_class_enrollments%rowtype;
  s public.learning_sessions%rowtype; code text; v_mode text; baseline uuid; policy jsonb; entry record; details jsonb; form_selection jsonb; selected_form jsonb; form_fingerprint text;
begin
  select * into b from public.assessment_policy_bindings where id=p_policy_binding_id;
  if not found then raise exception 'assessment_policy_unavailable'; end if;
  -- Serialize assignments across every governed purpose/release, including an
  -- older dynamic blueprint that could otherwise reserve the same item.
  perform pg_advisory_xact_lock(hashtextextended('governed-mastery-form:'||p_student_id::text,0));
  perform private.advance_mastery_form_fence('learner',p_student_id);
  perform private.validate_governed_learning_model(b.learning_model_configuration_id);
  v_mode:=b.policy_snapshot->>'mode';
  if v_mode not in ('diagnostic','practice','mastery_check','chapter_review') then raise exception 'unsupported_governed_mode'; end if;
  select unit_code_snapshot into code from public.curriculum_release_units where curriculum_release_id=b.curriculum_release_id and unit_id=b.unit_id;
  -- Coordinate legacy starts during migration, then lock lifetime governed identity.
  perform pg_advisory_xact_lock(hashtextextended('initial-diagnostic:'||p_student_id::text||':'||code,0));
  perform pg_advisory_xact_lock(hashtextextended('governed-diagnostic:'||p_student_id::text||':'||b.subject_program_id::text||':'||b.unit_id::text,0));
  perform pg_advisory_xact_lock(hashtextextended('governed-session:'||p_student_id::text||':'||p_enrollment_id::text||':'||b.curriculum_release_id::text||':'||b.unit_id::text,0));
  e:=private.lock_student_learning_context(p_student_id,p_auth_session_id,p_enrollment_id,b.curriculum_release_id,b.unit_id);
  -- Resume is not a policy rewrite: retain the original binding even if a new
  -- blueprint is now selected. Only current authorization is revalidated here.
  select * into s from public.learning_sessions where student_id=p_student_id
    and institutional_class_enrollment_id=p_enrollment_id and curriculum_release_id=b.curriculum_release_id
    and ((assessment_policy_binding_id is not null and governed_unit_id=b.unit_id)
      or (assessment_policy_binding_id is null and exists(select 1 from public.legacy_learning_blueprint_mappings m where m.assessment_blueprint_id=learning_sessions.assessment_blueprint_id and m.unit_id=b.unit_id and m.curriculum_release_id=b.curriculum_release_id))) and status='active'
    and (v_mode<>'diagnostic' or learning_sessions.mode not in ('practice','chapter_review'))
    order by started_at,id limit 1 for update;
  if found then return private.authorized_governed_result(p_student_id,p_auth_session_id,p_enrollment_id,b.curriculum_release_id,b.unit_id,jsonb_build_object('session',private.learner_governed_session(to_jsonb(s)),'resumed',true,'modeConflict',s.mode<>v_mode,
    'legacySession',s.assessment_policy_binding_id is null)); end if;
  baseline:=private.scoped_chapter_baseline(p_student_id,b.curriculum_release_id,b.unit_id);
  if v_mode='diagnostic' then
    if baseline is not null then return private.authorized_governed_result(p_student_id,p_auth_session_id,p_enrollment_id,b.curriculum_release_id,b.unit_id,jsonb_build_object('diagnosticCompleted',true,'baselineSessionId',baseline)); end if;
    if exists (select 1 from public.learning_sessions prior where prior.student_id=p_student_id
      and prior.mode='diagnostic' and prior.status in ('active','completed')
      and ((prior.assessment_policy_binding_id is not null and prior.subject_program_id=b.subject_program_id and prior.governed_unit_id=b.unit_id)
        or (prior.assessment_policy_binding_id is null and prior.unit_code=code and (
          prior.curriculum_release_id is null or exists (
            select 1 from public.curriculum_releases r where r.id=prior.curriculum_release_id and r.subject_program_id=b.subject_program_id))))) then
      raise exception 'diagnostic_baseline_requires_governed_mapping'; end if;
  elsif baseline is null then raise exception 'chapter_diagnostic_required'; end if;
  policy:=private.validate_assessment_policy_v1(b.assessment_blueprint_id);
  if p_item_ids is null or cardinality(p_item_ids)<>(policy->>'plannedQuestionCount')::integer
    or (v_mode<>'practice' and (select count(distinct i) from unnest(p_item_ids) i)<>cardinality(p_item_ids))
    or array_position(p_item_ids,null) is not null then raise exception 'governed_session_items_invalid'; end if;
  -- Lock selected memberships/content before validating, preventing concurrent
  -- retirement or pool removal from winning between the check and the insert.
  perform 1 from public.items where id=any(p_item_ids) order by id for share;
  perform 1 from public.assessment_pool_items where pool_id=(select assessment_pool_id from public.assessment_blueprints where id=b.assessment_blueprint_id)
    and item_id=any(p_item_ids) order by item_id for share;
  if exists (select 1 from unnest(p_item_ids) picked(id) where not exists (
    select 1 from public.assessment_blueprint_items bi join public.items i on i.id=bi.item_id
    join public.assessment_pool_items pi on pi.item_id=i.id
    join public.assessment_blueprints bp on bp.id=bi.assessment_blueprint_id and bp.assessment_pool_id=pi.pool_id
    where bp.id=b.assessment_blueprint_id and i.id=picked.id and i.status='published' and pi.enabled
      and i.version_no=bi.item_version_snapshot and (p_target_skill_id is null or i.skill_id=p_target_skill_id)))
  then raise exception 'governed_session_items_invalid'; end if;
  if v_mode='diagnostic' then
    if p_target_skill_id is not null then raise exception 'governed_session_items_invalid'; end if;
    perform 1 from public.assessment_forms where id=p_form_id for share;
    perform 1 from public.assessment_form_items where form_id=p_form_id order by item_id for share;
    if not exists (select 1 from public.assessment_forms f join public.assessment_blueprints bp on bp.assessment_pool_id=f.pool_id
      where f.id=p_form_id and f.status='active' and bp.id=b.assessment_blueprint_id)
      or (select count(*) from public.assessment_form_items where form_id=p_form_id)<>cardinality(p_item_ids)
      or exists (select 1 from public.assessment_form_items where form_id=p_form_id and not (item_id=any(p_item_ids)))
    then raise exception 'governed_diagnostic_form_invalid'; end if;
    for entry in select * from jsonb_each_text(policy->'questionCountBySkill') loop
      if (select count(*) from public.items where id=any(p_item_ids) and skill_id=entry.key::uuid)<>entry.value::integer then
        raise exception 'governed_diagnostic_coverage_invalid'; end if;
    end loop;
    if exists (select 1 from public.items where id=any(p_item_ids) and not (policy->'questionCountBySkill' ? skill_id::text)) then
      raise exception 'governed_diagnostic_coverage_invalid'; end if;
  elsif v_mode<>'mastery_check' and p_form_id is not null then raise exception 'governed_session_items_invalid'; end if;
  if v_mode='mastery_check' then
    if p_target_skill_id is not null then raise exception 'governed_session_items_invalid'; end if;
    form_selection:=private.validate_mastery_form_selection(b.assessment_blueprint_id,policy);
    if form_selection is null then
      if p_form_id is not null then raise exception 'governed_session_items_invalid'; end if;
    else
      select snapshot_fingerprint into form_fingerprint from private.mastery_form_selection_bindings
        where assessment_policy_binding_id=b.id and selection_snapshot=form_selection;
      if not found then raise exception 'mastery_form_selection_unbound'; end if;
      select value into selected_form from jsonb_array_elements(form_selection->'forms')
        where value->>'formId'=p_form_id::text;
      if selected_form is null or jsonb_array_length(selected_form->'items')<>cardinality(p_item_ids)
        or exists(select 1 from jsonb_array_elements(selected_form->'items') x where not ((x->>'itemId')::uuid=any(p_item_ids)))
      then raise exception 'governed_mastery_form_invalid'; end if;
      if exists(select 1 from unnest(p_item_ids) x where private.mastery_form_item_seen(p_student_id,x))
      then raise exception 'governed_mastery_form_exposed'; end if;
    end if;
    for entry in select * from jsonb_each_text(policy->'questionCountBySkill') loop
      if (select count(*) from public.items where id=any(p_item_ids) and skill_id=entry.key::uuid)<>entry.value::integer then raise exception 'governed_mastery_coverage_invalid'; end if;
    end loop;
  end if;
  details:=private.prepare_governed_lifecycle(p_student_id,b.id);
  if form_fingerprint is not null then
    details:=details||jsonb_build_object('masteryFormSelectionFingerprint',form_fingerprint,
      'masteryFormSelectionSchema','haiedu-mastery-form-selection-v1');
  end if;
  insert into public.learning_sessions(student_id,unit_code,mode,planned_item_count,curriculum_release_id,
    assessment_blueprint_id,institutional_class_enrollment_id,assessment_policy_binding_id,governed_unit_id,
    source_auth_session_id,target_skill_id,metadata,mastery_attempt_number)
  values(p_student_id,code,v_mode,cardinality(p_item_ids),b.curriculum_release_id,b.assessment_blueprint_id,
    p_enrollment_id,b.id,b.unit_id,p_auth_session_id,p_target_skill_id,jsonb_build_object('assessmentFormId',p_form_id)||details,(details->>'attemptNumber')::smallint) returning * into s;
  insert into public.learning_session_items(session_id,ordinal,item_id,skill_id,selection_reason)
    select s.id,x.ordinal::integer,i.id,i.skill_id,'governed-policy-assignment-v1'
    from unnest(p_item_ids) with ordinality x(id,ordinal) join public.items i on i.id=x.id where v_mode<>'practice';
  perform private.attach_governed_lifecycle(s.id,details);
  return private.authorized_governed_result(p_student_id,p_auth_session_id,p_enrollment_id,b.curriculum_release_id,b.unit_id,jsonb_build_object('session',private.learner_governed_session(to_jsonb(s)),'resumed',false)||details);
end;
$$;

create or replace function public.service_launch_governed_learning(p_student_id uuid,p_auth_session_id uuid,p_enrollment_id uuid,p_blueprint_id uuid,
 p_target_skill_id uuid default null,p_recommendation_instance_id uuid default null,p_read_only boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare bp public.assessment_blueprints%rowtype; b public.assessment_policy_bindings%rowtype; policy jsonb; code text; selected_form_id uuid;
 picked uuid[]; details jsonb; result jsonb; target uuid; binding_id uuid; entry record; n integer; state public.chapter_mastery_states%rowtype; ready jsonb; form_selection jsonb;
begin
 select * into bp from public.assessment_blueprints where id=p_blueprint_id;
 if not found then raise exception 'learning_context_unavailable'; end if;
 -- Every governed launch takes the learner lock before any pool lock, keeping
 -- old dynamic and opt-in blueprints in the same deadlock-free lock order.
 perform pg_advisory_xact_lock(hashtextextended('governed-mastery-form:'||p_student_id::text,0));
 if not p_read_only and bp.configuration_snapshot ? 'masteryFormSelection' then
   perform private.advance_mastery_form_fence('learner',p_student_id);
 end if;
 perform private.lock_student_learning_context(p_student_id,p_auth_session_id,p_enrollment_id,bp.curriculum_release_id,bp.unit_id);
 if not p_read_only then
   result:=public.service_resume_governed_learning(p_student_id,p_auth_session_id,p_enrollment_id,bp.curriculum_release_id,bp.unit_id,bp.purpose);
   if result->>'resumed'='true' then
     if p_recommendation_instance_id is not null then perform public.service_record_governed_recommendation_event(p_student_id,p_auth_session_id,p_recommendation_instance_id,'action_started','start_learning_session',(result#>>'{session,id}')::uuid); end if;
     return private.authorized_governed_result(p_student_id,p_auth_session_id,p_enrollment_id,bp.curriculum_release_id,bp.unit_id,result);
   end if;
 end if;
 policy:=private.validate_assessment_policy_v1(bp.id);
 form_selection:=private.validate_mastery_form_selection(bp.id,policy);
 perform private.validate_governed_learning_model((policy->>'learningModelConfigurationId')::uuid);
 select unit_code_snapshot into strict code from public.curriculum_release_units where curriculum_release_id=bp.curriculum_release_id and unit_id=bp.unit_id;
 select * into state from public.chapter_mastery_states where student_id=p_student_id and curriculum_release_id=bp.curriculum_release_id and unit_code=code;
 select coalesce(jsonb_agg(jsonb_build_object('skillId',i.skill_id,'ready',private.governed_skill_ready(p_student_id,bp.curriculum_release_id,i.skill_id,(policy->>'learningModelConfigurationId')::uuid)) order by i.skill_id),'[]') into ready
 from (select distinct skill_id from public.assessment_blueprint_items bi join public.items i on i.id=bi.item_id where bi.assessment_blueprint_id=bp.id) i;
 if p_read_only then return private.authorized_governed_result(p_student_id,p_auth_session_id,p_enrollment_id,bp.curriculum_release_id,bp.unit_id,jsonb_build_object('unitCode',code,'unitId',bp.unit_id,'curriculumReleaseId',bp.curriculum_release_id,'assessmentPolicy',policy,'readiness',ready,
 'baselineSessionId',private.scoped_chapter_baseline(p_student_id,bp.curriculum_release_id,bp.unit_id),'lifecycle',to_jsonb(state),'readOnly',true)); end if;
 binding_id:=public.service_bind_assessment_policy(bp.id);
 select * into strict b from public.assessment_policy_bindings where id=binding_id;
 -- Resume/completed baseline paths execute before selection, retaining bindings.
 result:=public.service_start_governed_session_atomic(p_student_id,p_auth_session_id,p_enrollment_id,b.id,null,p_target_skill_id,null);
 if p_recommendation_instance_id is not null and result#>>'{session,assessment_policy_binding_id}' is not null then perform public.service_record_governed_recommendation_event(p_student_id,p_auth_session_id,p_recommendation_instance_id,'action_started','start_learning_session',(result#>>'{session,id}')::uuid); end if;
 return private.authorized_governed_result(p_student_id,p_auth_session_id,p_enrollment_id,bp.curriculum_release_id,bp.unit_id,result);
exception when raise_exception then
 if sqlerrm<>'governed_session_items_invalid' then raise; end if;
 -- This handler is only the launcher's selection phase. The failed nested call
 -- was a subtransaction, so it has not committed a partial header or lifecycle.
 -- Reacquire: PostgreSQL released locks obtained by the failed subtransaction.
 perform pg_advisory_xact_lock(hashtextextended('governed-mastery-form:'||p_student_id::text,0));
 if bp.configuration_snapshot ? 'masteryFormSelection' then
   perform private.advance_mastery_form_fence('learner',p_student_id);
 end if;
 perform private.lock_student_learning_context(p_student_id,p_auth_session_id,p_enrollment_id,bp.curriculum_release_id,bp.unit_id);
 binding_id:=public.service_bind_assessment_policy(bp.id);
 select * into strict b from public.assessment_policy_bindings where id=binding_id;
 picked:='{}'::uuid[];
 if bp.purpose='diagnostic' then
   select f.id into selected_form_id from public.assessment_forms f where f.pool_id=bp.assessment_pool_id and f.status='active'
   order by md5(p_student_id::text||':'||b.subject_program_id::text||':'||b.unit_id::text||':'||f.id::text),f.id limit 1;
   select array_agg(fi.item_id order by md5(p_student_id::text||':'||fi.item_id::text),fi.item_id) into picked from public.assessment_form_items fi where fi.form_id=selected_form_id;
 elsif bp.purpose='mastery_check' then
   form_selection:=private.validate_mastery_form_selection(bp.id,b.policy_snapshot);
   if form_selection is not null then
     -- No mixing or reserve substitution. An exposed constituent rejects the whole form.
     select (f.value->>'formId')::uuid into selected_form_id
     from jsonb_array_elements(form_selection->'forms') with ordinality f(value,ord)
     where not exists(select 1 from jsonb_array_elements(f.value->'items') i
       where private.mastery_form_item_seen(p_student_id,(i->>'itemId')::uuid))
     order by f.ord limit 1;
     if selected_form_id is null then raise exception 'governed_mastery_forms_exhausted'; end if;
     select array_agg(fi.item_id order by md5(p_student_id::text||':'||selected_form_id::text||':'||fi.item_id::text),fi.item_id)
       into picked from public.assessment_form_items fi where fi.form_id=selected_form_id;
   else
   for entry in select * from jsonb_each_text(b.policy_snapshot->'questionCountBySkill') loop
     picked:=picked||array(select i.id from public.assessment_blueprint_items bi join public.items i on i.id=bi.item_id
       where bi.assessment_blueprint_id=bp.id and i.skill_id=entry.key::uuid
       order by exists(select 1 from public.learning_session_items old join public.learning_sessions ls on ls.id=old.session_id
          where ls.student_id=p_student_id and ls.curriculum_release_id=b.curriculum_release_id and ls.governed_unit_id=b.unit_id and ls.mode='mastery_check' and ls.status='completed' and old.item_id=i.id),
       (select count(*) from public.student_item_exposure_events e where e.student_id=p_student_id and e.curriculum_release_id=b.curriculum_release_id and e.item_id=i.id),
       (select max(served_at) from public.student_item_exposure_events e where e.student_id=p_student_id and e.curriculum_release_id=b.curriculum_release_id and e.item_id=i.id) nulls first,i.code,i.id
       limit entry.value::integer);
   end loop;
   end if;
 elsif bp.purpose='practice' then
   if p_target_skill_id is not null and not (b.skill_scope_snapshot ? p_target_skill_id::text) then raise exception 'assessment_policy_skill_scope_invalid'; end if;
   target:=p_target_skill_id;
   if target is null then
     select value::uuid into target from jsonb_array_elements_text(b.skill_scope_snapshot) skill(value)
     where not private.governed_skill_ready(p_student_id,b.curriculum_release_id,value::uuid,b.learning_model_configuration_id) order by value limit 1;
   end if;
   if target is null then return private.authorized_governed_result(p_student_id,p_auth_session_id,p_enrollment_id,bp.curriculum_release_id,bp.unit_id,jsonb_build_object('unitReadyForMasteryCheck',true,'unitId',b.unit_id)); end if;
   -- Assignments are re-selected adaptively on first delivery, then immutable.
   for n in 1..(b.policy_snapshot->>'plannedQuestionCount')::integer loop
     picked:=picked||array(select i.id from public.assessment_blueprint_items bi join public.items i on i.id=bi.item_id
     where bi.assessment_blueprint_id=bp.id and i.skill_id=target order by i.code,i.id offset ((n-1) % (select count(*) from public.assessment_blueprint_items bi join public.items i on i.id=bi.item_id where bi.assessment_blueprint_id=bp.id and i.skill_id=target)) limit 1);
   end loop;
 elsif bp.purpose='chapter_review' then
   details:=private.prepare_governed_lifecycle(p_student_id,b.id);
   -- All unused chapter questions precede exact repeats, including across skills.
   -- Within each group preserve weak/failed-skill weight, spacing and diversity.
   with candidates as (
     select i.id,i.skill_id,
       exists(select 1 from public.chapter_review_item_exposures e where e.review_cycle_id=(details->>'reviewCycleId')::uuid and e.item_id=i.id) seen,
       exists(select 1 from public.learning_sessions previous where previous.student_id=p_student_id and previous.curriculum_release_id=b.curriculum_release_id and previous.governed_unit_id=b.unit_id
         and previous.mode='mastery_check' and previous.status='completed' and previous.id=(select last.id from public.learning_sessions last where last.student_id=p_student_id and last.curriculum_release_id=b.curriculum_release_id and last.governed_unit_id=b.unit_id and last.mode='mastery_check' and last.status='completed' order by completed_at desc,id desc limit 1)
         and previous.metadata->'failedSkillIds' ? i.skill_id::text) failed,
       coalesce((select count(*) filter(where recent.correct and not recent.hint_used)::numeric/nullif(count(*) filter(where not recent.hint_used),0) from
         (select a.correct,a.hint_used from public.attempts a join public.chapter_review_sessions cr on cr.learning_session_id=a.learning_session_id
         where cr.chapter_mastery_state_id=(details->>'stateId')::uuid and a.skill_id=i.skill_id order by a.created_at desc,a.id desc limit (select (configuration#>>'{recentRecovery,recentWindow}')::integer from public.learning_model_configurations where id=b.learning_model_configuration_id)) recent),-1) skill_rank,
       (select count(*) from public.chapter_review_item_exposures e join public.chapter_review_sessions cr on cr.id=e.chapter_review_session_id where cr.chapter_mastery_state_id=(details->>'stateId')::uuid and e.item_id=i.id) exposures,
       (select count(*) from public.chapter_review_item_exposures e join public.chapter_review_sessions cr on cr.id=e.chapter_review_session_id where cr.chapter_mastery_state_id=(details->>'stateId')::uuid and e.item_template_id=i.item_template_id) template_exposures,
       (select count(*) from public.chapter_review_item_exposures e join public.chapter_review_sessions cr on cr.id=e.chapter_review_session_id where cr.chapter_mastery_state_id=(details->>'stateId')::uuid and e.item_family_id=t.item_family_id) family_exposures,
       (select max(selected_at) from public.chapter_review_item_exposures e join public.chapter_review_sessions cr on cr.id=e.chapter_review_session_id where cr.chapter_mastery_state_id=(details->>'stateId')::uuid and e.item_id=i.id) last_seen
     from public.assessment_blueprint_items bi join public.items i on i.id=bi.item_id join public.item_templates t on t.id=i.item_template_id where bi.assessment_blueprint_id=bp.id
   ), ranked as (select *,row_number() over(partition by skill_id order by seen,last_seen nulls first,template_exposures,family_exposures,exposures,id) skill_position from candidates),
   chosen as (select * from ranked order by seen,(skill_position=1) desc,failed desc,skill_rank,last_seen nulls first,template_exposures,family_exposures,exposures,id limit (b.policy_snapshot->>'plannedQuestionCount')::integer)
   select array_agg(id order by md5((details->>'stateId')||':'||(details->>'reviewCycleNumber')||':'||(details->>'reviewSessionNumber')||':'||id::text),id) into picked from chosen;
 end if;
 result:=public.service_start_governed_session_atomic(p_student_id,p_auth_session_id,p_enrollment_id,b.id,selected_form_id,target,picked);
 if p_recommendation_instance_id is not null and result#>>'{session,assessment_policy_binding_id}' is not null then perform public.service_record_governed_recommendation_event(p_student_id,p_auth_session_id,p_recommendation_instance_id,'action_started','start_learning_session',(result#>>'{session,id}')::uuid); end if;
 return private.authorized_governed_result(p_student_id,p_auth_session_id,p_enrollment_id,bp.curriculum_release_id,bp.unit_id,result);
end;
$$;
