-- Chapter I decision I-2, option A (plan revision 3, 20 November 2026), part 2.
-- Repository preparation for an isolated build and local staging only.
-- Applying this migration to production needs John's explicit approval.
--
-- Today's Home and Course pages read readiness from service_student_learning_dashboard.
-- For a registered legacy unit with an active rule in the legacy mastery rule registry
-- (20261120120000), the mastery spec names that rule and its readiness skills, and the
-- per-skill minimum applies only to the rule's scored skills. Every other unit, and a
-- legacy unit without a registry row, is unchanged.
begin;
-- Same body as
-- 20261021220954_sprint_16_1c_assessed_listening.sql, plus the registered legacy
-- unit's active rule (requiredForReadiness, per-skill minima, rule version).
create or replace function public.service_student_learning_dashboard(p_student_id uuid,p_auth_session_id uuid,p_enrollment_id uuid,p_release_id uuid,p_unit_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare e public.institutional_class_enrollments%rowtype; u public.curriculum_release_units%rowtype;
 bp public.assessment_blueprints%rowtype; model public.learning_model_configurations%rowtype;
 state public.chapter_mastery_states%rowtype; life public.academic_mastery_policy_versions%rowtype;
 baseline public.learning_sessions%rowtype; active public.learning_sessions%rowtype;
 modes jsonb:='{}'; policy jsonb; spec jsonb; skills jsonb; history jsonb; skill_ids uuid[];
 extension text; selected_model uuid; legacy boolean; n integer; key text; hidden boolean; result jsonb; legacy_rule jsonb;
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
     -- A registered legacy unit may carry a versioned pass/readiness rule (legacy
     -- mastery rule registry, 20261120). Its active version decides which skills open
     -- the check and which skills carry the per-skill minimum. Without one, unchanged.
     legacy_rule:=null;
     if key='mastery_check' then
       select v.criteria into legacy_rule from private.legacy_mastery_rule_activations a
         join private.legacy_mastery_rule_versions v on v.rule_version=a.rule_version
         where a.unit_code=u.unit_code_snapshot order by a.activation_sequence desc limit 1;
     end if;
     spec:=jsonb_build_object('status','registered_legacy','extensionKey',extension,'questions',n,
       'hintsAllowed',case when key in ('diagnostic','mastery_check') then false else true end,
       'minimumPercent',case when key='mastery_check' then model.configuration#>'{masteryCheck,overallPassPercent}' else null end,
       'minimumCorrectBySkill',case when key<>'mastery_check' then null
         when legacy_rule is not null then (select jsonb_object_agg(rs.skill_id::text,legacy_rule->'minimumCorrectPerScoredSkill')
           from public.curriculum_release_skills rs where rs.curriculum_release_id=p_release_id and rs.skill_id=any(skill_ids)
           and legacy_rule->'scoredSkillCodes' ? rs.skill_code_snapshot)
         else (select jsonb_object_agg(k::text,model.configuration#>'{masteryCheck,minimumCorrectPerSkill}') from unnest(skill_ids) k) end,
       'learningModelConfigurationId',model.id);
     if legacy_rule is not null then
       spec:=spec||jsonb_build_object('scoringRuleVersion',legacy_rule->'ruleVersion','readinessSkillIds',
         (select coalesce(jsonb_agg(rs.skill_id order by rs.sequence_order_snapshot,rs.skill_id),'[]') from public.curriculum_release_skills rs
           where rs.curriculum_release_id=p_release_id and rs.skill_id=any(skill_ids) and legacy_rule->'readinessSkillCodes' ? rs.skill_code_snapshot));
     end if;
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
   'requiredForReadiness',case when modes#>>'{mastery_check,schemaVersion}' in ('haiedu-assessment-policy-v2','haiedu-assessment-policy-v3','haiedu-assessment-policy-v4')
     or (modes#>>'{mastery_check,status}'='registered_legacy' and modes#>'{mastery_check}' ? 'readinessSkillIds')
     then modes#>'{mastery_check,readinessSkillIds}' ? rs.skill_id::text else true end,
   'ready',case when selected_model is null or hidden then null else private.governed_skill_ready(p_student_id,p_release_id,rs.skill_id,selected_model) end,
   'mastery',case when hidden or m.skill_id is null then null else jsonb_build_object('score',m.mastery_score,'percent',round(100*m.mastery_score),
     'evidenceCount',m.evidence_count,'status',m.status,'scope','learner_release_skill','modelId',selected_model) end) order by rs.sequence_order_snapshot,rs.skill_id),'[]') into skills
 from public.curriculum_release_skills rs left join public.student_skill_mastery_by_release m
   on m.student_id=p_student_id and m.curriculum_release_id=rs.curriculum_release_id and m.skill_id=rs.skill_id
 where rs.curriculum_release_id=p_release_id and rs.skill_id=any(skill_ids);
 select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'mode',s.mode,'status',s.status,'answered',s.answered_count,'planned',s.planned_item_count,
   'assessmentResult',s.metadata->'assessmentResultReporting','correct',s.correct_count,'percent',coalesce((s.metadata#>>'{assessmentResultReporting,score,percent}')::numeric,(s.metadata#>>'{assessmentResultReporting,overallScore,percent}')::numeric,s.score_percent,round(100.0*s.correct_count/nullif(s.answered_count,0))),
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
     'percent',coalesce((baseline.metadata#>>'{assessmentResultReporting,overallScore,percent}')::numeric,round(100.0*baseline.correct_count/nullif(baseline.answered_count,0))),'completedAt',baseline.completed_at,
     'curriculumReleaseId',baseline.curriculum_release_id,'provenanceStatus',baseline.provenance_status,'policyBindingId',baseline.assessment_policy_binding_id) end,
   'activeSession',case when active.id is null then null else jsonb_build_object('id',active.id,'mode',active.mode,'answered',active.answered_count,
     'planned',active.planned_item_count,'policyBindingId',active.assessment_policy_binding_id,'targetSkillId',active.target_skill_id) end,
   'lifecycle',case when state.id is null then null else jsonb_build_object('state',state.lifecycle_state,'attemptsUsed',state.attempts_used,
     'passedOnAttempt',state.passed_on_attempt,'policyId',state.academic_mastery_policy_id,'historyProvenance',state.history_provenance) end,
   'maximumAttempts',life.maximum_mastery_attempts,'history',history,'readOnly',true);
 return private.authorized_governed_result(p_student_id,p_auth_session_id,p_enrollment_id,p_release_id,p_unit_id,result);
end;
$$;

revoke all on function public.service_student_learning_dashboard(uuid,uuid,uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.service_student_learning_dashboard(uuid,uuid,uuid,uuid,uuid) to service_role;

commit;
