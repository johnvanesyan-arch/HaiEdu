-- Preserve frozen-version analytics while omitting unused private options, keys, hints and metadata from the Edge transfer.
create or replace function public.service_teacher_dashboard_evidence(p_actor uuid,p_session uuid,p_assignment uuid,p_release uuid,p_unit uuid)
returns jsonb language plpgsql stable security invoker set search_path='' set timezone='UTC' as $$
declare result jsonb;
begin
 perform public.service_teacher_dashboard_actor(p_actor,p_session);
 -- Authenticate the entire school/year/class/programme/release/unit tuple.
 -- Historic ended assignments remain read-only, matching the existing resolver.
 if not exists(select 1 from public.teacher_assignments a
  join public.institutional_memberships m on m.id=a.teacher_membership_id and m.person_id=p_actor and m.school_id=a.school_id and m.role='teacher'
  join public.classes c on c.id=a.class_id and c.school_id=a.school_id and c.academic_year_id=a.academic_year_id
  join public.academic_years y on y.id=a.academic_year_id and y.school_id=a.school_id
  join public.subject_programs p on p.id=a.subject_program_id and p.subject_id=c.subject_id and p.grade_id=c.grade_id
  join public.curriculum_releases r on r.id=p_release and r.subject_program_id=p.id
  join public.units u on u.id=p_unit and u.subject_program_id=p.id
  join public.curriculum_release_units ru on ru.curriculum_release_id=r.id and ru.unit_id=u.id
  where a.id=p_assignment and m.status='active' and m.valid_from<=now() and (m.valid_to is null or m.valid_to>now())
  and a.valid_from<=now() and (a.status='ended' or (a.status='active' and (a.valid_to is null or a.valid_to>now())))
  and y.status in('active','closed','archived') and a.valid_from::date<=y.ends_on and (a.valid_to is null or a.valid_to::date>=y.starts_on)
  and p.status='published' and r.status in('pilot','production','retired') and (r.effective_from is null or r.effective_from<=current_date)
  and ru.unit_code_snapshot is not null and ru.unit_code_snapshot<>'' and ru.title_hy_snapshot is not null and ru.title_hy_snapshot<>'' and ru.sequence_order_snapshot is not null
  and (select count(*) from public.teacher_subject_authorizations g where g.teacher_membership_id=m.id and g.school_id=a.school_id and g.subject_id=p.subject_id
    and g.status='active' and g.valid_from<=now() and (g.valid_to is null or g.valid_to>now()))=1)
 then raise exception 'academic_context_unavailable' using errcode='42501';end if;
 with blueprints as materialized(select id from public.assessment_blueprints where curriculum_release_id=p_release and unit_id=p_unit),
 items as materialized(select assessment_blueprint_id,item_id,item_version_snapshot from public.assessment_blueprint_items where assessment_blueprint_id in(select id from blueprints)),
 roster as materialized(
  select e.id,e.student_id from public.institutional_class_enrollments e
  join public.teacher_assignments a on a.id=p_assignment and e.teacher_assignment_id=a.id and e.school_id=a.school_id and e.academic_year_id=a.academic_year_id and e.class_id=a.class_id and e.subject_program_id=a.subject_program_id
  join public.profiles p on p.id=e.student_id and p.role='student' and p.account_status='active'
  join public.institutional_memberships m on m.id=e.student_membership_id and m.person_id=e.student_id and m.school_id=e.school_id and m.role='student'
  where e.valid_from<=now() and m.valid_from<=now() and e.status in('active','ended') and m.status in('active','ended')
 ), sessions as materialized(
  select s.id,s.student_id,s.unit_code,s.mode,s.status,s.target_skill_id,s.planned_item_count,s.answered_count,s.correct_count,s.assessment_result,s.score_percent,s.metadata,s.mastery_attempt_number,s.started_at,s.completed_at,s.institutional_class_enrollment_id,s.school_id,s.academic_year_id,s.class_id,s.teacher_assignment_id,s.subject_program_id,s.curriculum_release_id,s.academic_context_status,s.governed_unit_id,s.assessment_blueprint_id,s.assessment_policy_binding_id,s.learning_model_configuration_id,s.academic_mastery_policy_id,s.runtime_build_id,s.provenance_status,s.model_provenance_status,s.runtime_provenance_status
  from public.learning_sessions s join public.teacher_assignments a on a.id=p_assignment
  join roster e on e.id=s.institutional_class_enrollment_id and e.student_id=s.student_id
  join public.curriculum_release_units ru on ru.curriculum_release_id=p_release and ru.unit_id=p_unit
  where s.academic_context_status='exact' and s.school_id=a.school_id and s.academic_year_id=a.academic_year_id and s.class_id=a.class_id
  and s.teacher_assignment_id=a.id and s.subject_program_id=a.subject_program_id and s.curriculum_release_id=p_release and s.unit_code=ru.unit_code_snapshot
  and (s.governed_unit_id=p_unit or(s.governed_unit_id is null and s.assessment_blueprint_id in(select id from blueprints)))
 )
 select jsonb_build_object(
  'blueprintRows',coalesce((select jsonb_agg(to_jsonb(x)) from (select * from blueprints) x),'[]'::jsonb),
  'blueprintItems',coalesce((select jsonb_agg(to_jsonb(x)) from (select * from items) x),'[]'::jsonb),
  'versions',coalesce((select jsonb_agg(to_jsonb(x)) from (select distinct v.item_id,v.version_no,jsonb_build_object('item',jsonb_build_object('skill_id',v.snapshot->'item'->'skill_id','difficulty',v.snapshot->'item'->'difficulty','code',v.snapshot->'item'->'code','prompt_hy',v.snapshot->'item'->'prompt_hy')) as snapshot from public.item_versions v join items i on i.item_id=v.item_id and i.item_version_snapshot=v.version_no) x),'[]'::jsonb),
  'skillRows',coalesce((select jsonb_agg(to_jsonb(x)) from (select skill_id,skill_code_snapshot,name_hy_snapshot,layer_snapshot,sequence_order_snapshot from public.curriculum_release_skills where curriculum_release_id=p_release order by sequence_order_snapshot) x),'[]'::jsonb),
  'sessions',coalesce((select jsonb_agg(to_jsonb(x)) from (select * from sessions order by started_at desc,id) x),'[]'::jsonb),
  'attempts',coalesce((select jsonb_agg(to_jsonb(x)) from (select id,student_id,learning_session_id,item_id,skill_id,score,correct,hint_used,response_time_ms,error_code,created_at from public.attempts where learning_session_id in(select id from sessions) order by created_at,id) x),'[]'::jsonb),
  'reviewSessions',coalesce((select jsonb_agg(to_jsonb(x)) from (select id,learning_session_id,review_context,qualifying,status,review_cycle_number,review_session_number,target_question_count,eligible_pool_size,completed_at,created_at from public.chapter_review_sessions where learning_session_id in(select id from sessions) order by created_at,id) x),'[]'::jsonb),
  'models',coalesce((select jsonb_agg(to_jsonb(x)) from (select id,configuration from public.learning_model_configurations where id in(select learning_model_configuration_id from sessions)) x),'[]'::jsonb),
  'lifecyclePolicies',coalesce((select jsonb_agg(to_jsonb(x)) from (select id,maximum_mastery_attempts from public.academic_mastery_policy_versions where id in(select academic_mastery_policy_id from sessions)) x),'[]'::jsonb)
 ) into result;
 return result;
end;$$;
