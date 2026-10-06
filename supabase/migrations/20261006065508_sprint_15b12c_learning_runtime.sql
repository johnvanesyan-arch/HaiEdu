-- 15B.12C. New engine consumes immutable scope and configuration, never a
-- subject/grade default. Existing evidence and approved configuration are intact.
create table public.legacy_learning_blueprint_mappings (
 assessment_blueprint_id uuid primary key references public.assessment_blueprints(id),
 curriculum_release_id uuid not null references public.curriculum_releases(id),
 subject_program_id uuid not null references public.subject_programs(id),
 unit_id uuid not null references public.units(id),
 unit_code_snapshot text not null,
 source_configuration_fingerprint text not null,
 extension_key text not null check(extension_key='legacy-physics7-u01-v1'),
 created_at timestamptz not null default now()
);
create index legacy_learning_mapping_release_idx on public.legacy_learning_blueprint_mappings(curriculum_release_id);
create index legacy_learning_mapping_programme_idx on public.legacy_learning_blueprint_mappings(subject_program_id);
create index legacy_learning_mapping_unit_idx on public.legacy_learning_blueprint_mappings(unit_id);
alter table public.legacy_learning_blueprint_mappings enable row level security;
revoke all on public.legacy_learning_blueprint_mappings from public,anon,authenticated,service_role;
grant select on public.legacy_learning_blueprint_mappings to service_role;
create trigger legacy_learning_mapping_immutable before update or delete on public.legacy_learning_blueprint_mappings
 for each row execute function private.reject_assessment_policy_binding_mutation();
-- Explicit compatibility catalogue. A code match alone never maps history.
insert into public.legacy_learning_blueprint_mappings
 select b.id,b.curriculum_release_id,r.subject_program_id,b.unit_id,u.unit_code_snapshot,
 md5(b.configuration_snapshot::text),'legacy-physics7-u01-v1',now()
 from public.assessment_blueprints b join public.curriculum_releases r on r.id=b.curriculum_release_id
 join public.curriculum_release_units u on u.curriculum_release_id=r.id and u.unit_id=b.unit_id
 where b.unit_id='0349ffcd-8fc9-47f2-82d1-3d5cfcb3a096'::uuid and b.id=any(array[
 'bed1fec0-7123-412b-b25e-4d7f7e187181','cafb0102-4c36-4675-9b5b-59ec16ce4d7c','eb9a59c9-c580-4282-8bd0-d56eeae79488',
 '2f78a933-8276-4589-9238-8b5a51166985','b4e8b982-05d9-4222-a944-2216936fa929','21117238-1b95-4771-b8a1-998b6919865c','0c7fce12-10f2-4993-a4a1-70d96d883e4c']::uuid[]);

create or replace function private.scoped_chapter_baseline(p_student uuid,p_release uuid,p_unit uuid)
returns uuid language sql stable set search_path='' as $$
 select s.id from public.learning_sessions s
 left join public.legacy_learning_blueprint_mappings m on m.assessment_blueprint_id=s.assessment_blueprint_id
 join public.curriculum_releases target on target.id=p_release
 where s.student_id=p_student and s.mode='diagnostic' and s.status='completed'
 and ((s.assessment_policy_binding_id is not null and s.curriculum_release_id=p_release and s.governed_unit_id=p_unit)
 or (s.assessment_policy_binding_id is null and m.unit_id=p_unit and m.subject_program_id=target.subject_program_id
   and m.curriculum_release_id=s.curriculum_release_id and m.unit_code_snapshot=s.unit_code))
 order by s.completed_at,s.id limit 1;
$$;

create function private.lock_governed_learning_session(p_student uuid,p_auth uuid,p_session uuid)
returns public.learning_sessions language plpgsql set search_path='' as $$
declare s public.learning_sessions%rowtype; b public.assessment_policy_bindings%rowtype;
begin
 select * into s from public.learning_sessions where id=p_session and student_id=p_student;
 if not found or s.assessment_policy_binding_id is null then raise exception 'learning_context_unavailable'; end if;
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

create function private.learner_governed_session(p_session jsonb)
returns jsonb language sql immutable set search_path='' as $$
 select case when p_session->>'mode' in ('diagnostic','mastery_check') and p_session->>'status'='active'
 then p_session-'correct_count'-'score_percent'-'assessment_result' else p_session end;
$$;

create function private.authorized_governed_result(p_student uuid,p_auth uuid,p_enrollment uuid,p_release uuid,p_unit uuid,p_result jsonb)
returns jsonb language plpgsql set search_path='' as $$
begin
 -- Row locks protect revocations; the final clock check also protects expiry
 -- while waiting for content, presentation, guide or mastery-evidence locks.
 perform private.lock_student_learning_context(p_student,p_auth,p_enrollment,p_release,p_unit);
 return p_result;
end;
$$;
revoke all on function private.authorized_governed_result(uuid,uuid,uuid,uuid,uuid,jsonb) from public,anon,authenticated,service_role;

