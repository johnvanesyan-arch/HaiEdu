-- Apply after reviewed PR/main checks and the corrected Edge bundle readback.
-- Append runtime provenance only; retain models, policies, releases and evidence.
do $$
declare b public.learning_model_runtime_bindings%rowtype; previous public.runtime_builds%rowtype;
 next_id uuid; manifest jsonb; updated_count integer:=0;
begin
 for b in select * from public.learning_model_runtime_bindings where status='active' for update loop
  select * into strict previous from public.runtime_builds where id=b.runtime_build_id;
  if previous.source_commit<>'f2d70652349f2d4bcf41cd789bf367dbcdf5cd57'
   or previous.implementation_manifest->'functions' is distinct from '{"submit-answer":18,"get-session-item":16,"get-student-classes":8,"get-teacher-student":14,"get-remediation-help":12,"get-student-dashboard":23,"get-teacher-dashboard":19,"submit-mastery-answer":7,"start-learning-session":23,"get-mastery-check-status":11,"record-recommendation-event":3,"get-teacher-academic-context":3,"get-chapter-mastery-lifecycle":3,"get-school-performance-analytics":2}'::jsonb then
   raise exception 'learning_runtime_changed_since_uuid_acceptance_review';
  end if;
  manifest:=previous.implementation_manifest || jsonb_build_object('functions','{"submit-answer":18,"get-session-item":16,"get-student-classes":8,"get-teacher-student":14,"get-remediation-help":12,"get-student-dashboard":24,"get-teacher-dashboard":19,"submit-mastery-answer":7,"start-learning-session":23,"get-mastery-check-status":11,"record-recommendation-event":3,"get-teacher-academic-context":3,"get-chapter-mastery-lifecycle":3,"get-school-performance-analytics":2}'::jsonb,
   'governedLearningAcceptance','{"stage":"isolated_acceptance_complete_live_gate_open","sourceCommit":"303446cb06d1dbcc631065f6fea9094c44657a0a","studentDashboardUuid":"standard-8-4-4-4-12","functions":{"submit-answer":18,"get-session-item":16,"get-student-classes":8,"get-teacher-student":14,"get-remediation-help":12,"get-student-dashboard":24,"get-teacher-dashboard":19,"submit-mastery-answer":7,"start-learning-session":23,"get-mastery-check-status":11,"record-recommendation-event":3,"get-teacher-academic-context":3,"get-chapter-mastery-lifecycle":3,"get-school-performance-analytics":2},"edgeFilesSha256":{"get-student-dashboard":{"get-student-dashboard/index.ts":"73fba3251eccf15b432cda4e2436fe01fbfa9069c5121b346295a7ea8454652d","_shared/auth.ts":"5595e91bfac44077715a4401b1243b68e221930ac09ca0e2cd08009d42e62dd0","_shared/course-access.ts":"11b120dd7be983314dc9e8c72ee11119024c39f0b2fae55345034b1865c3d3cc","_shared/curriculum-release.ts":"0872d80e13ee45b367fd188bf648bc28bfde74198764df39fed6dc2cc85aa031","_shared/learning-model.ts":"3e36ef2fa021f540cb803a46e0c42db6544c3ed16abc7db0ae0c4daef5d66c9c","_shared/recommendation-telemetry.ts":"13afe6f8d836e4a016796dbbe8be7e04fbec6e55109687d4792d0e1f3564124e","_shared/student-dashboard-handler.mjs":"6c6a8cb71a11bee135d5971bee96aba9886d192d282c06e824db4b7847c8dcaf","_shared/governed-learning-runtime.mjs":"2039d2b7f76d0ad383f5e5855dc3ca82f6578f8e9cdc706db1c2e814cd10f229","_shared/student-learning-context.mjs":"b509c63114250a3f0ab059a9cb172b7efd304204c905a9d645663dfd336d4576","_shared/assessment-policy.mjs":"d053c711f80cda7310d2c768320e677db62533f712bf71f246acbb3df947f5fe"}},"isolatedMatrix":{"subjects":2,"unitsPerSubject":2,"schools":2,"grades":[7,8]},"productionSecondReleaseActivated":false,"authenticatedGovernedSwitchingPassed":false,"learningParametersChanged":false}'::jsonb,'learningParametersChanged',false);
  insert into public.runtime_builds(build_key,source_commit,implementation_manifest,notes)
  values('runtime-2026-10-06-dashboard-uuid-v1-'||b.id::text,
   '303446cb06d1dbcc631065f6fea9094c44657a0a',manifest,
   'Connected isolated two-subject/two-unit acceptance and shared dashboard UUID correction. Live second-release acceptance remains open; existing criteria and evidence preserved.') returning id into next_id;
  update public.learning_model_runtime_bindings set runtime_build_id=next_id,
   notes='Governed dashboard standard UUID validation; learning criteria unchanged; live second-release gate open.',updated_at=now()
   where id=b.id and runtime_build_id=previous.id;
  if not found then raise exception 'dashboard_uuid_binding_update_failed'; end if;
  updated_count:=updated_count+1;
 end loop;
 if updated_count<>1 then raise exception 'dashboard_uuid_binding_inventory_changed'; end if;
end;
$$;
