-- Sprint 16.1C.26: tolerate request-arrival jitter without granting extra plays.
-- Check media time against the current uninterrupted segment's server clock,
-- not the varying arrival interval between individual captured checkpoints.
-- Begin/resume anchors the exact saved position; pauses grant no playback credit.
-- Existing in-flight rows keep the old bound until their next normal begin.
alter table public.learning_assessed_audio
 add column playback_anchor_at timestamptz,
 add column playback_anchor_position_ms integer check(playback_anchor_position_ms between 0 and 600000),
 add constraint learning_assessed_audio_anchor_pair check((playback_anchor_at is null)=(playback_anchor_position_ms is null));

create or replace function public.service_assessed_audio(p_actor_id uuid,p_auth_session_id uuid,p_action text,p_session_id uuid,p_session_item_id uuid,p_payload jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.learning_sessions%rowtype; li public.learning_session_items%rowtype; i public.items%rowtype;
 a public.learning_audio_versions%rowtype; d public.learning_assessed_audio%rowtype; policy jsonb;
 stamp timestamptz:=clock_timestamp(); client uuid; play uuid; position integer; max_plays integer;
begin
 if not public.service_validate_active_session(p_actor_id,p_auth_session_id) then raise exception 'audio_access_denied'; end if;
 if p_action not in ('state','load','fetched','begin','progress','complete','pause','failed','unavailable','cancel')
 or jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'audio_request_invalid'; end if;
 s:=private.lock_governed_learning_session(p_actor_id,p_auth_session_id,p_session_id);
 if p_action='cancel' and s.status='abandoned' and s.metadata ? 'technicalInterruption' then return jsonb_build_object('endedUnscored',true,'sourceExposureRetained',true); end if;
 if s.status<>'active' or s.mode not in ('diagnostic','mastery_check') then raise exception 'audio_mode_unavailable'; end if;
 policy:=private.assessed_audio_policy(s.id);max_plays:=(policy->>'maximumPlays')::integer;
 select * into li from public.learning_session_items where id=p_session_item_id and session_id=s.id for update;
 if not found or li.answered_at is not null or li.ordinal<>s.answered_count+1
 or not exists(select 1 from public.student_item_exposure_events where session_item_id=li.id and student_id=p_actor_id)
 then raise exception 'audio_access_denied'; end if;
 select * into strict i from public.items where id=li.item_id for share;
 -- Cancellation retains evidence even if the approved media was withdrawn.
 -- Resolve only the originally assigned source; this branch cannot deliver bytes.
 if p_action in ('failed','cancel') then
  select av.* into a from public.learning_audio_versions av where av.source_family_id=li.source_family_id_snapshot
   and av.id=coalesce((select t.stimulus->>'audioVersionId' from public.learning_task_set_versions t where t.id=li.task_set_version_id),i.stimulus->>'audioVersionId')::uuid;
  if a.id is null then raise exception 'audio_access_denied'; end if;
 else
 perform private.validate_assigned_source(li.id,i.id);
 if i.status<>'published' or not exists(select 1 from public.assessment_blueprint_items bi join public.assessment_blueprints bp on bp.id=bi.assessment_blueprint_id
 join public.assessment_pool_items pi on pi.pool_id=bp.assessment_pool_id and pi.item_id=i.id join public.assessment_pools pool on pool.id=pi.pool_id
 where bi.assessment_blueprint_id=s.assessment_blueprint_id and bi.item_id=i.id and bi.item_version_snapshot=i.version_no and pi.enabled and pool.status='active')
 then raise exception 'audio_access_denied'; end if;
 a:=private.validate_audio_reference(private.task_set_stimulus(i.stimulus,i.id),i.id,s.curriculum_release_id,s.governed_unit_id);
 end if;
 if p_action='state' then
  if p_payload<>'{}'::jsonb then raise exception 'audio_request_invalid'; end if;
  return private.assessed_audio_state(s.id,a.id);
 end if;
 insert into public.learning_assessed_audio(session_id,audio_version_id,student_id) values(s.id,a.id,p_actor_id) on conflict do nothing;
 select * into strict d from public.learning_assessed_audio where session_id=s.id and audio_version_id=a.id and student_id=p_actor_id for update;
 stamp:=clock_timestamp();
 if p_action in ('begin','progress','complete','pause') then
  if (select count(*) from jsonb_object_keys(p_payload))<>3
  or coalesce(p_payload->>'clientId','') !~ '^[0-9a-f-]{36}$' or coalesce(p_payload->>'playId','') !~ '^[0-9a-f-]{36}$'
  or jsonb_typeof(p_payload->'positionMs') is distinct from 'number' or coalesce(p_payload->>'positionMs','') !~ '^(0|[1-9][0-9]{0,5})$'
  then raise exception 'audio_request_invalid'; end if;
  client:=(p_payload->>'clientId')::uuid;play:=(p_payload->>'playId')::uuid;position:=(p_payload->>'positionMs')::integer;
 elsif p_payload<>'{}'::jsonb then raise exception 'audio_request_invalid'; end if;
 if p_action='load' then
  if d.completed_plays>=max_plays then raise exception 'audio_play_limit_reached'; end if;
  return jsonb_build_object('audioVersionId',a.id,'bucketId',a.bucket_id,'objectPath',a.object_path,'sha256',a.sha256,'mimeType',a.mime_type,'byteLength',a.byte_length,'durationMs',a.duration_ms);
 elsif p_action='fetched' then
  update public.learning_assessed_audio set fetched_at=stamp,updated_at=stamp where session_id=s.id and audio_version_id=a.id;
 elsif p_action='begin' then
  if play=d.last_completed_play_id then return private.assessed_audio_state(s.id,a.id); end if;
  if d.completed_plays>=max_plays then raise exception 'audio_play_limit_reached'; end if;
  if d.fetched_at is null then raise exception 'audio_not_loaded'; end if;
  if d.client_id is distinct from client and d.lease_until>stamp then raise exception 'audio_playback_busy'; end if;
  if d.play_id is not null and d.play_id<>play then raise exception 'audio_playback_conflict'; end if;
  if position<>d.position_ms then raise exception 'audio_playback_conflict'; end if;
  update public.learning_assessed_audio set play_id=play,client_id=client,started_at=coalesce(started_at,stamp),playback_anchor_at=stamp,playback_anchor_position_ms=position,last_event_at=stamp,lease_until=stamp+interval '5 seconds',failed_at=null,failure_origin=null,updated_at=stamp where session_id=s.id and audio_version_id=a.id;
 elsif p_action in ('progress','complete','pause') then
  if p_action='complete' and play=d.last_completed_play_id then return private.assessed_audio_state(s.id,a.id); end if;
  if d.play_id is distinct from play or d.client_id is distinct from client or d.lease_until is null or d.lease_until<stamp then raise exception 'audio_playback_conflict'; end if;
  if position<d.position_ms or position>a.duration_ms or position-coalesce(d.playback_anchor_position_ms,d.position_ms)>extract(epoch from(stamp-coalesce(d.playback_anchor_at,d.last_event_at)))*1000+250
  then raise exception 'audio_progress_invalid'; end if;
  if p_action='complete' then
   if position<a.duration_ms-100 or d.completed_plays>=max_plays then raise exception 'audio_playback_incomplete'; end if;
   update public.learning_assessed_audio set completed_plays=completed_plays+1,last_completed_play_id=play,play_id=null,client_id=null,position_ms=0,started_at=null,playback_anchor_at=null,playback_anchor_position_ms=null,last_event_at=stamp,lease_until=null,completed_at=stamp,failed_at=null,failure_origin=null,updated_at=stamp where session_id=s.id and audio_version_id=a.id;
  else
   update public.learning_assessed_audio set position_ms=position,last_event_at=stamp,lease_until=case when p_action='pause' then null else stamp+interval '5 seconds' end,client_id=case when p_action='pause' then null else client_id end,updated_at=stamp where session_id=s.id and audio_version_id=a.id;
  end if;
 elsif p_action in ('failed','unavailable') then
  -- No completion or allowance is reset by a failed load/device report.
  update public.learning_assessed_audio set failed_at=stamp,failure_origin=case when p_action='unavailable' then 'server_media_failure' else 'client_reported' end,updated_at=stamp where session_id=s.id and audio_version_id=a.id;
 elsif p_action='cancel' then
  if d.failed_at is null then raise exception 'audio_interruption_required'; end if;
  update public.mastery_check_attempts set status='abandoned' where learning_session_id=s.id and status='active';
  update public.learning_sessions set status='abandoned',updated_at=stamp,metadata=metadata||jsonb_build_object('technicalInterruption',jsonb_build_object('schemaVersion','haiedu-audio-interruption-v1','audioVersionId',a.id,'origin',d.failure_origin,'at',stamp,'scoredAttemptCharged',false)) where id=s.id;
  return jsonb_build_object('endedUnscored',true,'sourceExposureRetained',true);
 end if;
 return private.assessed_audio_state(s.id,a.id);
end;
$$;

revoke all on function public.service_assessed_audio(uuid,uuid,text,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.service_assessed_audio(uuid,uuid,text,uuid,uuid,jsonb) to service_role;
