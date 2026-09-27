-- Exact runtime provenance for the single initial diagnostic deployment.
do $$
declare v_previous public.runtime_builds%rowtype; v_manifest jsonb; v_id uuid;
begin
  select r.* into strict v_previous from public.learning_model_runtime_bindings b
    join public.runtime_builds r on r.id = b.runtime_build_id
    where b.status = 'active' and b.unit_code = 'PHY7-U01';
  if v_previous.build_key <> 'runtime-2026-09-23-r16' then
    raise exception 'runtime_binding_changed_since_release_check';
  end if;
  v_manifest := v_previous.implementation_manifest || '{"functions":{"submit-answer":15,"get-session-item":14,"get-teacher-student":10,"get-remediation-help":10,"get-student-dashboard":20,"get-teacher-dashboard":15,"submit-mastery-answer":5,"start-learning-session":21,"get-mastery-check-status":9,"record-recommendation-event":2,"get-chapter-mastery-lifecycle":2},"initialDiagnostic":{"policyVersion":"single-initial-diagnostic-v1","maximumCompletedAttempts":1,"scope":"student_chapter","formAssignment":"stable_student_chapter_hash","formsRetained":2,"questionsPerForm":20,"questionsPerSkill":2,"resumeStable":true,"completionIndependentOfScore":true},"learningParametersChanged":false}'::jsonb;
  insert into public.runtime_builds(build_key, source_commit, implementation_manifest, notes)
    values ('runtime-2026-09-27-initial-diagnostic-v1', 'ba043ad63fd6f1e28cafe014df12d62d7ff648c6', v_manifest,
      'One completed initial diagnostic per learner/chapter; stable existing A/B forms; baseline displays. Learning parameters and mastery/review policies unchanged.')
    returning id into v_id;
  update public.learning_model_runtime_bindings set runtime_build_id = v_id,
    notes = 'Single initial diagnostic v1. Existing academic scope and model configuration preserved.', updated_at = now()
    where status = 'active' and unit_code = 'PHY7-U01' and runtime_build_id = v_previous.id;
  if not found then raise exception 'runtime_binding_update_failed'; end if;
end;
$$;
