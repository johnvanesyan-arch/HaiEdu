-- Approved 2026-10-15: opt-in, subject-neutral scoring/readiness/reporting scope.
-- No release/configuration activation or learner/content rewrites. v1 snapshots remain closed.
-- The historical validate_assessment_policy_v1 name is retained as the compatible dispatcher.
create function private.assessment_skill_set_valid(p_value jsonb,p_scope jsonb default null)
returns boolean language sql immutable set search_path='' as $$
 select case when jsonb_typeof(p_value) is distinct from 'array' then false else
 jsonb_array_length(p_value)>0
 and (select count(distinct x) from jsonb_array_elements(p_value) x)=jsonb_array_length(p_value)
 and not exists(select 1 from jsonb_array_elements(p_value) x where jsonb_typeof(x)<>'string'
 or trim(both '"' from x::text) !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
 or (p_scope is not null and not (p_scope @> jsonb_build_array(x)))) end;
$$;

create function private.validate_assessment_scope_v2(p_policy jsonb,p_scope jsonb)
returns void language plpgsql set search_path='' as $$
declare delivered jsonb:=p_policy->'deliveredSkillIds'; groups jsonb:=p_policy->'reportingGroups';
 g jsonb; members jsonb:='[]'; keys text[]:='{}'; scored jsonb:=p_policy->'scoredSkillIds';
begin
 if not private.assessment_skill_set_valid(delivered,p_scope) or not (delivered @> p_scope)
 or jsonb_typeof(groups) is distinct from 'array' then raise exception 'assessment_policy_skill_scope_invalid'; end if;
 if jsonb_array_length(groups)=0 then raise exception 'assessment_policy_invalid'; end if;
 if p_policy ? 'questionCountBySkill' and
 ((select count(*) from jsonb_object_keys(p_policy->'questionCountBySkill'))<>jsonb_array_length(delivered)
 or exists(select 1 from jsonb_array_elements_text(delivered) skill where not (p_policy->'questionCountBySkill' ? skill)))
 then raise exception 'assessment_policy_skill_scope_invalid'; end if;
 for g in select value from jsonb_array_elements(groups) loop
   if jsonb_typeof(g) is distinct from 'object' then raise exception 'assessment_policy_invalid'; end if;
   if (select count(*) from jsonb_object_keys(g))<>3 or exists(select 1 from jsonb_object_keys(g) k where k not in ('key','label','skillIds'))
   or jsonb_typeof(g->'key') is distinct from 'string' or coalesce(g->>'key','') !~ '^[a-z][a-z0-9_-]{0,63}$'
   or g->>'key'=any(keys) or jsonb_typeof(g->'label') is distinct from 'string'
   or coalesce(length(trim(g->>'label')),0)=0 or length(g->>'label')>200
   or not private.assessment_skill_set_valid(g->'skillIds',delivered)
   then raise exception 'assessment_policy_invalid'; end if;
   members:=members||(g->'skillIds'); keys:=array_append(keys,g->>'key');
 end loop;
 if jsonb_array_length(members)<>jsonb_array_length(delivered)
 or not private.assessment_skill_set_valid(members,delivered) then raise exception 'assessment_policy_invalid'; end if;
 if p_policy->>'mode'='mastery_check' then
   if not private.assessment_skill_set_valid(scored,delivered)
   or not private.assessment_skill_set_valid(p_policy->'readinessSkillIds',delivered)
   or exists(select 1 from jsonb_object_keys(p_policy->'minimumCorrectBySkill') k where not (scored ? k))
   or exists(select 1 from jsonb_array_elements(groups) grp where
     exists(select 1 from jsonb_array_elements_text(grp->'skillIds') s where scored ? s)
     and exists(select 1 from jsonb_array_elements_text(grp->'skillIds') s where not (scored ? s)))
   then raise exception 'assessment_policy_invalid'; end if;
 elsif p_policy ? 'scoredSkillIds' or p_policy ? 'readinessSkillIds' then raise exception 'assessment_policy_invalid'; end if;
end;
$$;

-- All counts are derived from answered, frozen session items. No subject identifiers.
create function private.assessment_result_v2(p_policy jsonb,p_skills jsonb)
returns jsonb language plpgsql immutable set search_path='' as $$
declare g jsonb; groups jsonb:='[]'; result jsonb; correct_n integer; answered_n integer;
 scored_correct integer; scored_total integer; passed boolean; percent numeric;