create function public.service_resume_governed_learning(p_student_id uuid,p_auth_session_id uuid,p_enrollment_id uuid,p_release_id uuid,p_unit_id uuid,p_mode text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.learning_sessions%rowtype;
begin
 if p_mode not in ('diagnostic','practice','mastery_check','chapter_review') then raise exception 'learning_context_unavailable'; end if;
 perform private.lock_student_learning_context(p_student_id,p_auth_session_id,p_enrollment_id,p_release_id,p_unit_id);
 select * into s from public.learning_sessions where student_id=p_student_id and institutional_class_enrollment_id=p_enrollment_id
 and curriculum_release_id=p_release_id and governed_unit_id=p_unit_id and assessment_policy_binding_id is not null and status='active'
 and (p_mode<>'diagnostic' or mode not in ('practice','chapter_review')) order by started_at,id limit 1;
 if not found then return private.authorized_governed_result(p_student_id,p_auth_session_id,p_enrollment_id,p_release_id,p_unit_id,jsonb_build_object('resumed',false)); end if;
 s:=private.lock_governed_learning_session(p_student_id,p_auth_session_id,s.id);
 if s.status<>'active' then return private.authorized_governed_result(p_student_id,p_auth_session_id,p_enrollment_id,p_release_id,p_unit_id,jsonb_build_object('resumed',false)); end if;
 return private.authorized_governed_result(p_student_id,p_auth_session_id,p_enrollment_id,p_release_id,p_unit_id,jsonb_build_object('resumed',true,'session',private.learner_governed_session(to_jsonb(s)),'modeConflict',s.mode<>p_mode));
end;
$$;
revoke all on function public.service_resume_governed_learning(uuid,uuid,uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.service_resume_governed_learning(uuid,uuid,uuid,uuid,uuid,text) to service_role;

create function private.governed_skill_ready(p_student uuid,p_release uuid,p_skill uuid,p_model uuid)
returns boolean language plpgsql stable set search_path='' as $$
declare rules jsonb; recovery jsonb; m public.student_skill_mastery_by_release%rowtype; unique_count integer; correct_count integer;
begin
 select configuration->'mastery',configuration->'recentRecovery' into rules,recovery
 from public.learning_model_configurations where id=p_model;
 if not (rules ?& array['minimumEvidenceCount','secureAtOrAbove'])
 or not (recovery ?& array['recentWindow','minimumUniqueItems','minimumIndependentCorrect','hintFreeRequired'])
 or (recovery->>'hintFreeRequired')::boolean is distinct from true
 or (recovery->>'recentWindow')::integer<1 or (recovery->>'minimumUniqueItems')::integer<1
 or (recovery->>'minimumIndependentCorrect')::integer<1
 then raise exception 'unsupported_learning_model_readiness_contract'; end if;
 select * into m from public.student_skill_mastery_by_release where student_id=p_student and curriculum_release_id=p_release and skill_id=p_skill;
 if m.mastery_score >= (rules->>'secureAtOrAbove')::numeric and m.evidence_count >= (rules->>'minimumEvidenceCount')::integer then return true; end if;
 select count(distinct item_id) into unique_count from public.attempts where student_id=p_student and curriculum_release_id=p_release and skill_id=p_skill;
 select count(*) into correct_count from (select correct,hint_used from public.attempts
 where student_id=p_student and curriculum_release_id=p_release and skill_id=p_skill order by created_at desc,id desc limit (recovery->>'recentWindow')::integer) recent
 where correct and not hint_used;
 return unique_count >= (recovery->>'minimumUniqueItems')::integer and correct_count >= (recovery->>'minimumIndependentCorrect')::integer;
end;
$$;

-- Registered linear-beta / recent-recovery / 11B exposure / three-stage
-- authored-help extensions. Shapes/capabilities are explicit; values are frozen
-- configuration. Unsupported extensions cannot create a learner session.
create function private.validate_governed_learning_model(p_model uuid)
returns void language plpgsql stable set search_path='' as $$
declare c jsonb; m jsonb; p jsonb; r jsonb; h jsonb;
begin
 select configuration into strict c from public.learning_model_configurations where id=p_model;
 m:=c->'mastery';p:=c->'practice';r:=c->'recentRecovery';h:=c->'hinting';
 if m is null or p is null or r is null or h is null
 or not (m ?& array['priorAlpha','priorBeta','minimumEvidenceCount','needsSupportBelow','secureAtOrAbove','hintedPositiveMultiplier','incorrectEvidenceHintReduction'])
 or not ((m->'difficultyWeight') ?& array['formula','difficultyMin','difficultyMax'])
 or m->'difficultyWeight' is null
 or exists(select 1 from unnest(array['priorAlpha','priorBeta','minimumEvidenceCount','needsSupportBelow','secureAtOrAbove','hintedPositiveMultiplier']) k where jsonb_typeof(m->k) is distinct from 'number')
 or exists(select 1 from unnest(array['recentWindow','minimumUniqueItems','minimumIndependentCorrect']) k where jsonb_typeof(r->k) is distinct from 'number')
 or exists(select 1 from unnest(array['difficultyMin','difficultyMax']) k where jsonb_typeof(m->'difficultyWeight'->k) is distinct from 'number')
 or m#>>'{difficultyWeight,formula}' !~ '^([0-9]+[.]?[0-9]*) [+] ([0-9]+[.]?[0-9]*)[*]difficulty$'
 or m#>>'{difficultyWeight,formula}' ~ '^0[.]?0* [+] 0[.]?0*[*]difficulty$'
 or (m->>'priorAlpha')::numeric<=0 or (m->>'priorBeta')::numeric<=0 or (m->>'minimumEvidenceCount')::integer<1
 or (m->>'needsSupportBelow')::numeric<0 or (m->>'secureAtOrAbove')::numeric>1 or (m->>'secureAtOrAbove')::numeric<=(m->>'needsSupportBelow')::numeric
 or (m->>'hintedPositiveMultiplier')::numeric<=0 or (m->>'hintedPositiveMultiplier')::numeric>1 or (m->>'incorrectEvidenceHintReduction')::boolean is distinct from false
 or (m#>>'{difficultyWeight,difficultyMin}')::integer<1 or (m#>>'{difficultyWeight,difficultyMax}')::integer<(m#>>'{difficultyWeight,difficultyMin}')::integer
 or not (r ?& array['recentWindow','minimumUniqueItems','minimumIndependentCorrect','hintFreeRequired'])
 or (r->>'recentWindow')::integer<1 or (r->>'minimumUniqueItems')::integer<1 or (r->>'minimumIndependentCorrect')::integer<1
 or (r->>'minimumIndependentCorrect')::integer>(r->>'recentWindow')::integer or (r->>'hintFreeRequired')::boolean is distinct from true
 or not (p ?& array['desiredDifficultyBands','consecutiveWrongAdjustment','exactVariantCooldownRecentDistinctVariants','selectionPolicyVersion'])
 or p->>'selectionPolicyVersion'<>'11B-v1' or jsonb_typeof(p->'desiredDifficultyBands')<>'array' or jsonb_array_length(p->'desiredDifficultyBands')<1
 or not ((p->'consecutiveWrongAdjustment') ?& array['oneWrong','twoOrMoreWrong']) or (p->>'exactVariantCooldownRecentDistinctVariants')::integer<0
 or h->'levels' is distinct from '["orient","strategy","analogous_worked_example"]'::jsonb or h->>'liveAiGeneration' is distinct from 'false'
 or h->>'postErrorHelpAllowed' is distinct from 'true' or h->>'independentConfirmationRequired' is distinct from 'true'
 or not ((c#>'{recommendation,corePolicy}') ?& array['default','insufficientEvidence','weakWithUnmetPrerequisite','secureWithNextSkill'])
 or c#>'{recommendation,corePolicy}' is null
 then raise exception 'unsupported_learning_model_contract'; end if;
end;
$$;

-- Prepare the existing versioned lifecycle under its normal lock. No global
-- policy activation is used for governed sessions: the binding selects it.
create function private.prepare_governed_lifecycle(p_student uuid,p_binding uuid)
returns jsonb language plpgsql set search_path='' as $$
declare b public.assessment_policy_bindings%rowtype; st public.chapter_mastery_states%rowtype;
 policy public.academic_mastery_policy_versions%rowtype; requirement public.chapter_review_requirements%rowtype;
 cycle public.chapter_review_cycles%rowtype; code text; mode text; attempt_no integer; review_id uuid; context text; pool_count integer; cycle_no integer; session_no integer;
begin
 select * into strict b from public.assessment_policy_bindings where id=p_binding;
 mode:=b.policy_snapshot->>'mode';
 if mode not in ('mastery_check','chapter_review') then return '{}'; end if;
 select unit_code_snapshot into strict code from public.curriculum_release_units where curriculum_release_id=b.curriculum_release_id and unit_id=b.unit_id;
 perform pg_advisory_xact_lock(hashtextextended(p_student::text||'|'||b.curriculum_release_id::text||'|'||code,0));
 select * into strict policy from public.academic_mastery_policy_versions where id=b.academic_mastery_policy_id;
 -- The existing lifecycle schema defines the approved three-attempt extension.
 if policy.maximum_mastery_attempts<>3 or policy.review_required_after_failed_attempts<>array[1,2]::smallint[]
 or not policy.review_optional_after_pass or not policy.review_available_after_final_failure or policy.additional_attempt_after_final_failure
 then raise exception 'unsupported_mastery_lifecycle_contract'; end if;
 select * into st from public.chapter_mastery_states where student_id=p_student and curriculum_release_id=b.curriculum_release_id and unit_code=code for update;
 if not found then
   if mode='chapter_review' then raise exception 'chapter_review_not_available'; end if;
   insert into public.chapter_mastery_states(student_id,curriculum_release_id,unit_code,academic_mastery_policy_id,lifecycle_state)
   values(p_student,b.curriculum_release_id,code,policy.id,'mastery_ready') returning * into st;
 end if;
 if st.academic_mastery_policy_id<>policy.id then raise exception 'mastery_policy_history_incompatible'; end if;
 if mode='mastery_check' then
   attempt_no:=case st.lifecycle_state when 'mastery_ready' then 1 when 'mastery_retry_2_ready' then 2 when 'mastery_retry_3_ready' then 3 else null end;
   if attempt_no is null or attempt_no<>st.attempts_used+1 then raise exception 'mastery_check_not_allowed'; end if;
   if attempt_no=1 and exists(select 1 from jsonb_array_elements_text(b.skill_scope_snapshot) skill
      where not private.governed_skill_ready(p_student,b.curriculum_release_id,skill::uuid,b.learning_model_configuration_id)) then raise exception 'skills_not_ready'; end if;
   if attempt_no>1 then
     select r.qualifying_review_session_id into review_id from public.chapter_review_requirements r
     join public.chapter_review_sessions cr on cr.id=r.qualifying_review_session_id
     where r.chapter_mastery_state_id=st.id and r.required_after_attempt=attempt_no-1 and r.status='satisfied' and cr.qualifying and cr.status='completed';
     if review_id is null then raise exception 'mastery_check_not_allowed'; end if;
   end if;
   return jsonb_build_object('stateId',st.id,'attemptNumber',attempt_no,'precedingReviewId',review_id);
 end if;
 context:=case st.lifecycle_state when 'review_required_attempt_2' then 'required_after_attempt_1_failure'
 when 'review_required_attempt_3' then 'required_after_attempt_2_failure' when 'mastery_passed' then 'voluntary_after_mastery_pass'
 when 'mastery_failed_final' then 'voluntary_after_final_failure' else null end;
 if context is null then raise exception 'chapter_review_not_available'; end if;
 if context like 'required_%' then
   select * into requirement from public.chapter_review_requirements where chapter_mastery_state_id=st.id and status='required' for update;
   if not found then raise exception 'chapter_review_not_available'; end if;
 end if;
 select count(*) into pool_count from public.assessment_blueprint_items where assessment_blueprint_id=b.assessment_blueprint_id;
 select * into cycle from public.chapter_review_cycles where chapter_mastery_state_id=st.id and status='active' for update;
 if found and ((select count(distinct item_id) from public.chapter_review_item_exposures where review_cycle_id=cycle.id)>=cycle.eligible_pool_size or cycle.eligible_pool_size<>pool_count) then
   update public.chapter_review_cycles set status='completed',completed_at=now() where id=cycle.id; cycle.id:=null;
 end if;
 if cycle.id is null then
   select coalesce(max(cycle_number),0)+1 into cycle_no from public.chapter_review_cycles where chapter_mastery_state_id=st.id;
   insert into public.chapter_review_cycles(chapter_mastery_state_id,curriculum_release_id,unit_code,cycle_number,eligible_pool_size)
   values(st.id,b.curriculum_release_id,code,cycle_no,pool_count) returning * into cycle;
 end if;
 select coalesce(max(review_session_number),0)+1 into session_no from public.chapter_review_sessions where review_cycle_id=cycle.id;
 return jsonb_build_object('stateId',st.id,'reviewRequirementId',requirement.id,'reviewContext',context,'reviewCycleId',cycle.id,
 'reviewCycleNumber',cycle.cycle_number,'reviewSessionNumber',session_no,'eligiblePoolSize',pool_count,
 'precedingMasteryAttemptNumber',coalesce(st.passed_on_attempt,st.attempts_used));
end;
$$;

create function private.attach_governed_lifecycle(p_session uuid,p_details jsonb)
returns void language plpgsql set search_path='' as $$
declare s public.learning_sessions%rowtype; review public.chapter_review_sessions%rowtype;
begin
 select * into strict s from public.learning_sessions where id=p_session;
 if s.mode='mastery_check' then
   insert into public.mastery_check_attempts(chapter_mastery_state_id,learning_session_id,attempt_number,academic_mastery_policy_id,preceding_required_review_id,status,started_at)
   values((p_details->>'stateId')::uuid,s.id,(p_details->>'attemptNumber')::smallint,s.academic_mastery_policy_id,(p_details->>'precedingReviewId')::uuid,'active',s.started_at);
 elsif s.mode='chapter_review' then
   insert into public.chapter_review_sessions(learning_session_id,chapter_mastery_state_id,review_requirement_id,academic_mastery_policy_id,review_context,target_question_count,
   review_cycle_id,review_cycle_number,review_session_number,preceding_mastery_attempt_number,eligible_pool_size)
   values(s.id,(p_details->>'stateId')::uuid,(p_details->>'reviewRequirementId')::uuid,s.academic_mastery_policy_id,p_details->>'reviewContext',s.planned_item_count,
   (p_details->>'reviewCycleId')::uuid,(p_details->>'reviewCycleNumber')::integer,(p_details->>'reviewSessionNumber')::integer,
   (p_details->>'precedingMasteryAttemptNumber')::smallint,(p_details->>'eligiblePoolSize')::integer) returning * into review;
   insert into public.chapter_review_item_exposures(chapter_review_session_id,review_cycle_id,learning_session_item_id,item_id,item_code,item_version,item_template_id,template_code,item_family_id,family_code,
   variant_key,skill_id,selection_reason,prior_exposure_count,seen_in_current_cycle,exact_repeat,pool_exhausted)
   select review.id,review.review_cycle_id,li.id,i.id,i.code,i.version_no,i.item_template_id,t.code,t.item_family_id,f.code,i.variant_key,i.skill_id,li.selection_reason,
   (select count(*) from public.chapter_review_item_exposures old join public.chapter_review_sessions cr on cr.id=old.chapter_review_session_id where cr.chapter_mastery_state_id=review.chapter_mastery_state_id and old.item_id=i.id),
   exists(select 1 from public.chapter_review_item_exposures old where old.review_cycle_id=review.review_cycle_id and old.item_id=i.id),
   exists(select 1 from public.chapter_review_item_exposures old where old.review_cycle_id=review.review_cycle_id and old.item_id=i.id),
   exists(select 1 from public.chapter_review_item_exposures old where old.review_cycle_id=review.review_cycle_id and old.item_id=i.id)
   from public.learning_session_items li join public.items i on i.id=li.item_id join public.item_templates t on t.id=i.item_template_id join public.item_families f on f.id=t.item_family_id where li.session_id=s.id;
 end if;
end;
$$;

create or replace function public.service_start_governed_session_atomic(p_student_id uuid,p_auth_session_id uuid,
  p_enrollment_id uuid,p_policy_binding_id uuid,p_form_id uuid,p_target_skill_id uuid,p_item_ids uuid[])
returns jsonb language plpgsql security definer set search_path='' as $$
declare b public.assessment_policy_bindings%rowtype; e public.institutional_class_enrollments%rowtype;
  s public.learning_sessions%rowtype; code text; v_mode text; baseline uuid; policy jsonb; entry record; details jsonb;
begin
  select * into b from public.assessment_policy_bindings where id=p_policy_binding_id;
  if not found then raise exception 'assessment_policy_unavailable'; end if;
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
  elsif p_form_id is not null then raise exception 'governed_session_items_invalid'; end if;
  if v_mode='mastery_check' then
    if p_form_id is not null or p_target_skill_id is not null then raise exception 'governed_session_items_invalid'; end if;
    for entry in select * from jsonb_each_text(policy->'questionCountBySkill') loop
      if (select count(*) from public.items where id=any(p_item_ids) and skill_id=entry.key::uuid)<>entry.value::integer then raise exception 'governed_mastery_coverage_invalid'; end if;
    end loop;
  end if;
  details:=private.prepare_governed_lifecycle(p_student_id,b.id);
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
revoke all on function public.service_start_governed_session_atomic(uuid,uuid,uuid,uuid,uuid,uuid,uuid[])
  from public, anon, authenticated;
grant execute on function public.service_start_governed_session_atomic(uuid,uuid,uuid,uuid,uuid,uuid,uuid[]) to service_role;

create function public.service_launch_governed_learning(p_student_id uuid,p_auth_session_id uuid,p_enrollment_id uuid,p_blueprint_id uuid,
 p_target_skill_id uuid default null,p_recommendation_instance_id uuid default null,p_read_only boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare bp public.assessment_blueprints%rowtype; b public.assessment_policy_bindings%rowtype; policy jsonb; code text; selected_form_id uuid;
 picked uuid[]; details jsonb; result jsonb; target uuid; binding_id uuid; entry record; n integer; state public.chapter_mastery_states%rowtype; ready jsonb;
begin
 select * into bp from public.assessment_blueprints where id=p_blueprint_id;
 if not found then raise exception 'learning_context_unavailable'; end if;
 perform private.lock_student_learning_context(p_student_id,p_auth_session_id,p_enrollment_id,bp.curriculum_release_id,bp.unit_id);
 if not p_read_only then
   result:=public.service_resume_governed_learning(p_student_id,p_auth_session_id,p_enrollment_id,bp.curriculum_release_id,bp.unit_id,bp.purpose);
   if result->>'resumed'='true' then
     if p_recommendation_instance_id is not null then perform public.service_record_governed_recommendation_event(p_student_id,p_auth_session_id,p_recommendation_instance_id,'action_started','start_learning_session',(result#>>'{session,id}')::uuid); end if;
     return private.authorized_governed_result(p_student_id,p_auth_session_id,p_enrollment_id,bp.curriculum_release_id,bp.unit_id,result);
   end if;
 end if;
 policy:=private.validate_assessment_policy_v1(bp.id);
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
 perform private.lock_student_learning_context(p_student_id,p_auth_session_id,p_enrollment_id,bp.curriculum_release_id,bp.unit_id);
 binding_id:=public.service_bind_assessment_policy(bp.id);
 select * into strict b from public.assessment_policy_bindings where id=binding_id;
 picked:='{}'::uuid[];
 if bp.purpose='diagnostic' then
   select f.id into selected_form_id from public.assessment_forms f where f.pool_id=bp.assessment_pool_id and f.status='active'
   order by md5(p_student_id::text||':'||b.subject_program_id::text||':'||b.unit_id::text||':'||f.id::text),f.id limit 1;
   select array_agg(fi.item_id order by md5(p_student_id::text||':'||fi.item_id::text),fi.item_id) into picked from public.assessment_form_items fi where fi.form_id=selected_form_id;
 elsif bp.purpose='mastery_check' then
   for entry in select * from jsonb_each_text(b.policy_snapshot->'questionCountBySkill') loop
     picked:=picked||array(select i.id from public.assessment_blueprint_items bi join public.items i on i.id=bi.item_id
       where bi.assessment_blueprint_id=bp.id and i.skill_id=entry.key::uuid
       order by exists(select 1 from public.learning_session_items old join public.learning_sessions ls on ls.id=old.session_id
          where ls.student_id=p_student_id and ls.curriculum_release_id=b.curriculum_release_id and ls.governed_unit_id=b.unit_id and ls.mode='mastery_check' and ls.status='completed' and old.item_id=i.id),
       (select count(*) from public.student_item_exposure_events e where e.student_id=p_student_id and e.curriculum_release_id=b.curriculum_release_id and e.item_id=i.id),
       (select max(served_at) from public.student_item_exposure_events e where e.student_id=p_student_id and e.curriculum_release_id=b.curriculum_release_id and e.item_id=i.id) nulls first,i.code,i.id
       limit entry.value::integer);
   end loop;
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

create function private.render_governed_hint(p_text text,p_keys jsonb,p_parameters jsonb)
returns text language plpgsql immutable set search_path='' as $$
declare key text;
begin
 for key in select jsonb_array_elements_text(coalesce(p_keys,'[]')) loop
   if key ~ '^[A-Za-z0-9_]+$' and jsonb_typeof(p_parameters->key) in ('string','number','boolean') then
     p_text:=replace(p_text,'{{'||key||'}}',p_parameters->>key);
   end if;
 end loop;
 return coalesce(p_text,'');
end;
$$;

create function private.governed_presentation_key(p_ordinal integer)
returns text language plpgsql immutable set search_path='' as $$
declare result text:='';
begin
 if p_ordinal<1 then raise exception 'invalid_option_presentation_key'; end if;
 while p_ordinal>0 loop p_ordinal:=p_ordinal-1;result:=chr(65+p_ordinal%26)||result;p_ordinal:=p_ordinal/26;end loop;
 return result;
end;
$$;
create function private.governed_presentation_index(p_key text)
returns integer language plpgsql immutable set search_path='' as $$
declare result integer:=0; n integer;
begin
 p_key:=upper(trim(p_key));
 if p_key is null or p_key !~ '^[A-Z]+$' or length(p_key)>6 then raise exception 'invalid_option_presentation_key'; end if;
 for n in 1..length(p_key) loop result:=result*26+ascii(substr(p_key,n,1))-64; end loop;
 return result-1;
end;
$$;

create function public.service_governed_learning_operation(p_student_id uuid,p_auth_session_id uuid,p_session_id uuid,p_action text,p_payload jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.learning_sessions%rowtype; b public.assessment_policy_bindings%rowtype; li public.learning_session_items%rowtype;
 item public.items%rowtype; key public.item_answer_keys%rowtype; model jsonb; presentation jsonb; learner_options jsonb;
 actual text; canonical_actual text; expected text; is_correct boolean; error_code text; result jsonb; lifecycle jsonb; final_result jsonb; skill_results jsonb; passed boolean; percent numeric;
 choice uuid; desired integer; score numeric; wrong_count integer; band jsonb; practice jsonb; cooldown integer; hint jsonb; guide jsonb; scope text; next_level integer; stage text; post_answer boolean;
 evidence_count integer; recent_count integer; independent_count integer; unique_count integer; completion_reason text;
 title text; strategy text; content text; hint_keys jsonb; params jsonb; recommendation_id uuid; recommendation_action text;
 prerequisite_target uuid; next_target uuid; recommendation_target uuid; recommendation_target_unit uuid;
begin
 s:=private.lock_governed_learning_session(p_student_id,p_auth_session_id,p_session_id);
 select * into strict b from public.assessment_policy_bindings where id=s.assessment_policy_binding_id;
 select configuration into strict model from public.learning_model_configurations where id=b.learning_model_configuration_id;
 perform private.validate_governed_learning_model(b.learning_model_configuration_id);
 if p_payload->>'expectedMode' is not null and s.mode<>p_payload->>'expectedMode' then raise exception 'learning_context_unavailable'; end if;
 if p_action='status' then
   select to_jsonb(st) into lifecycle from public.chapter_mastery_states st where st.student_id=p_student_id and st.curriculum_release_id=s.curriculum_release_id and st.unit_code=s.unit_code;
   return private.authorized_governed_result(p_student_id,p_auth_session_id,s.institutional_class_enrollment_id,s.curriculum_release_id,s.governed_unit_id,jsonb_build_object('session',private.learner_governed_session(to_jsonb(s)),'assessmentPolicy',b.policy_snapshot,'lifecycle',lifecycle,'unitId',s.governed_unit_id));
 end if;
 if s.status<>'active' and not (p_action='serve' and s.status='completed') then raise exception 'session_not_active'; end if;
 if p_action='serve' and s.status='completed' then
   return private.authorized_governed_result(p_student_id,p_auth_session_id,s.institutional_class_enrollment_id,s.curriculum_release_id,s.governed_unit_id,jsonb_build_object('complete',true,'session',to_jsonb(s),'summary',jsonb_build_object('answered',s.answered_count,'correct',s.correct_count,'planned',s.planned_item_count,'percent',round(100.0*s.correct_count/nullif(s.answered_count,0)))));
 end if;
 if p_payload->>'sessionItemId' is not null then
 select * into li from public.learning_session_items where id=(p_payload->>'sessionItemId')::uuid and session_id=s.id for update;
 else
   select * into li from public.learning_session_items where session_id=s.id and answered_at is null order by ordinal limit 1 for update;
 end if;
 if li.id is not null and li.answered_at is null and li.ordinal<>s.answered_count+1 then raise exception 'learning_context_unavailable'; end if;
 if li.id is null and p_action='serve' and s.mode='practice' then
   select mastery_score,m.evidence_count into score,evidence_count from public.student_skill_mastery_by_release m where student_id=p_student_id and curriculum_release_id=s.curriculum_release_id and skill_id=s.target_skill_id;
   select count(distinct item_id) into unique_count from public.learning_session_items where session_id=s.id and answered_at is not null;
   select count(*),count(*) filter(where correct and hint_level_used=0) into recent_count,independent_count
   from (select correct,hint_level_used from public.learning_session_items where session_id=s.id and answered_at is not null order by ordinal desc limit (model#>>'{recentRecovery,recentWindow}')::integer) recent;
   completion_reason:=case when evidence_count>=(model#>>'{mastery,minimumEvidenceCount}')::integer and score>=(model#>>'{mastery,secureAtOrAbove}')::numeric then 'mastery_reached'
     when unique_count>=(model#>>'{recentRecovery,minimumUniqueItems}')::integer and recent_count>=(model#>>'{recentRecovery,recentWindow}')::integer and independent_count>=(model#>>'{recentRecovery,minimumIndependentCorrect}')::integer then 'independent_recovery' else null end;
   if completion_reason is not null then
     update public.learning_sessions set status='completed',completed_at=clock_timestamp(),updated_at=clock_timestamp(),metadata=metadata||jsonb_build_object('completionReason',completion_reason) where id=s.id returning * into s;
     return private.authorized_governed_result(p_student_id,p_auth_session_id,s.institutional_class_enrollment_id,s.curriculum_release_id,s.governed_unit_id,jsonb_build_object('complete',true,'session',to_jsonb(s),'summary',jsonb_build_object('answered',s.answered_count,'correct',s.correct_count,'planned',s.planned_item_count,'percent',coalesce(round(100.0*s.correct_count/nullif(s.answered_count,0)),0),'reason',completion_reason)));
   end if;
 end if;
 if li.id is null and not (p_action='serve' and s.mode='practice' and s.answered_count<s.planned_item_count) then raise exception 'learning_context_unavailable'; end if;
 if p_action='serve' and s.mode='practice' and li.id is null then
   practice:=model->'practice';
   if not (practice ?& array['desiredDifficultyBands','consecutiveWrongAdjustment','exactVariantCooldownRecentDistinctVariants','selectionPolicyVersion'])
   or practice->>'selectionPolicyVersion'<>'11B-v1' then raise exception 'unsupported_practice_selection_contract'; end if;
   cooldown:=(practice->>'exactVariantCooldownRecentDistinctVariants')::integer;
   if cooldown<0 then raise exception 'unsupported_practice_selection_contract'; end if;
   select mastery_score into score from public.student_skill_mastery_by_release where student_id=p_student_id and curriculum_release_id=s.curriculum_release_id and skill_id=s.target_skill_id;
   if score is null then score:=(model#>>'{mastery,priorAlpha}')::numeric/((model#>>'{mastery,priorAlpha}')::numeric+(model#>>'{mastery,priorBeta}')::numeric); end if;
   for band in select value from jsonb_array_elements(practice->'desiredDifficultyBands') loop
     if ((band ? 'masteryBelow') and score<(band->>'masteryBelow')::numeric) or ((band ? 'masteryAtOrAbove') and score>=(band->>'masteryAtOrAbove')::numeric) then desired:=(band->>'difficulty')::integer; exit; end if;
   end loop;
   if desired is null then raise exception 'unsupported_practice_selection_contract'; end if;
   select count(*) into wrong_count from (select correct from public.attempts where student_id=p_student_id and curriculum_release_id=s.curriculum_release_id and skill_id=s.target_skill_id order by created_at desc,id desc limit 2) recent where not correct;
   -- Only a consecutive suffix counts; a newer correct answer resets recovery.
   if (select correct from public.attempts where student_id=p_student_id and curriculum_release_id=s.curriculum_release_id and skill_id=s.target_skill_id order by created_at desc,id desc limit 1) then wrong_count:=0; end if;
   desired:=greatest((model#>>'{mastery,difficultyWeight,difficultyMin}')::integer,least((model#>>'{mastery,difficultyWeight,difficultyMax}')::integer,
     desired+case when wrong_count>=2 then (practice#>>'{consecutiveWrongAdjustment,twoOrMoreWrong}')::integer when wrong_count=1 then (practice#>>'{consecutiveWrongAdjustment,oneWrong}')::integer else 0 end));
   with history as (
     select e.*,row_number() over(partition by e.item_id order by e.served_at desc,e.id desc) rn
     from public.student_item_exposure_events e where e.student_id=p_student_id and e.curriculum_release_id=s.curriculum_release_id
   ), recent as (select item_id,max(served_at) last_seen from history group by item_id order by last_seen desc,item_id limit cooldown),
   candidates as (
     select i.id,i.code,i.difficulty,(select count(*) from history h where h.item_id=i.id) seen,
     exists(select 1 from public.learning_session_items old where old.session_id=s.id and (li.id is null or old.id<>li.id) and old.item_id=i.id and
       (old.answered_at is not null or exists(select 1 from public.student_item_exposure_events e where e.session_item_id=old.id))) used,
     exists(select 1 from recent r where r.item_id=i.id) cooling,
     (select correct from history h where h.item_id=i.id and h.answered_at is not null order by served_at desc,id desc limit 1) latest_correct,
     (select max(served_at) from history h where h.item_id=i.id) last_seen
     from public.assessment_blueprint_items bi join public.items i on i.id=bi.item_id join public.assessment_pool_items pi on pi.item_id=i.id
     join public.assessment_blueprints bp on bp.id=bi.assessment_blueprint_id and bp.assessment_pool_id=pi.pool_id
     where bp.id=s.assessment_blueprint_id and i.skill_id=s.target_skill_id and i.status='published' and pi.enabled and i.version_no=bi.item_version_snapshot
   ) select id into choice from candidates order by
     case when seen=0 and not used then 0 when not used and not cooling and latest_correct=false then 1 when not used and not cooling then 2 else 3 end,
     case when seen=0 then abs(difficulty-desired) end,last_seen nulls first,seen,abs(difficulty-desired),code,id limit 1;
   if choice is null then raise exception 'learning_context_unavailable'; end if;
   insert into public.learning_session_items(session_id,ordinal,item_id,skill_id,selection_reason) values(s.id,s.answered_count+1,choice,s.target_skill_id,'configured-adaptive-exposure-v1') returning * into li;
 end if;
 select * into strict item from public.items where id=li.item_id for share;
 -- Runtime delivery uses frozen item versions and live pool/content retirement.
 perform 1 from public.assessment_pool_items pi join public.assessment_blueprints bp on bp.assessment_pool_id=pi.pool_id join public.assessment_pools pool on pool.id=pi.pool_id
 where bp.id=s.assessment_blueprint_id and pi.item_id=item.id and pi.enabled and pool.status='active' for share of pi,pool;
 if not found or item.status<>'published' or not (b.skill_scope_snapshot ? item.skill_id::text)
 or not (b.policy_snapshot->'responseTypes' ? item.item_type::text)
 or not exists(select 1 from public.assessment_blueprint_items bi where bi.assessment_blueprint_id=s.assessment_blueprint_id and bi.item_id=item.id and bi.item_version_snapshot=item.version_no)
 then raise exception 'learning_context_unavailable'; end if;
 if p_action='serve' then
   if li.answered_at is not null then raise exception 'session_item_already_answered'; end if;
   if item.item_type='single_choice' then
     presentation:=public.service_ensure_session_item_option_order(li.id);
     select jsonb_agg(jsonb_build_object('option_key',private.governed_presentation_key(x.ordinal::integer),'content_hy',o.content_hy,'display_order',x.ordinal) order by x.ordinal) into learner_options
     from jsonb_array_elements_text(presentation->'canonicalOptionOrder') with ordinality x(value,ordinal)
     join public.item_options o on o.item_id=item.id and o.option_key=x.value;
   else select jsonb_agg(jsonb_build_object('option_key',option_key,'content_hy',content_hy,'display_order',display_order) order by display_order) into learner_options from public.item_options where item_id=item.id; end if;
   perform public.service_record_item_exposure(p_student_id,s.id,li.id,item.id,clock_timestamp());
   return private.authorized_governed_result(p_student_id,p_auth_session_id,s.institutional_class_enrollment_id,s.curriculum_release_id,s.governed_unit_id,jsonb_build_object('complete',false,'session',jsonb_build_object('id',s.id,'mode',s.mode,'status',s.status,'position',li.ordinal,'total',s.planned_item_count,'answered',s.answered_count,'correct',case when s.mode in ('diagnostic','mastery_check') then null else s.correct_count end,'feedbackMode',case when s.mode in ('diagnostic','mastery_check') then 'deferred' else 'immediate' end),
   'sessionItemId',li.id,'skill',(select jsonb_build_object('id',id,'code',code,'nameHy',name_hy,'layer',layer) from public.skills where id=item.skill_id),
   'item',jsonb_build_object('id',item.id,'code',item.code,'type',item.item_type,'promptHy',item.prompt_hy,'stimulus',item.stimulus,'difficulty',item.difficulty,'options',coalesce(learner_options,'[]'),'optionPresentationVersion',presentation->>'algorithmVersion'),
   'remediation',jsonb_build_object('available',(b.policy_snapshot->>'hintsAllowed')::boolean,'hintLevelUsed',li.hint_level_used,'selectionReason',li.selection_reason)));
 elsif p_action='answer' then
   if li.answered_at is not null then raise exception 'session_item_already_answered'; end if;
   if item.id is distinct from (p_payload->>'itemId')::uuid then raise exception 'learning_context_unavailable'; end if;
   if not exists(select 1 from public.student_item_exposure_events where session_item_id=li.id) then raise exception 'learning_context_unavailable'; end if;
   select * into strict key from public.item_answer_keys where item_id=item.id for share;
   expected:=lower(trim(coalesce(key.answer->>'value',key.answer#>>'{}')));
   actual:=lower(trim(p_payload#>>'{response,value}'));
   if item.item_type='single_choice' then
     presentation:=public.service_ensure_session_item_option_order(li.id);
     if private.governed_presentation_index(actual)>=jsonb_array_length(presentation->'canonicalOptionOrder') then raise exception 'invalid_option_presentation_key'; end if;
     canonical_actual:=presentation->'canonicalOptionOrder'->>private.governed_presentation_index(actual);
     actual:=lower(canonical_actual);
     is_correct:=actual=expected; error_code:=case when is_correct then null else 'incorrect_choice' end;
   elsif item.item_type='true_false' then
     if expected not in ('true','false') then raise exception 'invalid_boolean_key'; end if;
     is_correct:=actual=expected; error_code:=case when actual not in ('true','false') or actual is null then 'invalid_boolean' when is_correct then null else 'incorrect_boolean' end;
   else raise exception 'unsupported_scoring_strategy'; end if;
   is_correct:=coalesce(is_correct,false);
   result:=public.service_record_session_answer_atomic(p_student_id,s.id,li.id,item.id,item.skill_id,p_payload->'response',jsonb_build_object('value',coalesce(canonical_actual,actual),'presentationValue',p_payload#>>'{response,value}','optionPresentationVersion',presentation->>'algorithmVersion'),case when is_correct then 1 else 0 end,is_correct,error_code,false,(p_payload->>'responseTimeMs')::integer,clock_timestamp());
   select * into strict s from public.learning_sessions where id=s.id;
   if s.status='completed' and s.mode='mastery_check' then
     select jsonb_agg(jsonb_build_object('skillId',q.skill_id,'correct',q.correct,'total',q.total) order by q.skill_id) into skill_results from
     (select skill_id,count(*) total,count(*) filter(where correct) correct from public.learning_session_items where session_id=s.id and answered_at is not null group by skill_id) q;
     percent:=round(100.0*s.correct_count/s.answered_count);
     passed:=percent>=(b.policy_snapshot->>'minimumPercent')::numeric and not exists(select 1 from jsonb_each_text(b.policy_snapshot->'minimumCorrectBySkill') minimum
       where (select count(*) from public.learning_session_items where session_id=s.id and skill_id=minimum.key::uuid and correct)<minimum.value::integer);
     lifecycle:=public.finalize_mastery_check_atomic(p_student_id,s.id,passed,percent,jsonb_build_object('passed',passed,'skillResults',skill_results,'failedSkillIds',
       (select coalesce(jsonb_agg(value->>'skillId'),'[]') from jsonb_array_elements(skill_results) where (value->>'correct')::integer<(value->>'total')::integer),'assessmentPolicyFingerprint',b.snapshot_fingerprint));
     final_result:=jsonb_build_object('passed',passed,'score',jsonb_build_object('correct',s.correct_count,'answered',s.answered_count,'percent',percent),'passCriteria',jsonb_build_object('overallPercent',b.policy_snapshot->'minimumPercent','minimumCorrectBySkill',b.policy_snapshot->'minimumCorrectBySkill'),'skillResults',skill_results,'lifecycle',lifecycle);
   elsif s.status='completed' and s.mode='chapter_review' then lifecycle:=public.finalize_chapter_review_atomic(p_student_id,s.id); end if;
   if s.status='completed' then select * into strict s from public.learning_sessions where id=s.id; end if;
   if s.mode in ('diagnostic','mastery_check') then
     return private.authorized_governed_result(p_student_id,p_auth_session_id,s.institutional_class_enrollment_id,s.curriculum_release_id,s.governed_unit_id,jsonb_build_object('accepted',true,'revealCorrect',false,'attemptId',result->'attemptId','session',private.learner_governed_session(to_jsonb(s)),'finalResult',final_result,'curriculumReleaseId',s.curriculum_release_id,'assessmentBlueprintId',s.assessment_blueprint_id,'provenanceStatus',s.provenance_status));
   end if;
   hint:=model#>'{recommendation,corePolicy}';
   if not (hint ?& array['default','insufficientEvidence','weakWithUnmetPrerequisite','secureWithNextSkill']) then raise exception 'unsupported_recommendation_contract'; end if;
   select pre.prerequisite_skill_id into prerequisite_target from public.skill_prerequisites pre
       join public.curriculum_release_skills rs on rs.skill_id=pre.prerequisite_skill_id and rs.curriculum_release_id=s.curriculum_release_id
       left join public.student_skill_mastery_by_release m on m.student_id=p_student_id and m.curriculum_release_id=s.curriculum_release_id and m.skill_id=pre.prerequisite_skill_id
       where pre.skill_id=item.skill_id and (m.mastery_score is null or m.mastery_score<pre.required_mastery)
       order by rs.sequence_order_snapshot,rs.skill_id limit 1;
   select rs.skill_id into next_target from public.curriculum_release_skills rs
   where rs.curriculum_release_id=s.curriculum_release_id and b.skill_scope_snapshot ? rs.skill_id::text
   and rs.sequence_order_snapshot>(select sequence_order_snapshot from public.curriculum_release_skills where curriculum_release_id=s.curriculum_release_id and skill_id=item.skill_id)
   order by rs.sequence_order_snapshot,rs.skill_id limit 1;
   recommendation_action:=case
     when result#>>'{masteryAfter,status}' in ('needs_support','developing') and prerequisite_target is not null then hint->>'weakWithUnmetPrerequisite'
     when result#>>'{masteryAfter,status}'='insufficient_evidence' then hint->>'insufficientEvidence'
     when result#>>'{masteryAfter,status}'='secure' and next_target is not null then hint->>'secureWithNextSkill'
     else hint->>'default' end;
   recommendation_target:=case when recommendation_action=hint->>'weakWithUnmetPrerequisite' then prerequisite_target
     when recommendation_action=hint->>'secureWithNextSkill' then next_target else item.skill_id end;
   select min(ic.unit_id::text)::uuid into recommendation_target_unit from public.item_curriculum_scopes ic
   join public.curriculum_release_units ru on ru.curriculum_release_id=s.curriculum_release_id and ru.unit_id=ic.unit_id
   join public.items ri on ri.id=ic.item_id
   where ri.skill_id=recommendation_target and ic.subject_program_id=s.subject_program_id and ic.is_primary
   having count(distinct ic.unit_id)=1;
   -- Ambiguous or unreleased action targets remain current-skill practice; no
   -- implicit chapter choice or catalogue code ordering is introduced.
   if recommendation_target_unit is null then recommendation_target:=item.skill_id;recommendation_target_unit:=s.governed_unit_id;recommendation_action:=hint->>'default';end if;
   recommendation_id:=gen_random_uuid();
   insert into public.recommendation_events(recommendation_instance_id,student_id,event_type,policy_scope,surface,action,target_skill_id,curriculum_release_id,assessment_blueprint_id,learning_model_configuration_id,model_provenance_status,learning_session_id,attempt_id,state_snapshot,recommendation_snapshot)
   values(recommendation_id,p_student_id,'issued','core_after_attempt','submit_answer_api',recommendation_action,recommendation_target,s.curriculum_release_id,s.assessment_blueprint_id,s.learning_model_configuration_id,s.model_provenance_status,s.id,(result->>'attemptId')::uuid,
    jsonb_build_object('unitId',s.governed_unit_id,'enrollmentId',s.institutional_class_enrollment_id,'assessmentPolicyBindingId',b.id,'masteryBefore',result->'masteryBefore','masteryAfter',result->'masteryAfter'),jsonb_build_object('action',recommendation_action,'targetUnitId',recommendation_target_unit));
   return private.authorized_governed_result(p_student_id,p_auth_session_id,s.institutional_class_enrollment_id,s.curriculum_release_id,s.governed_unit_id,jsonb_build_object('attemptId',result->'attemptId','session',to_jsonb(s),'curriculumReleaseId',s.curriculum_release_id,'assessmentBlueprintId',s.assessment_blueprint_id,'itemId',item.id,'skillId',item.skill_id,
   'grading',jsonb_build_object('correct',is_correct,'score',case when is_correct then 1 else 0 end,'errorCode',error_code,'feedbackCode',key.feedback_code,'usedHelp',result->'hintUsed'),
   'mastery',jsonb_build_object('score',result#>'{masteryAfter,masteryScore}','evidenceCount',result#>'{masteryAfter,evidenceCount}','status',result#>'{masteryAfter,status}'),'recommendation',jsonb_build_object('action',recommendation_action,'targetSkillId',recommendation_target,'unitId',recommendation_target_unit,'curriculumReleaseId',s.curriculum_release_id,'enrollmentId',s.institutional_class_enrollment_id,'instanceId',recommendation_id,'policyScope','core_after_attempt','modelConfigurationId',s.learning_model_configuration_id,'modelProvenanceStatus',s.model_provenance_status),'chapterReview',lifecycle));
 elsif p_action='help' then
   if not (b.policy_snapshot->>'hintsAllowed')::boolean or s.mode not in ('practice','chapter_review') then raise exception 'help_not_available_in_assessment'; end if;
   hint:=model->'hinting';
   if hint->'levels'<>'["orient","strategy","analogous_worked_example"]'::jsonb or hint->>'liveAiGeneration'<>'false' then raise exception 'unsupported_hinting_contract'; end if;
   post_answer:=li.answered_at is not null;
   if post_answer and li.correct then raise exception 'help_not_needed_after_correct_answer'; end if;
   if post_answer then select a.error_code into error_code from public.attempts a where id=li.attempt_id; end if;
   select to_jsonb(g) into guide from public.item_template_remediation_guides g where g.item_template_id=item.item_template_id and g.status='published'
   and (g.trigger_error_code is null or (post_answer and g.trigger_error_code=error_code)) order by (g.trigger_error_code=error_code) desc nulls last,g.guide_version desc,g.id limit 1 for share;
   scope:='template';
   if guide is null then select to_jsonb(g) into guide from public.skill_remediation_guides g where g.skill_id=item.skill_id and g.status='published' order by g.guide_version desc,g.id limit 1 for share; scope:='skill'; end if;
   if guide is null then raise exception 'remediation_guide_missing'; end if;
   next_level:=least(jsonb_array_length(hint->'levels'),li.hint_level_used+1);
   stage:=case next_level when 1 then 'hint_1' when 2 then 'hint_2' else 'worked_example' end;
   hint_keys:=case when scope='template' then guide->'allowed_parameter_keys' else '[]'::jsonb end;params:=coalesce(item.variant_parameters,'{}');
   title:=private.render_governed_hint(guide->>'title_hy',hint_keys,params);strategy:=private.render_governed_hint(guide->>'strategy_hy',hint_keys,params);
   content:=private.render_governed_hint(guide->>case next_level when 1 then 'hint_1_hy' when 2 then 'hint_2_hy' else 'worked_example_hy' end,hint_keys,params);
   perform public.record_remediation_help_atomic(p_student_id,s.id,li.id,item.skill_id,item.id,stage,case when post_answer then 'post_error' else 'pre_answer' end,next_level,scope,(guide->>'id')::uuid,(guide->>'guide_version')::integer,item.item_template_id,error_code,title,strategy,content,
   jsonb_build_object('taskSpecific',scope='template','assessmentPolicyBindingId',b.id,'unitId',s.governed_unit_id));
   return private.authorized_governed_result(p_student_id,p_auth_session_id,s.institutional_class_enrollment_id,s.curriculum_release_id,s.governed_unit_id,jsonb_build_object('stage',stage,'level',next_level,'titleHy',title,'strategyHy',strategy,'contentHy',content,'guideScope',scope,'guideVersion',guide->'guide_version','taskSpecific',scope='template','errorCode',error_code,'postAnswer',post_answer,'moreHelpAvailable',next_level<jsonb_array_length(hint->'levels')));
 end if;
 raise exception 'unsupported_governed_operation';
end;
$$;

revoke all on function public.service_launch_governed_learning(uuid,uuid,uuid,uuid,uuid,uuid,boolean),public.service_governed_learning_operation(uuid,uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.service_launch_governed_learning(uuid,uuid,uuid,uuid,uuid,uuid,boolean),public.service_governed_learning_operation(uuid,uuid,uuid,text,jsonb) to service_role;
revoke all on function private.lock_governed_learning_session(uuid,uuid,uuid),private.governed_skill_ready(uuid,uuid,uuid,uuid),private.prepare_governed_lifecycle(uuid,uuid),private.attach_governed_lifecycle(uuid,jsonb),private.render_governed_hint(text,jsonb,jsonb) from public,anon,authenticated,service_role;
revoke all on function private.governed_presentation_key(integer),private.governed_presentation_index(text) from public,anon,authenticated,service_role;
revoke all on function private.learner_governed_session(jsonb) from public,anon,authenticated,service_role;
revoke all on function private.validate_governed_learning_model(uuid) from public,anon,authenticated,service_role;

create function public.service_record_governed_recommendation_event(p_student_id uuid,p_auth_session_id uuid,p_instance_id uuid,p_event_type text,p_surface text,p_started_session_id uuid default null)
returns boolean language plpgsql security definer set search_path='' as $$
declare issued public.recommendation_events%rowtype; source_session public.learning_sessions%rowtype; started public.learning_sessions%rowtype;
begin
 if p_event_type not in ('shown','clicked','action_started') or p_surface not in ('home','progress','learning_course','physics_course','practice_auto_target','practice_feedback','diagnostic_result','start_learning_session') then raise exception 'invalid_recommendation_event'; end if;
 select * into issued from public.recommendation_events where recommendation_instance_id=p_instance_id and student_id=p_student_id and event_type='issued' limit 1;
 if not found or issued.learning_session_id is null then return false; end if;
 source_session:=private.lock_governed_learning_session(p_student_id,p_auth_session_id,issued.learning_session_id);
 if (issued.curriculum_release_id,issued.assessment_blueprint_id,issued.learning_model_configuration_id)
 is distinct from (source_session.curriculum_release_id,source_session.assessment_blueprint_id,source_session.learning_model_configuration_id)
 or issued.state_snapshot->>'unitId' is distinct from source_session.governed_unit_id::text
 or issued.state_snapshot->>'enrollmentId' is distinct from source_session.institutional_class_enrollment_id::text
 then raise exception 'recommendation_context_mismatch'; end if;
 if p_event_type='action_started' then
   if p_started_session_id is null then return false; end if;
   started:=private.lock_governed_learning_session(p_student_id,p_auth_session_id,p_started_session_id);
   if (started.curriculum_release_id,started.governed_unit_id,started.institutional_class_enrollment_id)
   is distinct from (source_session.curriculum_release_id,coalesce((issued.recommendation_snapshot->>'targetUnitId')::uuid,source_session.governed_unit_id),source_session.institutional_class_enrollment_id)
   or started.status<>'active'
   or (issued.action<>'resume_session' and (started.mode<>'practice' or started.target_skill_id is distinct from issued.target_skill_id
      or issued.action not in ('practice_skill','continue_current_skill','collect_more_evidence','advance_skill','review_prerequisite')))
   then return false; end if;
 end if;
 insert into public.recommendation_events(recommendation_instance_id,student_id,event_type,policy_scope,surface,action,target_skill_id,curriculum_release_id,assessment_blueprint_id,learning_model_configuration_id,model_provenance_status,learning_session_id,attempt_id,state_snapshot,recommendation_snapshot)
 values(issued.recommendation_instance_id,p_student_id,p_event_type,issued.policy_scope,p_surface,issued.action,issued.target_skill_id,issued.curriculum_release_id,issued.assessment_blueprint_id,issued.learning_model_configuration_id,issued.model_provenance_status,
 coalesce(p_started_session_id,issued.learning_session_id),issued.attempt_id,issued.state_snapshot,issued.recommendation_snapshot) on conflict do nothing;
 perform private.authorized_governed_result(p_student_id,p_auth_session_id,source_session.institutional_class_enrollment_id,source_session.curriculum_release_id,source_session.governed_unit_id,'{}'::jsonb);
 return true;
end;
$$;
revoke all on function public.service_record_governed_recommendation_event(uuid,uuid,uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.service_record_governed_recommendation_event(uuid,uuid,uuid,text,text,uuid) to service_role;

create function public.service_is_registered_legacy_learning_session(p_student_id uuid,p_session_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.learning_sessions s join public.legacy_learning_blueprint_mappings m on m.assessment_blueprint_id=s.assessment_blueprint_id
 where s.id=p_session_id and s.student_id=p_student_id and s.assessment_policy_binding_id is null and s.curriculum_release_id=m.curriculum_release_id and s.unit_code=m.unit_code_snapshot);
$$;
revoke all on function public.service_is_registered_legacy_learning_session(uuid,uuid) from public,anon,authenticated;
grant execute on function public.service_is_registered_legacy_learning_session(uuid,uuid) to service_role;

-- Governed branch uses immutable identity; the legacy branch remains verbatim.
create or replace function public.guard_practice_diagnostic_session()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.assessment_policy_binding_id is not null then
    if new.mode in ('practice','chapter_review') and private.scoped_chapter_baseline(new.student_id,new.curriculum_release_id,new.governed_unit_id) is null then raise exception 'chapter_diagnostic_required'; end if;
    return new;
  end if;
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

-- Governed branch uses immutable identity; the legacy branch remains verbatim.
create or replace function public.guard_practice_diagnostic_item()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare v_session public.learning_sessions%rowtype;
begin
  select * into v_session from public.learning_sessions where id = new.session_id;
  if v_session.assessment_policy_binding_id is not null then
    if v_session.mode in ('practice','chapter_review') and private.scoped_chapter_baseline(v_session.student_id,v_session.curriculum_release_id,v_session.governed_unit_id) is null then raise exception 'chapter_diagnostic_required'; end if;
    return new;
  end if;
  if v_session.mode in ('practice', 'chapter_review') and
     not public.has_completed_chapter_diagnostic(v_session.student_id,v_session.unit_code) then
    raise exception 'chapter_diagnostic_required' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- Governed branch uses immutable identity; the legacy branch remains verbatim.
create or replace function public.guard_practice_diagnostic_attempt()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare v_unit text; v_mode text; v_session public.learning_sessions%rowtype;
begin
  if new.learning_session_id is not null then
    select * into v_session from public.learning_sessions where id=new.learning_session_id and student_id=new.student_id;
    if v_session.assessment_policy_binding_id is not null then
      if v_session.mode in ('practice','chapter_review') and private.scoped_chapter_baseline(new.student_id,v_session.curriculum_release_id,v_session.governed_unit_id) is null then raise exception 'chapter_diagnostic_required'; end if;
      return new;
    end if;
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
