-- Read-only learner delivery of approved teaching-guide-v1 materials.
-- No content/approval writes, assessment evidence, policy or release activation.
create function private.student_unit_guides(p_student_id uuid,p_auth_session_id uuid,
 p_enrollment_id uuid,p_release_id uuid,p_unit_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare e public.institutional_class_enrollments%rowtype; m public.unit_material_versions%rowtype;
 code text; programme uuid; availability text:='available'; guides jsonb:='[]';
begin
 select ru.unit_code_snapshot,r.subject_program_id into code,programme
 from public.curriculum_release_units ru join public.curriculum_releases r on r.id=ru.curriculum_release_id
 where ru.curriculum_release_id=p_release_id and ru.unit_id=p_unit_id;
 if not found then raise exception 'learning_context_unavailable';end if;
 -- Same order as assessment starts, including the registered legacy adapter.
 -- This serializes a guide read with a concurrent start, across enrollments.
 perform pg_advisory_xact_lock(hashtextextended('initial-diagnostic:'||p_student_id::text||':'||code,0));
 perform pg_advisory_xact_lock(hashtextextended('governed-diagnostic:'||p_student_id::text||':'||programme::text||':'||p_unit_id::text,0));
 e:=private.lock_student_learning_context(p_student_id,p_auth_session_id,p_enrollment_id,p_release_id,p_unit_id);
 if exists(select 1 from public.learning_sessions s where s.student_id=p_student_id
  and s.status='active' and s.mode in ('diagnostic','mastery_check')
  and ((s.assessment_policy_binding_id is not null and s.subject_program_id=e.subject_program_id and s.governed_unit_id=p_unit_id)
   or (s.assessment_policy_binding_id is null and exists(select 1 from public.legacy_learning_blueprint_mappings lm
    where lm.assessment_blueprint_id=s.assessment_blueprint_id and lm.curriculum_release_id=s.curriculum_release_id
    and lm.subject_program_id=e.subject_program_id and lm.unit_id=p_unit_id and lm.unit_code_snapshot=s.unit_code))))
 then availability:='assessment_active';
 elsif private.scoped_chapter_baseline(p_student_id,p_release_id,p_unit_id) is null
 then availability:='diagnostic_required';
 else
  for m in select * from public.unit_material_versions v
   where v.subject_program_id=e.subject_program_id and v.curriculum_release_id=p_release_id and v.unit_id=p_unit_id
    and v.kind='guide' and v.status='approved' and v.reviewed_at is not null
    and v.definition->>'schemaVersion'='teaching-guide-v1'
    and v.qa->'passed'='true'::jsonb and v.qa->>'fingerprint'=v.fingerprint
   order by v.sequence_order,v.material_key,v.id for share
  loop
   -- Explicit public projection: never send review packages, source references,
   -- comparison notes, staff identities, writing models or arbitrary JSON keys.
   guides:=guides||jsonb_build_array(jsonb_build_object('id',m.id,'version',m.version_no,
    'sequenceOrder',m.sequence_order,'schemaVersion','teaching-guide-v1',
    'title',m.definition->>'title','text',m.definition->>'text',
    'workedExample',m.definition->>'workedExample','locale',m.definition->>'locale'));
  end loop;
 end if;
 -- Recheck wall-clock validity after material locks, including empty/blocked reads.
 perform private.lock_student_learning_context(p_student_id,p_auth_session_id,p_enrollment_id,p_release_id,p_unit_id);
 return jsonb_build_object('guidesVersion','unit-guides-v1','availability',availability,'guides',guides,'readOnly',true);
end;
$$;
create function public.service_student_unit_guides(p_student_id uuid,p_auth_session_id uuid,
 p_enrollment_id uuid,p_release_id uuid,p_unit_id uuid)
returns jsonb language sql set search_path='' as $$
 select private.student_unit_guides(p_student_id,p_auth_session_id,p_enrollment_id,p_release_id,p_unit_id);
$$;
revoke all on function private.student_unit_guides(uuid,uuid,uuid,uuid,uuid),public.service_student_unit_guides(uuid,uuid,uuid,uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function private.student_unit_guides(uuid,uuid,uuid,uuid,uuid),public.service_student_unit_guides(uuid,uuid,uuid,uuid,uuid) to service_role;