begin
 if p_policy->>'schemaVersion' is distinct from 'haiedu-assessment-policy-v2' then return null; end if;
 for g in select value from jsonb_array_elements(p_policy->'reportingGroups') loop
   select coalesce(sum((s->>'correct')::integer),0),coalesce(sum((s->>'total')::integer),0) into correct_n,answered_n
   from jsonb_array_elements(p_skills) s where g->'skillIds' ? (s->>'skillId');
   groups:=groups||jsonb_build_array(jsonb_build_object('key',g->'key','label',g->'label','skillIds',g->'skillIds',
     'determinesPass',p_policy->>'mode'='mastery_check' and coalesce(p_policy->'scoredSkillIds' @> (g->'skillIds'),false),
     'correct',correct_n,'answered',answered_n,'percent',round(100.0*correct_n/nullif(answered_n,0))));
 end loop;
 select coalesce(sum((s->>'correct')::integer),0),coalesce(sum((s->>'total')::integer),0) into correct_n,answered_n from jsonb_array_elements(p_skills) s;
 result:=jsonb_build_object('schemaVersion','haiedu-assessment-result-v2','groups',groups,
   'overallScore',jsonb_build_object('correct',correct_n,'answered',answered_n,'percent',round(100.0*correct_n/nullif(answered_n,0))),
   'readinessSkillIds',p_policy->'readinessSkillIds','scoredSkillIds',p_policy->'scoredSkillIds');
 if p_policy->>'mode'='mastery_check' then
   select coalesce(sum((s->>'correct')::integer),0),coalesce(sum((s->>'total')::integer),0) into scored_correct,scored_total
   from jsonb_array_elements(p_skills) s where p_policy->'scoredSkillIds' ? (s->>'skillId');
   if scored_total=0 then raise exception 'assessment_result_scope_invalid'; end if;
   percent:=round(100.0*scored_correct/scored_total);
   passed:=100.0*scored_correct/scored_total>=(p_policy->>'minimumPercent')::numeric
   and not exists(select 1 from jsonb_each_text(p_policy->'minimumCorrectBySkill') minimum where
     coalesce((select (s->>'correct')::integer from jsonb_array_elements(p_skills) s where s->>'skillId'=minimum.key),0)<minimum.value::integer);
   result:=result||jsonb_build_object('passed',passed,'score',jsonb_build_object('correct',scored_correct,'answered',scored_total,'percent',percent),
     'passCriteria',jsonb_build_object('minimumPercent',p_policy->'minimumPercent','minimumCorrectBySkill',p_policy->'minimumCorrectBySkill','scoredSkillIds',p_policy->'scoredSkillIds'));
 end if;
 return result;
end;
$$;
revoke all on function private.assessment_skill_set_valid(jsonb,jsonb),private.validate_assessment_scope_v2(jsonb,jsonb),private.assessment_result_v2(jsonb,jsonb) from public,anon,authenticated,service_role;
create or replace function private.validate_assessment_policy_v1(p_blueprint_id uuid)
returns jsonb language plpgsql set search_path='' as $$
declare
  b public.assessment_blueprints%rowtype; r public.curriculum_releases%rowtype;
  pool public.assessment_pools%rowtype; model public.learning_model_configurations%rowtype;
  lifecycle public.academic_mastery_policy_versions%rowtype;
  policy jsonb; entry record; form record; total numeric; n integer; code text;
