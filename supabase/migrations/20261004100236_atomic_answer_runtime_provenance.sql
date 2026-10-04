-- Apply after the SQL transaction fix and submit-answer Edge rollout.
-- Append implementation provenance only; immutable learning criteria/history remain intact.
do $$
declare b public.learning_model_runtime_bindings%rowtype;
  previous public.runtime_builds%rowtype; next_id uuid; manifest jsonb; updated_count integer := 0;
begin
  for b in select * from public.learning_model_runtime_bindings where status='active' for update loop
    select * into strict previous from public.runtime_builds where id=b.runtime_build_id;
    if (previous.implementation_manifest#>>'{functions,submit-answer}')::integer <> 16 then
      raise exception 'answer_runtime_changed_since_rollout_review';
    end if;
    manifest := previous.implementation_manifest || jsonb_build_object(
      'functions', '{"submit-answer":17,"get-session-item":15,"get-teacher-student":10,"get-remediation-help":11,"get-student-dashboard":21,"get-teacher-dashboard":15,"submit-mastery-answer":6,"start-learning-session":22,"get-mastery-check-status":10,"record-recommendation-event":2,"get-chapter-mastery-lifecycle":2}'::jsonb,
      'answerScoring', jsonb_build_object('policyVersion','atomic-answer-evidence-v1',
        'sessionAndAssignmentTransactionLock',true,'learnerSkillTransactionLock',true,
        'serverOwnedHintEvidence',true,'committedResponseAndTelemetry',true,
        'legacyRpcCompatibility',true,'historicalEvidenceRebuilt',false,
        'sqlMigrationSourceBlob','77eca0be04ad46e53c57f6410db1ec8e0e9d743b'),
      'learningParametersChanged',false);
    insert into public.runtime_builds(build_key,source_commit,implementation_manifest,notes)
    values ('runtime-2026-10-04-atomic-answers-v1-'||b.id::text,
      'fe4aa4e1b4a674009ceac542e031b43e880d3d28',manifest,
      'Atomic accumulation of distinct answers; duplicate assignments add no evidence. Existing immutable learning-model configuration and historical evidence preserved.')
    returning id into next_id;
    update public.learning_model_runtime_bindings set runtime_build_id=next_id,
      notes='Atomic answer evidence v1; learning criteria, programme and release unchanged.',updated_at=now()
      where id=b.id and runtime_build_id=previous.id;
    if not found then raise exception 'answer_runtime_binding_update_failed'; end if;
    updated_count := updated_count + 1;
  end loop;
  if updated_count=0 then raise exception 'answer_runtime_binding_missing'; end if;
end;
$$;
