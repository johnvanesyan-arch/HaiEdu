-- Read-only investigation export; production execution requires owner authorization.
-- Contains IDs and learning metadata, not names, email, answers or question text.
-- Export the single JSON result privately; do not commit actual learner data.
-- Zero rows means the supplied identity/context did not identify one enrollment.
with targets as (
 select e.id as enrollment_id,e.student_id,e.school_id,e.academic_year_id,e.class_id,
   e.teacher_assignment_id,e.subject_program_id,ru.curriculum_release_id,ru.unit_id,ru.unit_code_snapshot
 from public.institutional_class_enrollments e
 join public.curriculum_releases r on r.subject_program_id=e.subject_program_id
 join public.curriculum_release_units ru on ru.curriculum_release_id=r.id
 where e.student_id::text like 'bc3db497%'
   and e.class_id='6f8002d4-e375-4490-91d1-ac8111c316de'::uuid
   and r.id='80bbe575-ad49-4a7f-881a-e55726b1eaeb'::uuid
   and ru.unit_id='0349ffcd-8fc9-47f2-82d1-3d5cfcb3a096'::uuid
), chosen as (select * from targets where (select count(*) from targets)=1),
blueprints as (
 select b.id from public.assessment_blueprints b join chosen c
   on b.curriculum_release_id=c.curriculum_release_id and b.unit_id=c.unit_id
), members as (
 select bi.assessment_blueprint_id,bi.item_id,bi.item_version_snapshot
 from public.assessment_blueprint_items bi join blueprints b on b.id=bi.assessment_blueprint_id
), sessions as (
 select s.id,s.student_id,s.institutional_class_enrollment_id,s.school_id,s.academic_year_id,s.class_id,
   s.teacher_assignment_id,s.subject_program_id,s.curriculum_release_id,s.governed_unit_id,s.unit_code,
   s.academic_context_status,s.assessment_blueprint_id,s.mode,s.status,s.started_at,s.completed_at,
   s.assessment_policy_binding_id,s.learning_model_configuration_id,s.academic_mastery_policy_id,
   s.runtime_build_id,s.provenance_status,s.model_provenance_status,s.runtime_provenance_status
 from public.learning_sessions s join chosen c on s.student_id=c.student_id
   and s.curriculum_release_id=c.curriculum_release_id
), attempts as (
 select a.id,a.student_id,a.learning_session_id,a.item_id,a.skill_id
 from public.attempts a join chosen c on a.student_id=c.student_id
   and a.curriculum_release_id=c.curriculum_release_id
), versions as (
 select v.item_id,v.version_no,jsonb_build_object('item',jsonb_build_object(
   'skill_id',v.snapshot#>'{item,skill_id}','difficulty',v.snapshot#>'{item,difficulty}')) as snapshot
 from public.item_versions v where (v.item_id,v.version_no) in (select item_id,item_version_snapshot from members)
)
select jsonb_build_object(
 'context',jsonb_build_object('schoolId',c.school_id,'academicYearId',c.academic_year_id,
   'classId',c.class_id,'assignmentId',c.teacher_assignment_id,'subjectProgramId',c.subject_program_id,
   'curriculumReleaseId',c.curriculum_release_id,'unitId',c.unit_id,'unitCode',c.unit_code_snapshot),
 'student',jsonb_build_object('id',c.student_id,'enrollmentId',c.enrollment_id),
 'blueprintRows',coalesce((select jsonb_agg(to_jsonb(b)) from blueprints b),'[]'::jsonb),
 'blueprintItems',coalesce((select jsonb_agg(to_jsonb(b)) from members b),'[]'::jsonb),
 'versions',coalesce((select jsonb_agg(to_jsonb(v)) from versions v),'[]'::jsonb),
 'sessions',coalesce((select jsonb_agg(to_jsonb(s)) from sessions s),'[]'::jsonb),
 'attempts',coalesce((select jsonb_agg(to_jsonb(a)) from attempts a),'[]'::jsonb)
) as evidence_export from chosen c;