begin
  select * into b from public.assessment_blueprints where id=p_blueprint_id for share;
  if not found or b.status not in ('pilot','production') then
    raise exception 'assessment_policy_unavailable'; end if;
  select * into r from public.curriculum_releases where id=b.curriculum_release_id for share;
  if not found or r.status<>b.status then raise exception 'assessment_policy_unavailable'; end if;
  select unit_code_snapshot into code from public.curriculum_release_units
    where curriculum_release_id=r.id and unit_id=b.unit_id for share;
  if not found then raise exception 'assessment_policy_invalid'; end if;
  policy:=b.configuration_snapshot->'assessmentPolicy';
  if jsonb_typeof(policy) is distinct from 'object' then raise exception 'assessment_policy_unconfigured'; end if;
  if coalesce(policy->>'schemaVersion','') not in ('haiedu-assessment-policy-v1','haiedu-assessment-policy-v2')
    or b.purpose not in ('diagnostic','practice','mastery_check','chapter_review')
    or coalesce(length(trim(policy->>'policyKey')),0)=0
    or jsonb_typeof(policy->'policyKey') is distinct from 'string'
    or jsonb_typeof(policy->'version') is distinct from 'number'
    or coalesce(policy->>'version','') !~ '^[1-9][0-9]*$'
    or (policy->>'version')::numeric>9007199254740991
    or policy->>'mode' is distinct from b.purpose
    or policy->>'subjectProgramId' is distinct from r.subject_program_id::text
    or policy->>'curriculumReleaseId' is distinct from r.id::text
    or policy->>'unitId' is distinct from b.unit_id::text
    or jsonb_typeof(policy->'plannedQuestionCount') is distinct from 'number'
    or coalesce(policy->>'plannedQuestionCount','') !~ '^[1-9][0-9]*$'
    or (policy->>'plannedQuestionCount')::numeric>100
    or policy->>'scoringStrategy' is distinct from 'selected-response-v1'
    or jsonb_typeof(policy->'hintsAllowed') is distinct from 'boolean'
    or jsonb_typeof(policy->'baselineRequired') is distinct from 'boolean'
    or jsonb_typeof(policy->'responseTypes') is distinct from 'array'
  then raise exception 'assessment_policy_invalid'; end if;
  n:=(policy->>'plannedQuestionCount')::integer;
  if jsonb_array_length(policy->'responseTypes')=0 or exists (
    select 1 from jsonb_array_elements(policy->'responseTypes') x
    where x not in ('"single_choice"'::jsonb,'"true_false"'::jsonb))
    or (select count(distinct x) from jsonb_array_elements(policy->'responseTypes') x)
      <>jsonb_array_length(policy->'responseTypes')
    or exists (select 1 from jsonb_object_keys(policy) k where k not in
      ('schemaVersion','policyKey','version','mode','subjectProgramId','curriculumReleaseId','unitId',
       'plannedQuestionCount','learningModelConfigurationId','academicMasteryPolicyId','responseTypes',
       'scoringStrategy','hintsAllowed','baselineRequired','questionCountBySkill',
       'maximumCompletedBaselines','minimumPercent','minimumCorrectBySkill')
      and not (policy->>'schemaVersion'='haiedu-assessment-policy-v2' and k in ('deliveredSkillIds','scoredSkillIds','readinessSkillIds','reportingGroups')))
  then raise exception 'assessment_policy_invalid'; end if;
  if b.purpose in ('diagnostic','mastery_check') then
    if policy->'hintsAllowed'<>'false'::jsonb or jsonb_typeof(policy->'questionCountBySkill') is distinct from 'object'
      or policy->'questionCountBySkill'='{}'::jsonb then raise exception 'assessment_policy_invalid'; end if;
    total:=0;
    for entry in select * from jsonb_each(policy->'questionCountBySkill') loop
      if entry.key !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        or jsonb_typeof(entry.value)<>'number' or entry.value::text !~ '^[1-9][0-9]*$'
        or not exists (select 1 from public.curriculum_release_skills rs
          join public.items i on i.skill_id=rs.skill_id
          join public.assessment_blueprint_items bi on bi.item_id=i.id and bi.assessment_blueprint_id=b.id
          join public.item_curriculum_scopes sc on sc.item_id=i.id and sc.is_primary
          where rs.curriculum_release_id=r.id and sc.unit_id=b.unit_id
            and sc.subject_program_id=r.subject_program_id and rs.skill_id=entry.key::uuid)
      then raise exception 'assessment_policy_skill_scope_invalid'; end if;
      total:=total+entry.value::text::numeric;
    end loop;
    if total<>n then raise exception 'assessment_policy_invalid'; end if;
  elsif policy ? 'questionCountBySkill' then raise exception 'assessment_policy_invalid'; end if;
  if b.purpose='diagnostic' then
    if policy->'maximumCompletedBaselines' is distinct from '1'::jsonb
      or policy->'baselineRequired'<>'false'::jsonb then raise exception 'assessment_policy_invalid'; end if;
  elsif policy ? 'maximumCompletedBaselines' then raise exception 'assessment_policy_invalid'; end if;
  -- Retain the accepted diagnostic-before-practice/review product rule.
  if b.purpose in ('practice','chapter_review') and policy->'baselineRequired'<>'true'::jsonb then
    raise exception 'chapter_diagnostic_policy_required'; end if;
  if b.purpose='mastery_check' then
    if jsonb_typeof(policy->'minimumPercent') is distinct from 'number'
      or (policy->>'minimumPercent')::numeric<=0 or (policy->>'minimumPercent')::numeric>100
      or jsonb_typeof(policy->'minimumCorrectBySkill') is distinct from 'object'
      or policy->'minimumCorrectBySkill'='{}'::jsonb then raise exception 'assessment_policy_invalid'; end if;
    for entry in select * from jsonb_each(policy->'minimumCorrectBySkill') loop
      if jsonb_typeof(entry.value)<>'number' or entry.value::text !~ '^(0|[1-9][0-9]*)$'
        or not (policy->'questionCountBySkill' ? entry.key)
        or entry.value::text::numeric>(policy->'questionCountBySkill'->>entry.key)::numeric
      then raise exception 'assessment_policy_invalid'; end if;
    end loop;
  elsif policy ? 'minimumPercent' or policy ? 'minimumCorrectBySkill' then raise exception 'assessment_policy_invalid'; end if;
  if policy->>'schemaVersion'='haiedu-assessment-policy-v2' then
    perform private.validate_assessment_scope_v2(policy,(select jsonb_agg(distinct i.skill_id order by i.skill_id) from public.assessment_blueprint_items bi join public.items i on i.id=bi.item_id where bi.assessment_blueprint_id=b.id));
  end if;
  if coalesce(policy->>'learningModelConfigurationId','') !~ '^[0-9a-f-]{36}$'
    or coalesce(policy->>'academicMasteryPolicyId','') !~ '^[0-9a-f-]{36}$' then raise exception 'assessment_policy_invalid'; end if;
  select * into model from public.learning_model_configurations
    where id=(policy->>'learningModelConfigurationId')::uuid for share;
  if not found or model.configuration_kind not in ('baseline','approved')
    or model.reference_curriculum_release_id is distinct from r.id
    or jsonb_typeof(model.configuration->'assessmentPolicyContracts') is distinct from 'array'
    or not (model.configuration->'assessmentPolicyContracts' @> jsonb_build_array(policy))
  then raise exception 'assessment_policy_model_incompatible'; end if;
  select * into lifecycle from public.academic_mastery_policy_versions
    where id=(policy->>'academicMasteryPolicyId')::uuid for share;
  if not found or lifecycle.status<>'active' or lifecycle.effective_from>clock_timestamp()
    or (b.purpose='chapter_review' and lifecycle.target_review_question_count<>n)
  then raise exception 'assessment_policy_lifecycle_incompatible'; end if;
  select * into pool from public.assessment_pools where id=b.assessment_pool_id for update;
  if not found or pool.status<>'active' or pool.unit_code<>code
    or pool.purpose<>(case when b.purpose='chapter_review' then 'practice' else b.purpose end)
  then raise exception 'assessment_policy_pool_invalid'; end if;
  perform 1 from public.assessment_blueprint_items bi join public.items i on i.id=bi.item_id
    where bi.assessment_blueprint_id=b.id order by i.id for share of bi,i;
  perform 1 from public.curriculum_release_skills rs join public.items i on i.skill_id=rs.skill_id
    join public.assessment_blueprint_items bi on bi.item_id=i.id and bi.assessment_blueprint_id=b.id
    join public.item_curriculum_scopes sc on sc.item_id=i.id
    where rs.curriculum_release_id=r.id order by rs.skill_id,i.id,sc.id for share of rs,sc;
  perform 1 from public.assessment_pool_items where pool_id=pool.id order by item_id for share;
  if not exists (select 1 from public.assessment_blueprint_items where assessment_blueprint_id=b.id)
    or exists (select 1 from public.assessment_blueprint_items bi
      join public.items i on i.id=bi.item_id
      where bi.assessment_blueprint_id=b.id and
       (i.status<>'published' or i.version_no<>bi.item_version_snapshot
        or not (policy->'responseTypes' ? i.item_type::text)
        or not exists (select 1 from public.assessment_pool_items pi
          where pi.pool_id=pool.id and pi.item_id=i.id and pi.enabled)
        or not exists (select 1 from public.curriculum_release_skills rs
          join public.item_curriculum_scopes sc on sc.item_id=i.id and sc.is_primary
          where rs.curriculum_release_id=r.id and sc.unit_id=b.unit_id
            and sc.subject_program_id=r.subject_program_id and rs.skill_id=i.skill_id)))
  then raise exception 'assessment_policy_item_scope_invalid'; end if;
  if (select count(*) from public.assessment_blueprint_items where assessment_blueprint_id=b.id)<n then
    raise exception 'assessment_policy_coverage_insufficient'; end if;
  if b.purpose in ('diagnostic','mastery_check') then
    for entry in select * from jsonb_each_text(policy->'questionCountBySkill') loop
      if (select count(*) from public.assessment_blueprint_items bi join public.items i on i.id=bi.item_id
        where bi.assessment_blueprint_id=b.id and i.skill_id=entry.key::uuid)<entry.value::integer then
        raise exception 'assessment_policy_coverage_insufficient'; end if;
    end loop;
  end if;
  if b.purpose='diagnostic' and not exists (select 1 from public.assessment_forms f
    where f.pool_id=pool.id and f.status='active') then raise exception 'assessment_policy_forms_unavailable'; end if;
  if b.purpose='diagnostic' then
    for form in select f.id from public.assessment_forms f where f.pool_id=pool.id and f.status='active' order by f.id for update loop
      perform 1 from public.assessment_form_items where form_id=form.id order by item_id for share;
      if (select count(*) from public.assessment_form_items where form_id=form.id)<>n
        or exists (select 1 from public.assessment_form_items fi where fi.form_id=form.id
          and not exists (select 1 from public.assessment_blueprint_items bi where bi.assessment_blueprint_id=b.id and bi.item_id=fi.item_id))
      then raise exception 'assessment_policy_form_coverage_invalid'; end if;
      for entry in select * from jsonb_each_text(policy->'questionCountBySkill') loop
        if (select count(*) from public.assessment_form_items fi join public.items i on i.id=fi.item_id
          where fi.form_id=form.id and i.skill_id=entry.key::uuid)<>entry.value::integer then
          raise exception 'assessment_policy_form_coverage_invalid'; end if;
      end loop;
      if exists (select 1 from public.assessment_form_items fi join public.items i on i.id=fi.item_id
        where fi.form_id=form.id and not (policy->'questionCountBySkill' ? i.skill_id::text)) then
        raise exception 'assessment_policy_form_coverage_invalid'; end if;
    end loop;
  end if;
  return policy;
