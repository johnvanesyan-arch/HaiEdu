-- Append provenance after the verified shared SQL deployment. No learner rows
-- or policy/model snapshots are rewritten. The already-started Diagnostic
-- keeps its original binding; the dated delivery evidence records continuation.
begin;
do $$
declare b public.learning_model_runtime_bindings%rowtype; previous public.runtime_builds%rowtype;
 next_id uuid; changed integer:=0; manifest jsonb;
begin
 if (select encode(digest(prosrc,'sha256'),'hex') from pg_proc where oid='public.service_assessed_audio(uuid,uuid,text,uuid,uuid,jsonb)'::regprocedure)
 <> '977cea189e777e43fc978adc8d7f7fd87ac29cc94b6b7bf6e7af8bf327a8afc0' then raise exception 'audio_progress_deployment_mismatch'; end if;
 for b in select rb.* from public.learning_model_runtime_bindings rb where rb.status='active'
  and exists(select 1 from public.assessment_policy_bindings p join public.units u on u.id=p.unit_id
   where p.curriculum_release_id=rb.curriculum_release_id and u.code=rb.unit_code and p.policy_snapshot->>'schemaVersion'='haiedu-assessment-policy-v4') for update loop
  select * into strict previous from public.runtime_builds where id=b.runtime_build_id;
  if b.id<>'1e484d77-1e46-5dc1-90a8-189f7e226256' or previous.id<>'aa242a25-08f9-503c-8c14-2eb5b1fb2926' then raise exception 'assessed_audio_binding_inventory_changed'; end if;
  manifest:=previous.implementation_manifest||jsonb_build_object('audioProgressTiming',jsonb_build_object(
   'schemaVersion','haiedu-assessed-audio-progress-v1','sourceCommit','af1bcf12f2156a7c5e30716e38714da8d9d8558e',
   'reviewedSourcePath','supabase/migrations/20261023064000_sprint_16_1c_audio_progress_jitter.sql',
   'appliedMigrationVersion','20261023064305','sqlSha256','ed36024216111a7d693a1f413d2a1f715f0a6556656e8986f45abdb88435377e',
   'functionBodySha256','977cea189e777e43fc978adc8d7f7fd87ac29cc94b6b7bf6e7af8bf327a8afc0',
   'previousRuntimeBuildId',previous.id,'progressBound','elapsed-current-segment','timingToleranceMs',250,'leaseSeconds',5,
   'allowanceChanged',false,'modelChanged',false,'edgeBundlesChanged',false));
  insert into public.runtime_builds(build_key,source_commit,implementation_manifest,notes)
  values('assessed-audio-progress-20261023-'||b.id::text,'af1bcf12f2156a7c5e30716e38714da8d9d8558e',manifest,
   'Shared assessed playback tolerates request-arrival jitter; saved positions, allowances and original learner history retained.') returning id into next_id;
  update public.learning_model_runtime_bindings set runtime_build_id=next_id,updated_at=now(),
   notes='C26 assessed-audio progress timing correction; numerical policy and learning model unchanged.' where id=b.id and runtime_build_id=previous.id;
  if not found then raise exception 'audio_progress_provenance_update_failed';end if;
  changed:=changed+1;
 end loop;
 if changed<>1 then raise exception 'assessed_audio_binding_inventory_changed';end if;
end;
$$;
select b.id as binding_id,b.runtime_build_id,r.source_commit,r.implementation_manifest->'audioProgressTiming' as timing
 from public.learning_model_runtime_bindings b join public.runtime_builds r on r.id=b.runtime_build_id
 where r.build_key like 'assessed-audio-progress-20261023-%';
-- Rehearse the exact file with this final COMMIT replaced by ROLLBACK.
commit;
