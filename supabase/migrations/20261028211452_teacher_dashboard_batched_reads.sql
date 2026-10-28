-- B.12.2: actor-scoped, request-local reads. No cross-request authorization cache.
-- SECURITY INVOKER and service-only: all identity/session arguments originate in
-- the JWT-verified Edge handler. Existing live-session validation retains its
-- privileged auth-schema implementation; these functions add no new definer.
create function public.service_teacher_dashboard_actor(p_actor uuid,p_session uuid)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
 if public.service_validate_active_session(p_actor,p_session) is distinct from true then
  raise exception 'account_or_session_inactive' using errcode='42501';end if;
 select jsonb_build_object('profile',jsonb_build_object('id',id,'role',role,'account_status',account_status,'display_name',display_name),
  'institutionalTeacher',exists(select 1 from public.institutional_memberships m where m.person_id=p_actor and m.role='teacher')) into result
 from public.profiles where id=p_actor and role='teacher' and account_status='active';
 if result is null then raise exception 'teacher_role_required' using errcode='42501';end if;
 return result;
end;$$;

create function public.service_teacher_dashboard_rows(p_actor uuid,p_session uuid,p_class uuid default null,p_assignment uuid default null)
returns jsonb language plpgsql stable security invoker set search_path='' set timezone='UTC' as $$
declare actor jsonb; result jsonb;
begin
 actor:=public.service_teacher_dashboard_actor(p_actor,p_session);
 if p_class is null and p_assignment is null then raise exception 'invalid_dashboard_request' using errcode='22023';end if;
 with members as materialized (
  select id,person_id,role,school_id,status,valid_from,valid_to from public.institutional_memberships
  where person_id=p_actor and role='teacher' and status='active' and valid_from<=now() and (valid_to is null or valid_to>now())
 ), grants as materialized (
  select g.id,g.school_id,g.teacher_membership_id,g.subject_id,g.status,g.valid_from,g.valid_to from public.teacher_subject_authorizations g
  join members m on m.id=g.teacher_membership_id and m.school_id=g.school_id
  where g.status='active' and g.valid_from<=now() and (g.valid_to is null or g.valid_to>now())
 ), programmes as materialized (
  select distinct p.id,p.subject_id,p.grade_id,p.status from public.subject_programs p join grants g on g.subject_id=p.subject_id
 ), assignments as materialized (
  select a.id,a.school_id,a.academic_year_id,a.class_id,a.teacher_membership_id,a.subject_program_id,a.status,a.valid_from,a.valid_to
  from public.teacher_assignments a join members m on m.id=a.teacher_membership_id and m.school_id=a.school_id
  join programmes p on p.id=a.subject_program_id
  where (p_class is null or a.class_id=p_class) and (p_assignment is null or a.id=p_assignment)
  and a.valid_from<=now() and (a.status='ended' or (a.status='active' and (a.valid_to is null or a.valid_to>now())))
 ), enrollments as materialized (
  select e.id,e.school_id,e.academic_year_id,e.class_id,e.student_id,e.student_membership_id,e.teacher_assignment_id,e.subject_program_id,e.status,e.valid_from,e.valid_to
  from public.institutional_class_enrollments e join assignments a on a.id=e.teacher_assignment_id and a.class_id=e.class_id
   and a.school_id=e.school_id and a.academic_year_id=e.academic_year_id and a.subject_program_id=e.subject_program_id
  where e.valid_from<=now() and (e.status='ended' or (e.status='active' and (e.valid_to is null or e.valid_to>now())))
 ), releases as materialized (
  select r.id,r.subject_program_id,r.status,r.release_number,r.effective_from,r.effective_to,r.activated_at,r.created_at
  from public.curriculum_releases r where r.subject_program_id in(select subject_program_id from assignments) and r.status in('pilot','production','retired')
 )
 select jsonb_build_object(
  'memberships',coalesce((select jsonb_agg(to_jsonb(x)) from (select * from members) x),'[]'::jsonb),
  'grants',coalesce((select jsonb_agg(to_jsonb(x)) from (select * from grants) x),'[]'::jsonb),
  'profile',actor->'profile',
  'years',coalesce((select jsonb_agg(to_jsonb(x)) from (select id,school_id,label,starts_on,ends_on,status from public.academic_years where school_id in(select school_id from members)) x),'[]'::jsonb),
  'schools',coalesce((select jsonb_agg(to_jsonb(x)) from (select id,name from public.schools where id in(select school_id from members)) x),'[]'::jsonb),
  'assignments',coalesce((select jsonb_agg(to_jsonb(x)) from (select * from assignments order by (status='active') desc,valid_from desc,id) x),'[]'::jsonb),
  'programmes',coalesce((select jsonb_agg(to_jsonb(x)) from (select * from programmes) x),'[]'::jsonb),
  'subjects',coalesce((select jsonb_agg(to_jsonb(x)) from (select id,code,name_hy,status from public.subjects where id in(select subject_id from programmes)) x),'[]'::jsonb),
  'classes',coalesce((select jsonb_agg(to_jsonb(x)) from (select id,school_id,academic_year_id,teacher_id,name,is_active,subject_id,grade_id from public.classes where id in(select class_id from assignments)) x),'[]'::jsonb),
  'enrollments',coalesce((select jsonb_agg(to_jsonb(x)) from (select * from enrollments) x),'[]'::jsonb),
  'studentMemberships',coalesce((select jsonb_agg(to_jsonb(x)) from (select id,person_id,school_id,role,status,valid_from,valid_to from public.institutional_memberships where id in(select student_membership_id from enrollments) and role='student') x),'[]'::jsonb),
  'studentProfiles',coalesce((select jsonb_agg(to_jsonb(x)) from (select id,display_name,account_status,role from public.profiles where id in(select student_id from enrollments) and role='student') x),'[]'::jsonb),
  'grades',coalesce((select jsonb_agg(to_jsonb(x)) from (select id,grade_number,label_hy from public.grades where id in(select grade_id from programmes)) x),'[]'::jsonb),
  'releases',coalesce((select jsonb_agg(to_jsonb(x)) from (select * from releases) x),'[]'::jsonb),
  'units',coalesce((select jsonb_agg(to_jsonb(x)) from (select id,subject_program_id,code,title_hy,sequence_order,status from public.units where subject_program_id in(select subject_program_id from assignments)) x),'[]'::jsonb),
  'releaseUnits',coalesce((select jsonb_agg(to_jsonb(x)) from (select curriculum_release_id,unit_id,unit_code_snapshot,title_hy_snapshot,sequence_order_snapshot from public.curriculum_release_units where curriculum_release_id in(select id from releases)) x),'[]'::jsonb)
 ) into result;
 return result || jsonb_build_object('institutionalTeacher',actor->'institutionalTeacher');