end;
$$;

create or replace function private.prepare_governed_lifecycle(p_student uuid,p_binding uuid)
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
   if attempt_no=1 and exists(select 1 from jsonb_array_elements_text(case when b.policy_snapshot->>'schemaVersion'='haiedu-assessment-policy-v2' then b.policy_snapshot->'readinessSkillIds' else b.skill_scope_snapshot end) skill
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
 select coalesce(jsonb_agg(jsonb_build_object('skillId',i.skill_id,'requiredForReadiness',case when policy->>'schemaVersion'='haiedu-assessment-policy-v2' then coalesce(policy->'readinessSkillIds' ? i.skill_id::text,false) else true end,'ready',private.governed_skill_ready(p_student_id,bp.curriculum_release_id,i.skill_id,(policy->>'learningModelConfigurationId')::uuid)) order by i.skill_id),'[]') into ready
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
  v_assessment_policy jsonb; v_reporting jsonb;
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
  select policy_snapshot into v_assessment_policy from public.assessment_policy_bindings where id=v_session.assessment_policy_binding_id;
  if v_assessment_policy->>'schemaVersion'='haiedu-assessment-policy-v2' then
    if v_session.answered_count<>(v_assessment_policy->>'plannedQuestionCount')::integer then raise exception 'mastery_session_not_completed'; end if;
    select private.assessment_result_v2(v_assessment_policy,jsonb_agg(jsonb_build_object('skillId',skill_id,'correct',correct,'total',total))) into v_reporting
      from (select skill_id,count(*) total,count(*) filter(where correct) correct from public.learning_session_items where session_id=p_session_id and answered_at is not null group by skill_id) q;
    v_expected_percent:=(v_reporting#>>'{score,percent}')::numeric;
    if p_passed is distinct from (v_reporting->>'passed')::boolean then raise exception 'mastery_result_mismatch'; end if;
    p_result_metadata:=coalesce(p_result_metadata,'{}')||jsonb_build_object('assessmentResultReporting',v_reporting);
  end if;
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

create or replace function public.service_governed_learning_operation(p_student_id uuid,p_auth_session_id uuid,p_session_id uuid,p_action text,p_payload jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.learning_sessions%rowtype; b public.assessment_policy_bindings%rowtype; li public.learning_session_items%rowtype;
 item public.items%rowtype; key public.item_answer_keys%rowtype; model jsonb; presentation jsonb; learner_options jsonb;
 actual text; canonical_actual text; expected text; is_correct boolean; error_code text; result jsonb; lifecycle jsonb; final_result jsonb; skill_results jsonb; reporting jsonb; passed boolean; percent numeric;
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
   return private.authorized_governed_result(p_student_id,p_auth_session_id,s.institutional_class_enrollment_id,s.curriculum_release_id,s.governed_unit_id,jsonb_build_object('complete',true,'session',to_jsonb(s),'assessmentResult',s.metadata->'assessmentResultReporting','summary',jsonb_build_object('answered',s.answered_count,'correct',s.correct_count,'planned',s.planned_item_count,'percent',round(100.0*s.correct_count/nullif(s.answered_count,0)))));
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
     if b.policy_snapshot->>'schemaVersion'='haiedu-assessment-policy-v2' then
       select private.assessment_result_v2(b.policy_snapshot,jsonb_agg(jsonb_build_object('skillId',skill_id,'correct',correct,'total',total))) into reporting from
         (select skill_id,count(*) total,count(*) filter(where correct) correct from public.learning_session_items where session_id=s.id and answered_at is not null group by skill_id) q;
       update public.learning_sessions set metadata=metadata||jsonb_build_object('assessmentResultReporting',reporting) where id=s.id returning * into s;
     end if;
     return private.authorized_governed_result(p_student_id,p_auth_session_id,s.institutional_class_enrollment_id,s.curriculum_release_id,s.governed_unit_id,jsonb_build_object('complete',true,'session',to_jsonb(s),'assessmentResult',s.metadata->'assessmentResultReporting','summary',jsonb_build_object('answered',s.answered_count,'correct',s.correct_count,'planned',s.planned_item_count,'percent',coalesce(round(100.0*s.correct_count/nullif(s.answered_count,0)),0),'reason',completion_reason)));
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
   if s.status='completed' and b.policy_snapshot->>'schemaVersion'='haiedu-assessment-policy-v2' then
     select jsonb_agg(jsonb_build_object('skillId',skill_id,'correct',correct,'total',total) order by skill_id) into skill_results from
       (select skill_id,count(*) total,count(*) filter(where correct) correct from public.learning_session_items where session_id=s.id and answered_at is not null group by skill_id) q;
     reporting:=private.assessment_result_v2(b.policy_snapshot,skill_results);
     update public.learning_sessions set metadata=coalesce(metadata,'{}')||jsonb_build_object('assessmentResultReporting',reporting) where id=s.id;
   end if;
   if s.status='completed' and s.mode='mastery_check' then
     select jsonb_agg(jsonb_build_object('skillId',q.skill_id,'correct',q.correct,'total',q.total) order by q.skill_id) into skill_results from
     (select skill_id,count(*) total,count(*) filter(where correct) correct from public.learning_session_items where session_id=s.id and answered_at is not null group by skill_id) q;
     percent:=round(100.0*s.correct_count/s.answered_count);
     passed:=percent>=(b.policy_snapshot->>'minimumPercent')::numeric and not exists(select 1 from jsonb_each_text(b.policy_snapshot->'minimumCorrectBySkill') minimum
       where (select count(*) from public.learning_session_items where session_id=s.id and skill_id=minimum.key::uuid and correct)<minimum.value::integer);
     if reporting is not null then passed:=(reporting->>'passed')::boolean; percent:=(reporting#>>'{score,percent}')::numeric; end if;
     lifecycle:=public.finalize_mastery_check_atomic(p_student_id,s.id,passed,percent,jsonb_build_object('passed',passed,'skillResults',skill_results,'failedSkillIds',
       (select coalesce(jsonb_agg(value->>'skillId'),'[]') from jsonb_array_elements(skill_results) where (value->>'correct')::integer<(value->>'total')::integer and (reporting is null or b.policy_snapshot->'scoredSkillIds' ? (value->>'skillId'))),'assessmentPolicyFingerprint',b.snapshot_fingerprint));
     final_result:=jsonb_build_object('passed',passed,'score',jsonb_build_object('correct',s.correct_count,'answered',s.answered_count,'percent',percent),'passCriteria',jsonb_build_object('overallPercent',b.policy_snapshot->'minimumPercent','minimumCorrectBySkill',b.policy_snapshot->'minimumCorrectBySkill'),'skillResults',skill_results,'lifecycle',lifecycle);
     if reporting is not null then final_result:=final_result||reporting; end if;
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

create or replace function public.service_student_learning_dashboard(p_student_id uuid,p_auth_session_id uuid,p_enrollment_id uuid,p_release_id uuid,p_unit_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare e public.institutional_class_enrollments%rowtype; u public.curriculum_release_units%rowtype;
 bp public.assessment_blueprints%rowtype; model public.learning_model_configurations%rowtype;
 state public.chapter_mastery_states%rowtype; life public.academic_mastery_policy_versions%rowtype;
 baseline public.learning_sessions%rowtype; active public.learning_sessions%rowtype;
 modes jsonb:='{}'; policy jsonb; spec jsonb; skills jsonb; history jsonb; skill_ids uuid[];
 extension text; selected_model uuid; legacy boolean; n integer; key text; hidden boolean; result jsonb;
begin
 e:=private.lock_student_learning_context(p_student_id,p_auth_session_id,p_enrollment_id,p_release_id,p_unit_id);
 select * into strict u from public.curriculum_release_units where curriculum_release_id=p_release_id and unit_id=p_unit_id;
 select * into state from public.chapter_mastery_states where student_id=p_student_id and curriculum_release_id=p_release_id and unit_code=u.unit_code_snapshot;
 select * into baseline from public.learning_sessions where id=private.scoped_chapter_baseline(p_student_id,p_release_id,p_unit_id);
 select * into active from public.learning_sessions s where s.student_id=p_student_id and s.curriculum_release_id=p_release_id and s.status='active'
 and ((s.institutional_class_enrollment_id=p_enrollment_id and s.governed_unit_id=p_unit_id and s.assessment_policy_binding_id is not null)
 or (s.assessment_policy_binding_id is null and exists(select 1 from public.legacy_learning_blueprint_mappings m
     where m.assessment_blueprint_id=s.assessment_blueprint_id and m.curriculum_release_id=s.curriculum_release_id
     and m.unit_id=p_unit_id and m.subject_program_id=e.subject_program_id and m.unit_code_snapshot=s.unit_code)))
 order by case when baseline.id is null and s.mode='diagnostic' then 0 else 1 end,s.started_at,s.id limit 1;
 -- An active assessment must not reveal running correctness through mastery rows.
 hidden:=active.id is not null and active.mode in ('diagnostic','mastery_check');
 select array_agg(distinct i.skill_id order by i.skill_id) into skill_ids from public.assessment_blueprints b
 join public.assessment_blueprint_items bi on bi.assessment_blueprint_id=b.id
 join public.items i on i.id=bi.item_id
 where b.curriculum_release_id=p_release_id and b.unit_id=p_unit_id and b.status in ('pilot','production');
 for key in select unnest(array['diagnostic','practice','mastery_check','chapter_review']) loop
   select * into bp from public.assessment_blueprints b where b.curriculum_release_id=p_release_id and b.unit_id=p_unit_id
     and b.purpose=key and b.status in ('pilot','production') and b.published_at is not null order by b.version_number desc,b.id limit 1;
   if bp.id is null then modes:=modes||jsonb_build_object(key,jsonb_build_object('status','unconfigured'));continue;end if;
   if (select count(*) from public.assessment_blueprints b where b.curriculum_release_id=p_release_id and b.unit_id=p_unit_id
     and b.purpose=key and b.status in ('pilot','production') and b.version_number=bp.version_number)<>1 then
     raise exception 'assessment_blueprint_unavailable';end if;
   select m.extension_key into extension from public.legacy_learning_blueprint_mappings m where m.assessment_blueprint_id=bp.id
     and m.curriculum_release_id=p_release_id and m.unit_id=p_unit_id and m.subject_program_id=e.subject_program_id;
   legacy:=extension is not null and not (bp.configuration_snapshot ? 'assessmentPolicy');
   if legacy then
     select lm.* into strict model from public.learning_model_runtime_bindings rb join public.learning_model_configurations lm
       on lm.id=rb.learning_model_configuration_id where rb.curriculum_release_id=p_release_id and rb.unit_code=u.unit_code_snapshot and rb.status='active';
     -- The registered legacy extension reads its immutable model; no new policy
     -- is synthesized or attached to old sessions. Counts preserve this adapter.
     n:=case key when 'diagnostic' then cardinality(skill_ids)*(model.configuration#>>'{diagnostic,itemsPerSkill}')::integer
       when 'mastery_check' then cardinality(skill_ids)*(model.configuration#>>'{masteryCheck,itemsPerSkill}')::integer
       when 'practice' then (model.configuration#>>'{practice,plannedSessionLength}')::integer
       else (bp.configuration_snapshot->>'targetQuestions')::integer end;
     if n is null or n<1 then raise exception 'legacy_navigation_contract_unavailable';end if;
     spec:=jsonb_build_object('status','registered_legacy','extensionKey',extension,'questions',n,
       'hintsAllowed',case when key in ('diagnostic','mastery_check') then false else true end,
       'minimumPercent',case when key='mastery_check' then model.configuration#>'{masteryCheck,overallPassPercent}' else null end,
       'minimumCorrectBySkill',case when key='mastery_check' then (select jsonb_object_agg(k::text,model.configuration#>'{masteryCheck,minimumCorrectPerSkill}') from unnest(skill_ids) k) else null end,
       'learningModelConfigurationId',model.id);
     if key='mastery_check' then selected_model:=model.id;end if;
   elsif bp.configuration_snapshot ? 'assessmentPolicy' then
     policy:=private.validate_assessment_policy_v1(bp.id);
     perform private.validate_governed_learning_model((policy->>'learningModelConfigurationId')::uuid);
     spec:=jsonb_build_object('status','configured','questions',policy->'plannedQuestionCount','hintsAllowed',policy->'hintsAllowed',
       'responseTypes',policy->'responseTypes','scoringStrategy',policy->'scoringStrategy','minimumPercent',policy->'minimumPercent',
       'schemaVersion',policy->'schemaVersion','deliveredSkillIds',policy->'deliveredSkillIds','scoredSkillIds',policy->'scoredSkillIds','readinessSkillIds',policy->'readinessSkillIds','reportingGroups',policy->'reportingGroups','questionCountBySkill',policy->'questionCountBySkill',
       'minimumCorrectBySkill',policy->'minimumCorrectBySkill','policyVersion',policy->'version',
       'learningModelConfigurationId',policy->'learningModelConfigurationId','academicMasteryPolicyId',policy->'academicMasteryPolicyId');
     if key='mastery_check' then selected_model:=(policy->>'learningModelConfigurationId')::uuid;end if;
   else spec:=jsonb_build_object('status','unconfigured');end if;
   modes:=modes||jsonb_build_object(key,spec||jsonb_build_object('blueprintId',bp.id,'blueprintVersion',bp.version_number));
 end loop;
 select * into life from public.academic_mastery_policy_versions where id=coalesce(state.academic_mastery_policy_id,
   (modes#>>'{mastery_check,academicMasteryPolicyId}')::uuid);
 if life.id is null and modes#>>'{mastery_check,status}'='registered_legacy' then
   select * into strict life from public.academic_mastery_policy_versions where status='active';
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',rs.skill_id,'code',rs.skill_code_snapshot,'nameHy',rs.name_hy_snapshot,
   'layer',rs.layer_snapshot,'sequenceOrder',rs.sequence_order_snapshot,
   'requiredForReadiness',case when modes#>>'{mastery_check,schemaVersion}'='haiedu-assessment-policy-v2' then modes#>'{mastery_check,readinessSkillIds}' ? rs.skill_id::text else true end,
   'ready',case when selected_model is null or hidden then null else private.governed_skill_ready(p_student_id,p_release_id,rs.skill_id,selected_model) end,
   'mastery',case when hidden or m.skill_id is null then null else jsonb_build_object('score',m.mastery_score,'percent',round(100*m.mastery_score),
     'evidenceCount',m.evidence_count,'status',m.status,'scope','learner_release_skill','modelId',selected_model) end) order by rs.sequence_order_snapshot,rs.skill_id),'[]') into skills
 from public.curriculum_release_skills rs left join public.student_skill_mastery_by_release m
   on m.student_id=p_student_id and m.curriculum_release_id=rs.curriculum_release_id and m.skill_id=rs.skill_id
 where rs.curriculum_release_id=p_release_id and rs.skill_id=any(skill_ids);
 select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'mode',s.mode,'status',s.status,'answered',s.answered_count,'planned',s.planned_item_count,
   'assessmentResult',s.metadata->'assessmentResultReporting','correct',s.correct_count,'percent',case when s.metadata ? 'assessmentResultReporting' then round(100.0*s.correct_count/nullif(s.answered_count,0)) else coalesce(s.score_percent,round(100.0*s.correct_count/nullif(s.answered_count,0))) end,
   'result',s.assessment_result,'attemptNumber',s.mastery_attempt_number,'completedAt',s.completed_at,
   'curriculumReleaseId',s.curriculum_release_id,'blueprintId',s.assessment_blueprint_id,'policyBindingId',s.assessment_policy_binding_id,
   'modelId',s.learning_model_configuration_id,'runtimeBuildId',s.runtime_build_id,'academicMasteryPolicyId',s.academic_mastery_policy_id,
   'provenanceStatus',s.provenance_status,'modelProvenanceStatus',s.model_provenance_status,'runtimeProvenanceStatus',s.runtime_provenance_status)
   order by s.completed_at desc,s.id),'[]') into history from
 (select s.* from public.learning_sessions s where s.student_id=p_student_id and s.curriculum_release_id=p_release_id and s.status='completed'
 and ((s.institutional_class_enrollment_id=p_enrollment_id and s.governed_unit_id=p_unit_id)
 or (s.assessment_policy_binding_id is null and exists(select 1 from public.legacy_learning_blueprint_mappings m
   where m.assessment_blueprint_id=s.assessment_blueprint_id and m.unit_id=p_unit_id and m.subject_program_id=e.subject_program_id and m.curriculum_release_id=s.curriculum_release_id)))
 order by s.completed_at desc,s.id limit 50) s;
 result:=jsonb_build_object('dashboardVersion','authorized-learning-dashboard-v1','modes',modes,'skills',skills,
   'practiceAccess',jsonb_build_object('unlocked',baseline.id is not null,'reason',case when baseline.id is null then 'chapter_diagnostic_required' end),
   'baseline',case when baseline.id is null then null else jsonb_build_object('id',baseline.id,'assessmentResult',baseline.metadata->'assessmentResultReporting','correct',baseline.correct_count,'answered',baseline.answered_count,
     'percent',round(100.0*baseline.correct_count/nullif(baseline.answered_count,0)),'completedAt',baseline.completed_at,
     'curriculumReleaseId',baseline.curriculum_release_id,'provenanceStatus',baseline.provenance_status,'policyBindingId',baseline.assessment_policy_binding_id) end,
   'activeSession',case when active.id is null then null else jsonb_build_object('id',active.id,'mode',active.mode,'answered',active.answered_count,
     'planned',active.planned_item_count,'policyBindingId',active.assessment_policy_binding_id,'targetSkillId',active.target_skill_id) end,
   'lifecycle',case when state.id is null then null else jsonb_build_object('state',state.lifecycle_state,'attemptsUsed',state.attempts_used,
     'passedOnAttempt',state.passed_on_attempt,'policyId',state.academic_mastery_policy_id,'historyProvenance',state.history_provenance) end,
   'maximumAttempts',life.maximum_mastery_attempts,'history',history,'readOnly',true);
 return private.authorized_governed_result(p_student_id,p_auth_session_id,p_enrollment_id,p_release_id,p_unit_id,result);
end;
$$;