end;$$;

create function public.service_teacher_dashboard_evidence(p_actor uuid,p_session uuid,p_assignment uuid,p_release uuid,p_unit uuid)
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
  'versions',coalesce((select jsonb_agg(to_jsonb(x)) from (select distinct v.item_id,v.version_no,v.snapshot from public.item_versions v join items i on i.item_id=v.item_id and i.item_version_snapshot=v.version_no) x),'[]'::jsonb),
  'skillRows',coalesce((select jsonb_agg(to_jsonb(x)) from (select skill_id,skill_code_snapshot,name_hy_snapshot,layer_snapshot,sequence_order_snapshot from public.curriculum_release_skills where curriculum_release_id=p_release order by sequence_order_snapshot) x),'[]'::jsonb),
  'sessions',coalesce((select jsonb_agg(to_jsonb(x)) from (select * from sessions order by started_at desc,id) x),'[]'::jsonb),
  'attempts',coalesce((select jsonb_agg(to_jsonb(x)) from (select id,student_id,learning_session_id,item_id,skill_id,score,correct,hint_used,response_time_ms,error_code,created_at from public.attempts where learning_session_id in(select id from sessions) order by created_at,id) x),'[]'::jsonb),
  'reviewSessions',coalesce((select jsonb_agg(to_jsonb(x)) from (select id,learning_session_id,review_context,qualifying,status,review_cycle_number,review_session_number,target_question_count,eligible_pool_size,completed_at,created_at from public.chapter_review_sessions where learning_session_id in(select id from sessions) order by created_at,id) x),'[]'::jsonb),
  'models',coalesce((select jsonb_agg(to_jsonb(x)) from (select id,configuration from public.learning_model_configurations where id in(select learning_model_configuration_id from sessions)) x),'[]'::jsonb),
  'lifecyclePolicies',coalesce((select jsonb_agg(to_jsonb(x)) from (select id,maximum_mastery_attempts from public.academic_mastery_policy_versions where id in(select academic_mastery_policy_id from sessions)) x),'[]'::jsonb)
 ) into result;
 return result;
end;$$;
revoke all on function public.service_teacher_dashboard_actor(uuid,uuid) from public,anon,authenticated;
grant execute on function public.service_teacher_dashboard_actor(uuid,uuid) to service_role;
revoke all on function public.service_teacher_dashboard_rows(uuid,uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.service_teacher_dashboard_rows(uuid,uuid,uuid,uuid) to service_role;
revoke all on function public.service_teacher_dashboard_evidence(uuid,uuid,uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.service_teacher_dashboard_evidence(uuid,uuid,uuid,uuid,uuid) to service_role;

create function public.service_teacher_dashboard_directory(p_actor uuid,p_session uuid,p_archive boolean default false,p_offset integer default 0,p_search text default '')
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare actor jsonb;
begin
 actor:=public.service_teacher_dashboard_actor(p_actor,p_session);
 return public.service_teacher_class_directory(p_actor,p_archive,p_offset,p_search) || actor;
end;$$;
revoke all on function public.service_teacher_dashboard_directory(uuid,uuid,boolean,integer,text) from public,anon,authenticated;
grant execute on function public.service_teacher_dashboard_directory(uuid,uuid,boolean,integer,text) to service_role;
