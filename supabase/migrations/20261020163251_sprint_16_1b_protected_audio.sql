-- 16.1B.4: inert, opt-in protected audio for replayable practice/review.
-- No media, content approvals, blueprint or release is activated here.
create table public.learning_audio_versions (
 id uuid primary key default gen_random_uuid(),
 curriculum_release_id uuid not null references public.curriculum_releases(id),
 unit_id uuid not null references public.units(id),
 source_family_id uuid not null,
 locale text not null check (locale ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$'),
 title text not null check (length(btrim(title)) between 1 and 200),
 bucket_id text not null check (bucket_id ~ '^[a-z0-9][a-z0-9-]{0,62}$'),
 object_path text not null,
 sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
 mime_type text not null check (mime_type in ('audio/mpeg','audio/wav')),
 byte_length integer not null check (byte_length between 1 and 8388608),
 duration_ms integer not null check (duration_ms between 100 and 600000),
 source_reference text not null check (length(btrim(source_reference)) > 0),
 permission_reference text not null check (length(btrim(permission_reference)) > 0),
 listening_review_reference text not null check (length(btrim(listening_review_reference)) > 0),
 reviewed_by uuid references public.profiles(id) on delete set null,
 reviewed_at timestamptz not null,
 created_at timestamptz not null default now(),
 revoked_at timestamptz,
 revocation_reason text,
 check (object_path = sha256 || case mime_type when 'audio/mpeg' then '.mp3' else '.wav' end),
 check ((revoked_at is null and revocation_reason is null) or (revoked_at is not null and length(btrim(revocation_reason)) > 0)),
 unique (bucket_id,object_path,curriculum_release_id,unit_id)
);
create index learning_audio_versions_scope on public.learning_audio_versions(curriculum_release_id,unit_id);
create index learning_audio_versions_reviewer on public.learning_audio_versions(reviewed_by);
create table public.learning_audio_deliveries (
 session_item_id uuid primary key references public.learning_session_items(id) on delete cascade,
 student_id uuid not null references public.profiles(id) on delete cascade,
 audio_version_id uuid not null references public.learning_audio_versions(id),
 authorized_at timestamptz not null default now(),
 fetched_at timestamptz,
 started_at timestamptz,
 completed_at timestamptz,
 failed_at timestamptz,
 updated_at timestamptz not null default now()
);
create index learning_audio_deliveries_student on public.learning_audio_deliveries(student_id,audio_version_id);
create index learning_audio_deliveries_version on public.learning_audio_deliveries(audio_version_id);
alter table public.learning_audio_versions enable row level security;
alter table public.learning_audio_deliveries enable row level security;
revoke all on public.learning_audio_versions,public.learning_audio_deliveries from public,anon,authenticated;
grant select,insert on public.learning_audio_versions to service_role;
grant update(revoked_at,revocation_reason) on public.learning_audio_versions to service_role;
grant select,insert,update on public.learning_audio_deliveries to service_role;

create function private.guard_audio_version() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='INSERT' and (new.reviewed_by is null or not exists(select 1 from public.profiles where id=new.reviewed_by and role::text in ('admin','content_admin') and account_status='active')) then raise exception 'audio_review_required'; end if;
 if tg_op='UPDATE' then
  if (to_jsonb(new)-array['revoked_at','revocation_reason','reviewed_by']) is distinct from (to_jsonb(old)-array['revoked_at','revocation_reason','reviewed_by'])
    or (new.reviewed_by is distinct from old.reviewed_by and new.reviewed_by is not null)
    or (old.revoked_at is not null and (new.revoked_at is distinct from old.revoked_at or new.revocation_reason is distinct from old.revocation_reason))
  then raise exception 'audio_version_immutable'; end if;
 end if;
 if not exists(select 1 from public.curriculum_release_units where curriculum_release_id=new.curriculum_release_id and unit_id=new.unit_id)
 then raise exception 'audio_scope_invalid'; end if;
 return new;
end;
$$;
create trigger learning_audio_version_immutable before insert or update on public.learning_audio_versions for each row execute function private.guard_audio_version();

create function private.validate_audio_reference(p_stimulus jsonb,p_item_id uuid,p_release_id uuid default null,p_unit_id uuid default null)
returns public.learning_audio_versions language plpgsql set search_path='' as $$
declare a public.learning_audio_versions%rowtype;
begin
 if jsonb_typeof(p_stimulus) is distinct from 'object' or p_stimulus->>'kind' is distinct from 'audio'
 or p_stimulus->>'schemaVersion' is distinct from 'haiedu-audio-v1'
 or (select count(*) from jsonb_object_keys(p_stimulus))<>3
 or coalesce(p_stimulus->>'audioVersionId','') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
 then raise exception 'audio_reference_invalid'; end if;
 select * into a from public.learning_audio_versions where id=(p_stimulus->>'audioVersionId')::uuid for share;
 if not found or a.revoked_at is not null then raise exception 'audio_unavailable'; end if;
 if (p_release_id is not null and a.curriculum_release_id<>p_release_id) or (p_unit_id is not null and a.unit_id<>p_unit_id)
 or not exists(select 1 from public.item_curriculum_scopes sc join public.curriculum_releases r on r.subject_program_id=sc.subject_program_id
   join public.curriculum_release_skills rs on rs.curriculum_release_id=r.id join public.items i on i.id=sc.item_id and i.skill_id=rs.skill_id
   where sc.item_id=p_item_id and sc.is_primary and r.id=a.curriculum_release_id and sc.unit_id=a.unit_id)
 then raise exception 'audio_scope_invalid'; end if;
 return a;
end;
$$;
create function private.guard_item_audio_reference() returns trigger language plpgsql set search_path='' as $$
begin
 if new.stimulus->>'kind'='audio' then perform private.validate_audio_reference(new.stimulus,new.id); end if;
 return new;
end;
$$;
create trigger item_audio_reference before insert or update of stimulus,status on public.items for each row execute function private.guard_item_audio_reference();

-- Enforce the capability boundary even through historical sessionless graders.
create function private.guard_audio_attempt() returns trigger language plpgsql set search_path='' as $$
begin
 if exists(select 1 from public.items where id=new.item_id and stimulus->>'kind'='audio') and not exists(
   select 1 from public.learning_sessions s join public.learning_session_items li on li.session_id=s.id
   join public.learning_audio_deliveries d on d.session_item_id=li.id and d.student_id=s.student_id
   join public.items i on i.id=li.item_id join public.learning_audio_versions av on av.id=d.audio_version_id
   where s.id=new.learning_session_id and li.id=new.learning_session_item_id and s.student_id=new.student_id and li.item_id=new.item_id
    and s.assessment_policy_binding_id is not null and s.mode in ('practice','chapter_review') and s.status='active'
    and li.answered_at is null and d.completed_at is not null and d.failed_at is null and av.revoked_at is null
    and i.stimulus->>'audioVersionId'=av.id::text and s.curriculum_release_id=av.curriculum_release_id and s.governed_unit_id=av.unit_id)
 then raise exception 'audio_playback_incomplete'; end if;
 return new;
end;
$$;
create trigger audio_attempt_guard before insert on public.attempts for each row execute function private.guard_audio_attempt();
revoke all on function private.guard_audio_attempt() from public,anon,authenticated;

create function public.service_learning_audio(p_actor_id uuid,p_auth_session_id uuid,p_action text,p_session_id uuid default null,p_session_item_id uuid default null,p_item_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.learning_sessions%rowtype; li public.learning_session_items%rowtype; i public.items%rowtype;
 a public.learning_audio_versions%rowtype; d public.learning_audio_deliveries%rowtype; stamp timestamptz:=clock_timestamp();
begin
 if not public.service_validate_active_session(p_actor_id,p_auth_session_id) then raise exception 'audio_access_denied'; end if;
 if p_action in ('preview','catalog') then
  if p_session_id is not null or p_session_item_id is not null or not exists(select 1 from public.profiles where id=p_actor_id and role::text in ('admin','content_admin')) then raise exception 'audio_access_denied'; end if;
  select * into strict i from public.items where id=p_item_id for share;
  if p_action='catalog' then
   return jsonb_build_object('versions',(select coalesce(jsonb_agg(jsonb_build_object('id',v.id,'title',v.title,'locale',v.locale,'durationMs',v.duration_ms) order by v.title,v.id),'[]') from
    (select av.* from public.learning_audio_versions av where av.revoked_at is null and exists(
     select 1 from public.item_curriculum_scopes sc join public.curriculum_releases r on r.subject_program_id=sc.subject_program_id
      join public.curriculum_release_skills rs on rs.curriculum_release_id=r.id and rs.skill_id=i.skill_id
     where sc.item_id=i.id and sc.is_primary and sc.unit_id=av.unit_id and r.id=av.curriculum_release_id) order by av.title,av.id limit 100) v));
  end if;
  a:=private.validate_audio_reference(i.stimulus,i.id);
 else
  if p_action not in ('load','fetched','started','completed','failed') or p_item_id is not null then raise exception 'audio_request_invalid'; end if;
  s:=private.lock_governed_learning_session(p_actor_id,p_auth_session_id,p_session_id);
  if s.status<>'active' or s.mode not in ('practice','chapter_review') then raise exception 'audio_mode_unavailable'; end if;
  select * into li from public.learning_session_items where id=p_session_item_id and session_id=s.id for update;
  if not found or li.answered_at is not null or li.ordinal<>s.answered_count+1
   or not exists(select 1 from public.student_item_exposure_events where session_item_id=li.id and student_id=p_actor_id)
  then raise exception 'audio_access_denied'; end if;
  select * into strict i from public.items where id=li.item_id for share;
  if i.status<>'published' or not exists(select 1 from public.assessment_blueprint_items bi join public.assessment_blueprints bp on bp.id=bi.assessment_blueprint_id
   join public.assessment_pool_items pi on pi.pool_id=bp.assessment_pool_id and pi.item_id=i.id join public.assessment_pools pool on pool.id=pi.pool_id
   where bi.assessment_blueprint_id=s.assessment_blueprint_id and bi.item_id=i.id and bi.item_version_snapshot=i.version_no and pi.enabled and pool.status='active')
  then raise exception 'audio_access_denied'; end if;
  a:=private.validate_audio_reference(i.stimulus,i.id,s.curriculum_release_id,s.governed_unit_id);
  if p_action='load' then
   insert into public.learning_audio_deliveries(session_item_id,student_id,audio_version_id) values(li.id,p_actor_id,a.id)
    on conflict(session_item_id) do nothing;
  end if;
  select * into d from public.learning_audio_deliveries where session_item_id=li.id and student_id=p_actor_id and audio_version_id=a.id for update;
  if not found then raise exception 'audio_not_loaded'; end if;
  if p_action='fetched' then
   update public.learning_audio_deliveries set fetched_at=stamp,failed_at=null,updated_at=stamp where session_item_id=li.id;
  elsif p_action='started' then
   if d.fetched_at is null or d.failed_at is not null then raise exception 'audio_not_loaded'; end if;
   update public.learning_audio_deliveries set started_at=coalesce(started_at,stamp),updated_at=stamp where session_item_id=li.id;
  elsif p_action='completed' then
   if d.fetched_at is null or d.started_at is null or d.failed_at is not null or stamp-d.started_at < (a.duration_ms-100)::double precision*interval '1 millisecond' then raise exception 'audio_playback_incomplete'; end if;
   update public.learning_audio_deliveries set completed_at=coalesce(completed_at,stamp),updated_at=stamp where session_item_id=li.id;
  elsif p_action='failed' then
   update public.learning_audio_deliveries set failed_at=stamp,completed_at=null,started_at=null,updated_at=stamp where session_item_id=li.id;
  end if;
 end if;
 if p_action in ('load','preview') then
  return jsonb_build_object('audioVersionId',a.id,'bucketId',a.bucket_id,'objectPath',a.object_path,'sha256',a.sha256,'mimeType',a.mime_type,'byteLength',a.byte_length,'durationMs',a.duration_ms);
 end if;
 return jsonb_build_object('recorded',true,'action',p_action);
end;
$$;
revoke all on function private.guard_audio_version(),private.guard_item_audio_reference(),private.validate_audio_reference(jsonb,uuid,uuid,uuid),public.service_learning_audio(uuid,uuid,text,uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.service_learning_audio(uuid,uuid,text,uuid,uuid,uuid) to service_role;


create or replace function private.validate_assessment_policy_v1(p_blueprint_id uuid)
returns jsonb language plpgsql set search_path='' as $$
declare
  b public.assessment_blueprints%rowtype; r public.curriculum_releases%rowtype;
  pool public.assessment_pools%rowtype; model public.learning_model_configurations%rowtype;
  lifecycle public.academic_mastery_policy_versions%rowtype;
  policy jsonb; entry record; form record; total numeric; n integer; code text;
begin
  select * into b from public.assessment_blueprints where id=p_blueprint_id for share;
  if not found or b.status not in ('pilot','production') then
    raise exception 'assessment_policy_unavailable'; end if;
  select * into r from public.curriculum_releases where id=b.curriculum_release_id for share;
  if not found or r.status<>b.status then raise exception 'assessment_policy_unavailable'; end if;
  select unit_code_snapshot into code from public.curriculum_release_units
    where curriculum_release_id=r.id and unit_id=b.unit_id for share;
  if not found then raise exception 'assessment_policy_invalid'; end if;
  policy:=b.configuration_snapshot->'assessmentPolicy';
  if jsonb_typeof(policy) is distinct from 'object' then raise exception 'assessment_policy_unconfigured'; end if;
  if coalesce(policy->>'schemaVersion','') not in ('haiedu-assessment-policy-v1','haiedu-assessment-policy-v2','haiedu-assessment-policy-v3')
    or b.purpose not in ('diagnostic','practice','mastery_check','chapter_review')
    or coalesce(length(trim(policy->>'policyKey')),0)=0
    or jsonb_typeof(policy->'policyKey') is distinct from 'string'
    or jsonb_typeof(policy->'version') is distinct from 'number'
    or coalesce(policy->>'version','') !~ '^[1-9][0-9]*$'
    or (policy->>'version')::numeric>9007199254740991
    or policy->>'mode' is distinct from b.purpose
    or policy->>'subjectProgramId' is distinct from r.subject_program_id::text
    or policy->>'curriculumReleaseId' is distinct from r.id::text
    or policy->>'unitId' is distinct from b.unit_id::text
    or jsonb_typeof(policy->'plannedQuestionCount') is distinct from 'number'
    or coalesce(policy->>'plannedQuestionCount','') !~ '^[1-9][0-9]*$'
    or (policy->>'plannedQuestionCount')::numeric>100
    or policy->>'scoringStrategy' is distinct from (case when policy->>'schemaVersion'='haiedu-assessment-policy-v3' then 'normalized-item-score-v1' else 'selected-response-v1' end)
    or jsonb_typeof(policy->'hintsAllowed') is distinct from 'boolean'
    or jsonb_typeof(policy->'baselineRequired') is distinct from 'boolean'
    or jsonb_typeof(policy->'responseTypes') is distinct from 'array'
  then raise exception 'assessment_policy_invalid'; end if;
  n:=(policy->>'plannedQuestionCount')::integer;
  if jsonb_array_length(policy->'responseTypes')=0 or exists (
    select 1 from jsonb_array_elements(policy->'responseTypes') x
    where x not in ('"single_choice"'::jsonb,'"true_false"'::jsonb) and not (policy->>'schemaVersion'='haiedu-assessment-policy-v3' and x in ('"typed_fields"'::jsonb,'"matching"'::jsonb,'"ordering"'::jsonb)))
    or (select count(distinct x) from jsonb_array_elements(policy->'responseTypes') x)
      <>jsonb_array_length(policy->'responseTypes')
    or exists (select 1 from jsonb_object_keys(policy) k where k not in
      ('schemaVersion','policyKey','version','mode','subjectProgramId','curriculumReleaseId','unitId',
       'plannedQuestionCount','learningModelConfigurationId','academicMasteryPolicyId','responseTypes',
       'scoringStrategy','hintsAllowed','baselineRequired','questionCountBySkill',
       'maximumCompletedBaselines','minimumPercent','minimumCorrectBySkill')
      and not (policy->>'schemaVersion' in ('haiedu-assessment-policy-v2','haiedu-assessment-policy-v3') and k in ('deliveredSkillIds','scoredSkillIds','readinessSkillIds','reportingGroups'))
      and not (policy->>'schemaVersion'='haiedu-assessment-policy-v3' and k in ('responseCapabilities','itemWeight')))
  then raise exception 'assessment_policy_invalid'; end if;
  if policy->>'schemaVersion'='haiedu-assessment-policy-v3' then
    if policy->'itemWeight' is distinct from '1'::jsonb or policy->'responseCapabilities' is distinct from (select coalesce(jsonb_object_agg(k,v),'{}'::jsonb) from (values ('typed_fields','haiedu-typed-fields-v1'),('matching','haiedu-matching-v1'),('ordering','haiedu-ordering-v1')) capabilities(k,v) where policy->'responseTypes' ? k) then raise exception 'assessment_policy_invalid'; end if;
  end if;
  if b.purpose in ('diagnostic','mastery_check') then
    if policy->'hintsAllowed'<>'false'::jsonb or jsonb_typeof(policy->'questionCountBySkill') is distinct from 'object'
      or policy->'questionCountBySkill'='{}'::jsonb then raise exception 'assessment_policy_invalid'; end if;
    total:=0;
    for entry in select * from jsonb_each(policy->'questionCountBySkill') loop
      if entry.key !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        or jsonb_typeof(entry.value)<>'number' or entry.value::text !~ '^[1-9][0-9]*$'
        or not exists (select 1 from public.curriculum_release_skills rs
          join public.items i on i.skill_id=rs.skill_id
          join public.assessment_blueprint_items bi on bi.item_id=i.id and bi.assessment_blueprint_id=b.id
          join public.item_curriculum_scopes sc on sc.item_id=i.id and sc.is_primary
          where rs.curriculum_release_id=r.id and sc.unit_id=b.unit_id
            and sc.subject_program_id=r.subject_program_id and rs.skill_id=entry.key::uuid)
      then raise exception 'assessment_policy_skill_scope_invalid'; end if;
      total:=total+entry.value::text::numeric;
    end loop;
    if total<>n then raise exception 'assessment_policy_invalid'; end if;
  elsif policy ? 'questionCountBySkill' then raise exception 'assessment_policy_invalid'; end if;
  if b.purpose='diagnostic' then
    if policy->'maximumCompletedBaselines' is distinct from '1'::jsonb
      or policy->'baselineRequired'<>'false'::jsonb then raise exception 'assessment_policy_invalid'; end if;
  elsif policy ? 'maximumCompletedBaselines' then raise exception 'assessment_policy_invalid'; end if;
  -- Retain the accepted diagnostic-before-practice/review product rule.
  if b.purpose in ('practice','chapter_review') and policy->'baselineRequired'<>'true'::jsonb then
    raise exception 'chapter_diagnostic_policy_required'; end if;
  if b.purpose='mastery_check' then
    if jsonb_typeof(policy->'minimumPercent') is distinct from 'number'
      or (policy->>'minimumPercent')::numeric<=0 or (policy->>'minimumPercent')::numeric>100
      or jsonb_typeof(policy->'minimumCorrectBySkill') is distinct from 'object'
      or policy->'minimumCorrectBySkill'='{}'::jsonb then raise exception 'assessment_policy_invalid'; end if;
    for entry in select * from jsonb_each(policy->'minimumCorrectBySkill') loop
      if jsonb_typeof(entry.value)<>'number' or entry.value::text !~ '^(0|[1-9][0-9]*)$'
        or not (policy->'questionCountBySkill' ? entry.key)
        or entry.value::text::numeric>(policy->'questionCountBySkill'->>entry.key)::numeric
      then raise exception 'assessment_policy_invalid'; end if;
    end loop;
  elsif policy ? 'minimumPercent' or policy ? 'minimumCorrectBySkill' then raise exception 'assessment_policy_invalid'; end if;
  if policy->>'schemaVersion' in ('haiedu-assessment-policy-v2','haiedu-assessment-policy-v3') then
    perform private.validate_assessment_scope_v2(policy,(select jsonb_agg(distinct i.skill_id order by i.skill_id) from public.assessment_blueprint_items bi join public.items i on i.id=bi.item_id where bi.assessment_blueprint_id=b.id));
  end if;
  if coalesce(policy->>'learningModelConfigurationId','') !~ '^[0-9a-f-]{36}$'
    or coalesce(policy->>'academicMasteryPolicyId','') !~ '^[0-9a-f-]{36}$' then raise exception 'assessment_policy_invalid'; end if;
  select * into model from public.learning_model_configurations
    where id=(policy->>'learningModelConfigurationId')::uuid for share;
  if not found or model.configuration_kind not in ('baseline','approved')
    or model.reference_curriculum_release_id is distinct from r.id
    or jsonb_typeof(model.configuration->'assessmentPolicyContracts') is distinct from 'array'
    or not (model.configuration->'assessmentPolicyContracts' @> jsonb_build_array(policy))
  then raise exception 'assessment_policy_model_incompatible'; end if;
  select * into lifecycle from public.academic_mastery_policy_versions
    where id=(policy->>'academicMasteryPolicyId')::uuid for share;
  if not found or lifecycle.status<>'active' or lifecycle.effective_from>clock_timestamp()
    or (b.purpose='chapter_review' and lifecycle.target_review_question_count<>n)
  then raise exception 'assessment_policy_lifecycle_incompatible'; end if;
  select * into pool from public.assessment_pools where id=b.assessment_pool_id for update;
  if not found or pool.status<>'active' or pool.unit_code<>code
    or pool.purpose<>(case when b.purpose='chapter_review' then 'practice' else b.purpose end)
  then raise exception 'assessment_policy_pool_invalid'; end if;
  perform 1 from public.assessment_blueprint_items bi join public.items i on i.id=bi.item_id
    where bi.assessment_blueprint_id=b.id order by i.id for share of bi,i;
  perform 1 from public.curriculum_release_skills rs join public.items i on i.skill_id=rs.skill_id
    join public.assessment_blueprint_items bi on bi.item_id=i.id and bi.assessment_blueprint_id=b.id
    join public.item_curriculum_scopes sc on sc.item_id=i.id
    where rs.curriculum_release_id=r.id order by rs.skill_id,i.id,sc.id for share of rs,sc;
  perform 1 from public.assessment_pool_items where pool_id=pool.id order by item_id for share;
  if not exists (select 1 from public.assessment_blueprint_items where assessment_blueprint_id=b.id)
    or exists (select 1 from public.assessment_blueprint_items bi
      join public.items i on i.id=bi.item_id
      where bi.assessment_blueprint_id=b.id and
       (i.status<>'published' or i.version_no<>bi.item_version_snapshot
        or not (policy->'responseTypes' ? i.item_type::text)
        or not exists (select 1 from public.assessment_pool_items pi
          where pi.pool_id=pool.id and pi.item_id=i.id and pi.enabled)
        or not exists (select 1 from public.curriculum_release_skills rs
          join public.item_curriculum_scopes sc on sc.item_id=i.id and sc.is_primary
          where rs.curriculum_release_id=r.id and sc.unit_id=b.unit_id
            and sc.subject_program_id=r.subject_program_id and rs.skill_id=i.skill_id)))
  then raise exception 'assessment_policy_item_scope_invalid'; end if;
  if (select count(*) from public.assessment_blueprint_items where assessment_blueprint_id=b.id)<n then
    raise exception 'assessment_policy_coverage_insufficient'; end if;
  if policy->>'schemaVersion'='haiedu-assessment-policy-v3' then
    if policy->'itemWeight' is distinct from '1'::jsonb or policy->'responseCapabilities' is distinct from (select coalesce(jsonb_object_agg(k,v),'{}'::jsonb) from (values ('typed_fields','haiedu-typed-fields-v1'),('matching','haiedu-matching-v1'),('ordering','haiedu-ordering-v1')) capabilities(k,v) where policy->'responseTypes' ? k) then raise exception 'assessment_policy_invalid'; end if;
  end if;
  if b.purpose in ('diagnostic','mastery_check') then
    for entry in select * from jsonb_each_text(policy->'questionCountBySkill') loop
      if (select count(*) from public.assessment_blueprint_items bi join public.items i on i.id=bi.item_id
        where bi.assessment_blueprint_id=b.id and i.skill_id=entry.key::uuid)<entry.value::integer then
        raise exception 'assessment_policy_coverage_insufficient'; end if;
    end loop;
  end if;
  if b.purpose='diagnostic' and not exists (select 1 from public.assessment_forms f
    where f.pool_id=pool.id and f.status='active') then raise exception 'assessment_policy_forms_unavailable'; end if;
  if b.purpose='diagnostic' then
    for form in select f.id from public.assessment_forms f where f.pool_id=pool.id and f.status='active' order by f.id for update loop
      perform 1 from public.assessment_form_items where form_id=form.id order by item_id for share;
      if (select count(*) from public.assessment_form_items where form_id=form.id)<>n
        or exists (select 1 from public.assessment_form_items fi where fi.form_id=form.id
          and not exists (select 1 from public.assessment_blueprint_items bi where bi.assessment_blueprint_id=b.id and bi.item_id=fi.item_id))
      then raise exception 'assessment_policy_form_coverage_invalid'; end if;
      for entry in select * from jsonb_each_text(policy->'questionCountBySkill') loop
        if (select count(*) from public.assessment_form_items fi join public.items i on i.id=fi.item_id
          where fi.form_id=form.id and i.skill_id=entry.key::uuid)<>entry.value::integer then
          raise exception 'assessment_policy_form_coverage_invalid'; end if;
      end loop;
      if exists (select 1 from public.assessment_form_items fi join public.items i on i.id=fi.item_id
        where fi.form_id=form.id and not (policy->'questionCountBySkill' ? i.skill_id::text)) then
        raise exception 'assessment_policy_form_coverage_invalid'; end if;
    end loop;
  end if;
  for entry in select i.item_type::text response_type,i.config,k.answer from public.assessment_blueprint_items bi join public.items i on i.id=bi.item_id left join public.item_answer_keys k on k.item_id=i.id where bi.assessment_blueprint_id=b.id and i.item_type::text in ('typed_fields','matching','ordering') loop
    if entry.response_type='typed_fields' then perform private.validate_typed_key(entry.config->'responseDefinition',entry.answer);
    else perform private.validate_arrangement_key(entry.response_type,entry.config->'responseDefinition',entry.answer); end if;
  end loop;
  for entry in select i.id,i.stimulus from public.assessment_blueprint_items bi join public.items i on i.id=bi.item_id where bi.assessment_blueprint_id=b.id and i.stimulus->>'kind'='audio' loop
    if b.purpose not in ('practice','chapter_review') then raise exception 'audio_mode_unavailable'; end if;
    perform private.validate_audio_reference(entry.stimulus,entry.id,b.curriculum_release_id,b.unit_id);
  end loop;
  return policy;
end;
$$;

create or replace function public.service_governed_learning_operation(p_student_id uuid,p_auth_session_id uuid,p_session_id uuid,p_action text,p_payload jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.learning_sessions%rowtype; b public.assessment_policy_bindings%rowtype; li public.learning_session_items%rowtype;
 item public.items%rowtype; key public.item_answer_keys%rowtype; model jsonb; presentation jsonb; learner_options jsonb;
 actual text; canonical_actual text; expected text; is_correct boolean; error_code text; result jsonb; lifecycle jsonb; final_result jsonb; skill_results jsonb; reporting jsonb; passed boolean; percent numeric;
 choice uuid; desired integer; score numeric; wrong_count integer; band jsonb; practice jsonb; cooldown integer; hint jsonb; guide jsonb; scope text; next_level integer; stage text; post_answer boolean;
 evidence_count integer; recent_count integer; independent_count integer; unique_count integer; completion_reason text;
 title text; strategy text; content text; hint_keys jsonb; params jsonb; recommendation_id uuid; recommendation_action text;
 typed_grade jsonb; normalized_response jsonb; item_score numeric; draft public.learning_response_drafts%rowtype;
 prerequisite_target uuid; next_target uuid; recommendation_target uuid; recommendation_target_unit uuid;
audio public.learning_audio_versions%rowtype;
begin
 s:=private.lock_governed_learning_session(p_student_id,p_auth_session_id,p_session_id);
 select * into strict b from public.assessment_policy_bindings where id=s.assessment_policy_binding_id;
 select configuration into strict model from public.learning_model_configurations where id=b.learning_model_configuration_id;
 perform private.validate_governed_learning_model(b.learning_model_configuration_id);
 if p_payload->>'expectedMode' is not null and s.mode<>p_payload->>'expectedMode' then raise exception 'learning_context_unavailable'; end if;
 if p_action='status' then
   select to_jsonb(st) into lifecycle from public.chapter_mastery_states st where st.student_id=p_student_id and st.curriculum_release_id=s.curriculum_release_id and st.unit_code=s.unit_code;
   return private.authorized_governed_result(p_student_id,p_auth_session_id,s.institutional_class_enrollment_id,s.curriculum_release_id,s.governed_unit_id,jsonb_build_object('session',private.learner_governed_session(to_jsonb(s)),'assessmentPolicy',b.policy_snapshot,'lifecycle',lifecycle,'unitId',s.governed_unit_id));
 end if;
 if s.status<>'active' and not (p_action='serve' and s.status='completed') then raise exception 'session_not_active'; end if;
 if p_action='serve' and s.status='completed' then
   return private.authorized_governed_result(p_student_id,p_auth_session_id,s.institutional_class_enrollment_id,s.curriculum_release_id,s.governed_unit_id,jsonb_build_object('complete',true,'session',to_jsonb(s),'assessmentResult',s.metadata->'assessmentResultReporting','summary',jsonb_build_object('answered',s.answered_count,'correct',s.correct_count,'planned',s.planned_item_count,'percent',coalesce((s.metadata#>>'{assessmentResultReporting,score,percent}')::numeric,(s.metadata#>>'{assessmentResultReporting,overallScore,percent}')::numeric,round(100.0*s.correct_count/nullif(s.answered_count,0))))));
 end if;
 if p_payload->>'sessionItemId' is not null then
 select * into li from public.learning_session_items where id=(p_payload->>'sessionItemId')::uuid and session_id=s.id for update;
 else
   select * into li from public.learning_session_items where session_id=s.id and answered_at is null order by ordinal limit 1 for update;
 end if;
 if li.id is not null and li.answered_at is null and li.ordinal<>s.answered_count+1 then raise exception 'learning_context_unavailable'; end if;
 if li.id is null and p_action='serve' and s.mode='practice' then
   select mastery_score,m.evidence_count into score,evidence_count from public.student_skill_mastery_by_release m where student_id=p_student_id and curriculum_release_id=s.curriculum_release_id and skill_id=s.target_skill_id;
   select count(distinct item_id) into unique_count from public.learning_session_items where session_id=s.id and answered_at is not null;
   select count(*),count(*) filter(where correct and hint_level_used=0) into recent_count,independent_count
   from (select correct,hint_level_used from public.learning_session_items where session_id=s.id and answered_at is not null order by ordinal desc limit (model#>>'{recentRecovery,recentWindow}')::integer) recent;
   completion_reason:=case when evidence_count>=(model#>>'{mastery,minimumEvidenceCount}')::integer and score>=(model#>>'{mastery,secureAtOrAbove}')::numeric then 'mastery_reached'
     when unique_count>=(model#>>'{recentRecovery,minimumUniqueItems}')::integer and recent_count>=(model#>>'{recentRecovery,recentWindow}')::integer and independent_count>=(model#>>'{recentRecovery,minimumIndependentCorrect}')::integer then 'independent_recovery' else null end;
   if completion_reason is not null then
     update public.learning_sessions set status='completed',completed_at=clock_timestamp(),updated_at=clock_timestamp(),metadata=metadata||jsonb_build_object('completionReason',completion_reason) where id=s.id returning * into s;
     if b.policy_snapshot->>'schemaVersion' in ('haiedu-assessment-policy-v2','haiedu-assessment-policy-v3') then
       select private.assessment_result_v2(b.policy_snapshot,jsonb_agg(jsonb_build_object('skillId',skill_id,'correct',correct,'total',total,'earned',earned))) into reporting from
         (select lsi.skill_id,count(*) total,count(*) filter(where lsi.correct) correct,sum(a.score) earned from public.learning_session_items lsi join public.attempts a on a.id=lsi.attempt_id where lsi.session_id=s.id and lsi.answered_at is not null group by lsi.skill_id) q;
       update public.learning_sessions set metadata=metadata||jsonb_build_object('assessmentResultReporting',reporting) where id=s.id returning * into s;
     end if;
     return private.authorized_governed_result(p_student_id,p_auth_session_id,s.institutional_class_enrollment_id,s.curriculum_release_id,s.governed_unit_id,jsonb_build_object('complete',true,'session',to_jsonb(s),'assessmentResult',s.metadata->'assessmentResultReporting','summary',jsonb_build_object('answered',s.answered_count,'correct',s.correct_count,'planned',s.planned_item_count,'percent',coalesce(round(100.0*s.correct_count/nullif(s.answered_count,0)),0),'reason',completion_reason)));
   end if;
 end if;
 if li.id is null and not (p_action='serve' and s.mode='practice' and s.answered_count<s.planned_item_count) then raise exception 'learning_context_unavailable'; end if;
 if p_action='serve' and s.mode='practice' and li.id is null then
   practice:=model->'practice';
   if not (practice ?& array['desiredDifficultyBands','consecutiveWrongAdjustment','exactVariantCooldownRecentDistinctVariants','selectionPolicyVersion'])
   or practice->>'selectionPolicyVersion'<>'11B-v1' then raise exception 'unsupported_practice_selection_contract'; end if;
   cooldown:=(practice->>'exactVariantCooldownRecentDistinctVariants')::integer;
   if cooldown<0 then raise exception 'unsupported_practice_selection_contract'; end if;
   select mastery_score into score from public.student_skill_mastery_by_release where student_id=p_student_id and curriculum_release_id=s.curriculum_release_id and skill_id=s.target_skill_id;
   if score is null then score:=(model#>>'{mastery,priorAlpha}')::numeric/((model#>>'{mastery,priorAlpha}')::numeric+(model#>>'{mastery,priorBeta}')::numeric); end if;
   for band in select value from jsonb_array_elements(practice->'desiredDifficultyBands') loop
     if ((band ? 'masteryBelow') and score<(band->>'masteryBelow')::numeric) or ((band ? 'masteryAtOrAbove') and score>=(band->>'masteryAtOrAbove')::numeric) then desired:=(band->>'difficulty')::integer; exit; end if;
   end loop;
   if desired is null then raise exception 'unsupported_practice_selection_contract'; end if;
   select count(*) into wrong_count from (select correct from public.attempts where student_id=p_student_id and curriculum_release_id=s.curriculum_release_id and skill_id=s.target_skill_id order by created_at desc,id desc limit 2) recent where not correct;
   -- Only a consecutive suffix counts; a newer correct answer resets recovery.
   if (select correct from public.attempts where student_id=p_student_id and curriculum_release_id=s.curriculum_release_id and skill_id=s.target_skill_id order by created_at desc,id desc limit 1) then wrong_count:=0; end if;
   desired:=greatest((model#>>'{mastery,difficultyWeight,difficultyMin}')::integer,least((model#>>'{mastery,difficultyWeight,difficultyMax}')::integer,
     desired+case when wrong_count>=2 then (practice#>>'{consecutiveWrongAdjustment,twoOrMoreWrong}')::integer when wrong_count=1 then (practice#>>'{consecutiveWrongAdjustment,oneWrong}')::integer else 0 end));
   with history as (
     select e.*,row_number() over(partition by e.item_id order by e.served_at desc,e.id desc) rn
     from public.student_item_exposure_events e where e.student_id=p_student_id and e.curriculum_release_id=s.curriculum_release_id
   ), recent as (select item_id,max(served_at) last_seen from history group by item_id order by last_seen desc,item_id limit cooldown),
   candidates as (
     select i.id,i.code,i.difficulty,(select count(*) from history h where h.item_id=i.id) seen,
     exists(select 1 from public.learning_session_items old where old.session_id=s.id and (li.id is null or old.id<>li.id) and old.item_id=i.id and
       (old.answered_at is not null or exists(select 1 from public.student_item_exposure_events e where e.session_item_id=old.id))) used,
     exists(select 1 from recent r where r.item_id=i.id) cooling,
     (select correct from history h where h.item_id=i.id and h.answered_at is not null order by served_at desc,id desc limit 1) latest_correct,
     (select max(served_at) from history h where h.item_id=i.id) last_seen
     from public.assessment_blueprint_items bi join public.items i on i.id=bi.item_id join public.assessment_pool_items pi on pi.item_id=i.id
     join public.assessment_blueprints bp on bp.id=bi.assessment_blueprint_id and bp.assessment_pool_id=pi.pool_id
     where bp.id=s.assessment_blueprint_id and i.skill_id=s.target_skill_id and i.status='published' and pi.enabled and i.version_no=bi.item_version_snapshot
   ) select id into choice from candidates order by
     case when seen=0 and not used then 0 when not used and not cooling and latest_correct=false then 1 when not used and not cooling then 2 else 3 end,
     case when seen=0 then abs(difficulty-desired) end,last_seen nulls first,seen,abs(difficulty-desired),code,id limit 1;
   if choice is null then raise exception 'learning_context_unavailable'; end if;
   insert into public.learning_session_items(session_id,ordinal,item_id,skill_id,selection_reason) values(s.id,s.answered_count+1,choice,s.target_skill_id,'configured-adaptive-exposure-v1') returning * into li;
 end if;
 select * into strict item from public.items where id=li.item_id for share;
 -- Runtime delivery uses frozen item versions and live pool/content retirement.
 perform 1 from public.assessment_pool_items pi join public.assessment_blueprints bp on bp.assessment_pool_id=pi.pool_id join public.assessment_pools pool on pool.id=pi.pool_id
 where bp.id=s.assessment_blueprint_id and pi.item_id=item.id and pi.enabled and pool.status='active' for share of pi,pool;
 if not found or item.status<>'published' or not (b.skill_scope_snapshot ? item.skill_id::text)
 or not (b.policy_snapshot->'responseTypes' ? item.item_type::text)
 or not exists(select 1 from public.assessment_blueprint_items bi where bi.assessment_blueprint_id=s.assessment_blueprint_id and bi.item_id=item.id and bi.item_version_snapshot=item.version_no)
 then raise exception 'learning_context_unavailable'; end if;
 if item.stimulus->>'kind'='audio' then
   if s.mode not in ('practice','chapter_review') then raise exception 'audio_mode_unavailable'; end if;
   audio:=private.validate_audio_reference(item.stimulus,item.id,s.curriculum_release_id,s.governed_unit_id);
 end if;
 if item.item_type::text in ('typed_fields','matching','ordering') then
   if b.policy_snapshot->>'schemaVersion'<>'haiedu-assessment-policy-v3' or b.policy_snapshot#>>array['responseCapabilities',item.item_type::text] is distinct from (case when item.item_type::text='typed_fields' then 'haiedu-typed-fields-v1' else 'haiedu-'||item.item_type::text||'-v1' end) then raise exception 'unsupported_scoring_strategy'; end if;
   if item.item_type::text='typed_fields' then perform private.validate_typed_definition(item.config->'responseDefinition');
   else perform private.validate_arrangement_definition(item.item_type::text,item.config->'responseDefinition'); end if;
   select * into draft from public.learning_response_drafts where session_item_id=li.id and student_id=p_student_id for update;
   if p_action in ('answer','draft') then
     if li.answered_at is not null then raise exception 'session_item_already_answered'; end if;
     if item.id is distinct from (p_payload->>'itemId')::uuid or not exists(select 1 from public.student_item_exposure_events where session_item_id=li.id) then raise exception 'learning_context_unavailable'; end if;
     if item.item_type::text='typed_fields' then perform private.validate_typed_response(item.config->'responseDefinition',p_payload->'response');
     else perform private.validate_arrangement_response(item.item_type::text,item.config->'responseDefinition',p_payload->'response'); end if;
     if jsonb_typeof(p_payload->'draftRevision') is distinct from 'number' or coalesce(p_payload->>'draftRevision','') !~ '^(0|[1-9][0-9]*)$' then raise exception '%',case when item.item_type::text='typed_fields' then 'typed_fields_response_invalid' else 'arrangement_response_invalid' end; end if;
     if (p_payload->>'draftRevision')::numeric<>coalesce(draft.revision,0) then raise exception '%',case when item.item_type::text='typed_fields' then 'typed_fields_draft_conflict' else 'response_draft_conflict' end; end if;
     if p_action='draft' then
       insert into public.learning_response_drafts(session_item_id,student_id,response,revision) values(li.id,p_student_id,p_payload->'response',1) on conflict(session_item_id) do update set response=excluded.response,revision=learning_response_drafts.revision+1,updated_at=clock_timestamp() returning * into draft;
       return private.authorized_governed_result(p_student_id,p_auth_session_id,s.institutional_class_enrollment_id,s.curriculum_release_id,s.governed_unit_id,jsonb_build_object('saved',true,'draftRevision',draft.revision));
     end if;
   end if;
 elsif p_action='draft' then raise exception 'typed_fields_response_invalid';
 end if;
 if p_action='serve' then
   if li.answered_at is not null then raise exception 'session_item_already_answered'; end if;
   if item.item_type='single_choice' then
     presentation:=public.service_ensure_session_item_option_order(li.id);
     select jsonb_agg(jsonb_build_object('option_key',private.governed_presentation_key(x.ordinal::integer),'content_hy',o.content_hy,'display_order',x.ordinal) order by x.ordinal) into learner_options
     from jsonb_array_elements_text(presentation->'canonicalOptionOrder') with ordinality x(value,ordinal)
     join public.item_options o on o.item_id=item.id and o.option_key=x.value;
   else select jsonb_agg(jsonb_build_object('option_key',option_key,'content_hy',content_hy,'display_order',display_order) order by display_order) into learner_options from public.item_options where item_id=item.id; end if;
   perform public.service_record_item_exposure(p_student_id,s.id,li.id,item.id,clock_timestamp());
   return private.authorized_governed_result(p_student_id,p_auth_session_id,s.institutional_class_enrollment_id,s.curriculum_release_id,s.governed_unit_id,jsonb_build_object('complete',false,'session',jsonb_build_object('id',s.id,'mode',s.mode,'status',s.status,'position',li.ordinal,'total',s.planned_item_count,'answered',s.answered_count,'correct',case when s.mode in ('diagnostic','mastery_check') then null else s.correct_count end,'feedbackMode',case when s.mode in ('diagnostic','mastery_check') then 'deferred' else 'immediate' end),
   'sessionItemId',li.id,'skill',(select jsonb_build_object('id',id,'code',code,'nameHy',name_hy,'layer',layer) from public.skills where id=item.skill_id),
   'item',jsonb_build_object('id',item.id,'code',item.code,'type',item.item_type,'promptHy',item.prompt_hy,'stimulus',case when audio.id is null then item.stimulus else jsonb_build_object('kind','audio','schemaVersion','haiedu-audio-v1','audioVersionId',audio.id,'title',audio.title,'locale',audio.locale,'durationMs',audio.duration_ms,'playbackPolicy','replayable-practice-v1','transcriptAvailable',false,'completed',exists(select 1 from public.learning_audio_deliveries ad where ad.session_item_id=li.id and ad.student_id=p_student_id and ad.audio_version_id=audio.id and ad.completed_at is not null and ad.failed_at is null)) end,'difficulty',item.difficulty,'options',coalesce(learner_options,'[]'),'optionPresentationVersion',presentation->>'algorithmVersion','responseDefinition',case when item.item_type::text='typed_fields' then item.config->'responseDefinition' when item.item_type::text in ('matching','ordering') then private.present_arrangement_definition(item.item_type::text,item.config->'responseDefinition',li.id::text) else null end,'responsePresentationVersion',case when item.item_type::text in ('matching','ordering') then 'haiedu-stable-arrangement-v1' else null end),
   'responseDraft',draft.response,'draftRevision',coalesce(draft.revision,0),
   'remediation',jsonb_build_object('available',(b.policy_snapshot->>'hintsAllowed')::boolean,'hintLevelUsed',li.hint_level_used,'selectionReason',li.selection_reason)));
 elsif p_action='answer' then
   if li.answered_at is not null then raise exception 'session_item_already_answered'; end if;
   if item.id is distinct from (p_payload->>'itemId')::uuid then raise exception 'learning_context_unavailable'; end if;
   if not exists(select 1 from public.student_item_exposure_events where session_item_id=li.id) then raise exception 'learning_context_unavailable'; end if;
   select * into strict key from public.item_answer_keys where item_id=item.id for share;
   expected:=lower(trim(coalesce(key.answer->>'value',key.answer#>>'{}')));
   actual:=lower(trim(p_payload#>>'{response,value}'));
   if item.item_type='single_choice' then
     presentation:=public.service_ensure_session_item_option_order(li.id);
     if private.governed_presentation_index(actual)>=jsonb_array_length(presentation->'canonicalOptionOrder') then raise exception 'invalid_option_presentation_key'; end if;
     canonical_actual:=presentation->'canonicalOptionOrder'->>private.governed_presentation_index(actual);
     actual:=lower(canonical_actual);
     is_correct:=actual=expected; error_code:=case when is_correct then null else 'incorrect_choice' end;
   elsif item.item_type='true_false' then
     if expected not in ('true','false') then raise exception 'invalid_boolean_key'; end if;
     is_correct:=actual=expected; error_code:=case when actual not in ('true','false') or actual is null then 'invalid_boolean' when is_correct then null else 'incorrect_boolean' end;
   elsif item.item_type::text='typed_fields' then
     typed_grade:=private.grade_typed_fields(item.config->'responseDefinition',key.answer,p_payload->'response');
     is_correct:=(typed_grade->>'correct')::boolean;error_code:=typed_grade->>'errorCode';
   elsif item.item_type::text in ('matching','ordering') then
     typed_grade:=private.grade_arrangement_response(item.item_type::text,item.config->'responseDefinition',key.answer,p_payload->'response');
     is_correct:=(typed_grade->>'correct')::boolean;error_code:=typed_grade->>'errorCode';
   else raise exception 'unsupported_scoring_strategy'; end if;
   is_correct:=coalesce(is_correct,false);
   item_score:=coalesce((typed_grade->>'score')::numeric,case when is_correct then 1 else 0 end);
   normalized_response:=coalesce(typed_grade->'normalizedResponse',jsonb_build_object('value',coalesce(canonical_actual,actual),'presentationValue',p_payload#>>'{response,value}','optionPresentationVersion',presentation->>'algorithmVersion'));
   if item.item_type::text in ('matching','ordering') then
     normalized_response:=normalized_response||jsonb_build_object('presentationVersion','haiedu-stable-arrangement-v1','presentedIds',
       (select jsonb_agg(value->'id') from jsonb_array_elements(private.present_arrangement_definition(item.item_type::text,item.config->'responseDefinition',li.id::text)->(case when item.item_type::text='matching' then 'targets' else 'segments' end))));
   end if;
   result:=public.service_record_session_answer_atomic(p_student_id,s.id,li.id,item.id,item.skill_id,p_payload->'response',normalized_response,item_score,is_correct,error_code,false,(p_payload->>'responseTimeMs')::integer,clock_timestamp());
   delete from public.learning_response_drafts where session_item_id=li.id and student_id=p_student_id;
   select * into strict s from public.learning_sessions where id=s.id;
   reporting:=s.metadata->'assessmentResultReporting';
   if s.status='completed' and reporting is null and b.policy_snapshot->>'schemaVersion' in ('haiedu-assessment-policy-v2','haiedu-assessment-policy-v3') then
     select jsonb_agg(jsonb_build_object('skillId',skill_id,'correct',correct,'total',total,'earned',earned) order by skill_id) into skill_results from
       (select lsi.skill_id,count(*) total,count(*) filter(where lsi.correct) correct,sum(a.score) earned from public.learning_session_items lsi join public.attempts a on a.id=lsi.attempt_id where lsi.session_id=s.id and lsi.answered_at is not null group by lsi.skill_id) q;
     reporting:=private.assessment_result_v2(b.policy_snapshot,skill_results);
     update public.learning_sessions set metadata=coalesce(metadata,'{}')||jsonb_build_object('assessmentResultReporting',reporting) where id=s.id;
   end if;
   if s.status='completed' and s.mode='mastery_check' then
     select jsonb_agg(jsonb_build_object('skillId',q.skill_id,'correct',q.correct,'total',q.total,'earned',q.earned) order by q.skill_id) into skill_results from
     (select lsi.skill_id,count(*) total,count(*) filter(where lsi.correct) correct,sum(a.score) earned from public.learning_session_items lsi join public.attempts a on a.id=lsi.attempt_id where lsi.session_id=s.id and lsi.answered_at is not null group by lsi.skill_id) q;
     percent:=round(100.0*s.correct_count/s.answered_count);
     passed:=percent>=(b.policy_snapshot->>'minimumPercent')::numeric and not exists(select 1 from jsonb_each_text(b.policy_snapshot->'minimumCorrectBySkill') minimum
       where (select count(*) from public.learning_session_items where session_id=s.id and skill_id=minimum.key::uuid and correct)<minimum.value::integer);
     if reporting is not null then passed:=(reporting->>'passed')::boolean; percent:=(reporting#>>'{score,percent}')::numeric; end if;
     lifecycle:=public.finalize_mastery_check_atomic(p_student_id,s.id,passed,percent,jsonb_build_object('passed',passed,'skillResults',skill_results,'failedSkillIds',
       (select coalesce(jsonb_agg(value->>'skillId'),'[]') from jsonb_array_elements(skill_results) where (value->>'correct')::integer<(value->>'total')::integer and (reporting is null or b.policy_snapshot->'scoredSkillIds' ? (value->>'skillId'))),'assessmentPolicyFingerprint',b.snapshot_fingerprint));
     final_result:=jsonb_build_object('passed',passed,'score',jsonb_build_object('correct',s.correct_count,'answered',s.answered_count,'percent',percent),'passCriteria',jsonb_build_object('overallPercent',b.policy_snapshot->'minimumPercent','minimumCorrectBySkill',b.policy_snapshot->'minimumCorrectBySkill'),'skillResults',skill_results,'lifecycle',lifecycle);
     if reporting is not null then final_result:=final_result||reporting; end if;
   elsif s.status='completed' and s.mode='chapter_review' then lifecycle:=public.finalize_chapter_review_atomic(p_student_id,s.id); end if;
   if s.status='completed' then select * into strict s from public.learning_sessions where id=s.id; end if;
   if s.mode in ('diagnostic','mastery_check') then
     return private.authorized_governed_result(p_student_id,p_auth_session_id,s.institutional_class_enrollment_id,s.curriculum_release_id,s.governed_unit_id,jsonb_build_object('accepted',true,'revealCorrect',false,'attemptId',result->'attemptId','session',private.learner_governed_session(to_jsonb(s)),'finalResult',final_result,'curriculumReleaseId',s.curriculum_release_id,'assessmentBlueprintId',s.assessment_blueprint_id,'provenanceStatus',s.provenance_status));
   end if;
   hint:=model#>'{recommendation,corePolicy}';
   if not (hint ?& array['default','insufficientEvidence','weakWithUnmetPrerequisite','secureWithNextSkill']) then raise exception 'unsupported_recommendation_contract'; end if;
   select pre.prerequisite_skill_id into prerequisite_target from public.skill_prerequisites pre
       join public.curriculum_release_skills rs on rs.skill_id=pre.prerequisite_skill_id and rs.curriculum_release_id=s.curriculum_release_id
       left join public.student_skill_mastery_by_release m on m.student_id=p_student_id and m.curriculum_release_id=s.curriculum_release_id and m.skill_id=pre.prerequisite_skill_id
       where pre.skill_id=item.skill_id and (m.mastery_score is null or m.mastery_score<pre.required_mastery)
       order by rs.sequence_order_snapshot,rs.skill_id limit 1;
   select rs.skill_id into next_target from public.curriculum_release_skills rs
   where rs.curriculum_release_id=s.curriculum_release_id and b.skill_scope_snapshot ? rs.skill_id::text
   and rs.sequence_order_snapshot>(select sequence_order_snapshot from public.curriculum_release_skills where curriculum_release_id=s.curriculum_release_id and skill_id=item.skill_id)
   order by rs.sequence_order_snapshot,rs.skill_id limit 1;
   recommendation_action:=case
     when result#>>'{masteryAfter,status}' in ('needs_support','developing') and prerequisite_target is not null then hint->>'weakWithUnmetPrerequisite'
     when result#>>'{masteryAfter,status}'='insufficient_evidence' then hint->>'insufficientEvidence'
     when result#>>'{masteryAfter,status}'='secure' and next_target is not null then hint->>'secureWithNextSkill'
     else hint->>'default' end;
   recommendation_target:=case when recommendation_action=hint->>'weakWithUnmetPrerequisite' then prerequisite_target
     when recommendation_action=hint->>'secureWithNextSkill' then next_target else item.skill_id end;
   select min(ic.unit_id::text)::uuid into recommendation_target_unit from public.item_curriculum_scopes ic
   join public.curriculum_release_units ru on ru.curriculum_release_id=s.curriculum_release_id and ru.unit_id=ic.unit_id
   join public.items ri on ri.id=ic.item_id
   where ri.skill_id=recommendation_target and ic.subject_program_id=s.subject_program_id and ic.is_primary
   having count(distinct ic.unit_id)=1;
   -- Ambiguous or unreleased action targets remain current-skill practice; no
   -- implicit chapter choice or catalogue code ordering is introduced.
   if recommendation_target_unit is null then recommendation_target:=item.skill_id;recommendation_target_unit:=s.governed_unit_id;recommendation_action:=hint->>'default';end if;
   recommendation_id:=gen_random_uuid();
   insert into public.recommendation_events(recommendation_instance_id,student_id,event_type,policy_scope,surface,action,target_skill_id,curriculum_release_id,assessment_blueprint_id,learning_model_configuration_id,model_provenance_status,learning_session_id,attempt_id,state_snapshot,recommendation_snapshot)
   values(recommendation_id,p_student_id,'issued','core_after_attempt','submit_answer_api',recommendation_action,recommendation_target,s.curriculum_release_id,s.assessment_blueprint_id,s.learning_model_configuration_id,s.model_provenance_status,s.id,(result->>'attemptId')::uuid,
    jsonb_build_object('unitId',s.governed_unit_id,'enrollmentId',s.institutional_class_enrollment_id,'assessmentPolicyBindingId',b.id,'masteryBefore',result->'masteryBefore','masteryAfter',result->'masteryAfter'),jsonb_build_object('action',recommendation_action,'targetUnitId',recommendation_target_unit));
   return private.authorized_governed_result(p_student_id,p_auth_session_id,s.institutional_class_enrollment_id,s.curriculum_release_id,s.governed_unit_id,jsonb_build_object('attemptId',result->'attemptId','session',to_jsonb(s),'curriculumReleaseId',s.curriculum_release_id,'assessmentBlueprintId',s.assessment_blueprint_id,'itemId',item.id,'skillId',item.skill_id,
   'grading',jsonb_build_object('correct',is_correct,'score',item_score,'components',typed_grade->'components','correctComponents',typed_grade->'correctComponents','requiredComponents',typed_grade->'requiredComponents','errorCode',error_code,'feedbackCode',key.feedback_code,'usedHelp',result->'hintUsed'),
   'mastery',jsonb_build_object('score',result#>'{masteryAfter,masteryScore}','evidenceCount',result#>'{masteryAfter,evidenceCount}','status',result#>'{masteryAfter,status}'),'recommendation',jsonb_build_object('action',recommendation_action,'targetSkillId',recommendation_target,'unitId',recommendation_target_unit,'curriculumReleaseId',s.curriculum_release_id,'enrollmentId',s.institutional_class_enrollment_id,'instanceId',recommendation_id,'policyScope','core_after_attempt','modelConfigurationId',s.learning_model_configuration_id,'modelProvenanceStatus',s.model_provenance_status),'chapterReview',lifecycle));
 elsif p_action='help' then
   if not (b.policy_snapshot->>'hintsAllowed')::boolean or s.mode not in ('practice','chapter_review') then raise exception 'help_not_available_in_assessment'; end if;
   hint:=model->'hinting';
   if hint->'levels'<>'["orient","strategy","analogous_worked_example"]'::jsonb or hint->>'liveAiGeneration'<>'false' then raise exception 'unsupported_hinting_contract'; end if;
   post_answer:=li.answered_at is not null;
   if post_answer and li.correct then raise exception 'help_not_needed_after_correct_answer'; end if;
   if post_answer then select a.error_code into error_code from public.attempts a where id=li.attempt_id; end if;
   select to_jsonb(g) into guide from public.item_template_remediation_guides g where g.item_template_id=item.item_template_id and g.status='published'
   and (g.trigger_error_code is null or (post_answer and g.trigger_error_code=error_code)) order by (g.trigger_error_code=error_code) desc nulls last,g.guide_version desc,g.id limit 1 for share;
   scope:='template';
   if guide is null then select to_jsonb(g) into guide from public.skill_remediation_guides g where g.skill_id=item.skill_id and g.status='published' order by g.guide_version desc,g.id limit 1 for share; scope:='skill'; end if;
   if guide is null then raise exception 'remediation_guide_missing'; end if;
   next_level:=least(jsonb_array_length(hint->'levels'),li.hint_level_used+1);
   stage:=case next_level when 1 then 'hint_1' when 2 then 'hint_2' else 'worked_example' end;
   hint_keys:=case when scope='template' then guide->'allowed_parameter_keys' else '[]'::jsonb end;params:=coalesce(item.variant_parameters,'{}');
   title:=private.render_governed_hint(guide->>'title_hy',hint_keys,params);strategy:=private.render_governed_hint(guide->>'strategy_hy',hint_keys,params);
   content:=private.render_governed_hint(guide->>case next_level when 1 then 'hint_1_hy' when 2 then 'hint_2_hy' else 'worked_example_hy' end,hint_keys,params);
   perform public.record_remediation_help_atomic(p_student_id,s.id,li.id,item.skill_id,item.id,stage,case when post_answer then 'post_error' else 'pre_answer' end,next_level,scope,(guide->>'id')::uuid,(guide->>'guide_version')::integer,item.item_template_id,error_code,title,strategy,content,
   jsonb_build_object('taskSpecific',scope='template','assessmentPolicyBindingId',b.id,'unitId',s.governed_unit_id));
   return private.authorized_governed_result(p_student_id,p_auth_session_id,s.institutional_class_enrollment_id,s.curriculum_release_id,s.governed_unit_id,jsonb_build_object('stage',stage,'level',next_level,'titleHy',title,'strategyHy',strategy,'contentHy',content,'guideScope',scope,'guideVersion',guide->'guide_version','taskSpecific',scope='template','errorCode',error_code,'postAnswer',post_answer,'moreHelpAvailable',next_level<jsonb_array_length(hint->'levels')));
 end if;
 raise exception 'unsupported_governed_operation';
end;
$$;

create or replace function public.service_record_session_answer_atomic(
  p_student_id uuid,p_session_id uuid,p_session_item_id uuid,p_item_id uuid,
  p_skill_id uuid,p_response jsonb,p_normalized_response jsonb,p_score numeric,
  p_correct boolean,p_error_code text,p_hint_used boolean,p_response_time_ms integer,
  p_attempted_at timestamptz
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  s public.learning_sessions%rowtype; i public.learning_session_items%rowtype;
  policy jsonb; reporting jsonb; audio public.learning_audio_versions%rowtype; audio_stimulus jsonb; audio_delivery public.learning_audio_deliveries%rowtype;
  v_attempt_id uuid; v_result jsonb; v_answered integer; v_planned integer;
begin
  select * into s from public.learning_sessions where id=p_session_id
    and student_id=p_student_id for update;
  if not found then raise exception 'invalid_or_inactive_session_item'; end if;
  select * into i from public.learning_session_items where id=p_session_item_id
    and session_id=p_session_id and item_id=p_item_id and skill_id=p_skill_id for update;
  if not found then raise exception 'invalid_or_inactive_session_item'; end if;
  if i.attempt_id is not null then
    return jsonb_build_object('attemptId',i.attempt_id,'replayed',true);
  end if;
  if s.status <> 'active' or i.answered_at is not null then
    raise exception 'invalid_or_inactive_session_item'; end if;
  select stimulus into audio_stimulus from public.items where id=p_item_id;
  if audio_stimulus->>'kind'='audio' then
    if s.assessment_policy_binding_id is null or s.mode not in ('practice','chapter_review') then raise exception 'audio_mode_unavailable'; end if;
    audio:=private.validate_audio_reference(audio_stimulus,p_item_id,s.curriculum_release_id,s.governed_unit_id);
    select * into audio_delivery from public.learning_audio_deliveries where session_item_id=i.id and student_id=p_student_id and audio_version_id=audio.id for update;
    if not found or audio_delivery.completed_at is null or audio_delivery.failed_at is not null then raise exception 'audio_playback_incomplete'; end if;
    p_normalized_response:=p_normalized_response||jsonb_build_object('audioEvidence',jsonb_build_object('schemaVersion','haiedu-audio-evidence-v1','audioVersionId',audio.id,'sourceFamilyId',audio.source_family_id,'playbackPolicy','replayable-practice-v1','transcriptUsed',false,'completionObservedAt',audio_delivery.completed_at));
  end if;
  -- Help is server-owned, read again after acquiring the assignment lock.
  p_hint_used := coalesce(i.hint_level_used,0)>0;
  insert into public.attempts(student_id,item_id,skill_id,response,normalized_response,
    score,correct,error_code,hint_used,response_time_ms,created_at,
    learning_session_id,learning_session_item_id)
  values(p_student_id,p_item_id,p_skill_id,p_response,p_normalized_response,p_score,
    p_correct,p_error_code,p_hint_used,p_response_time_ms,p_attempted_at,
    p_session_id,p_session_item_id) returning id into v_attempt_id;
  v_result := private.apply_configured_mastery_attempt(v_attempt_id);
  update public.learning_session_items set attempt_id=v_attempt_id,correct=p_correct,
    answered_at=p_attempted_at where id=p_session_item_id;
  perform public.service_finalize_item_exposure(p_student_id,p_session_id,
    p_session_item_id,p_item_id,v_attempt_id,p_correct,p_hint_used,p_response_time_ms,p_attempted_at);
  update public.learning_sessions set answered_count=answered_count+1,
    correct_count=correct_count+case when p_correct then 1 else 0 end,updated_at=p_attempted_at
    where id=p_session_id returning planned_item_count,answered_count into v_planned,v_answered;
  if v_answered>=v_planned then
    select policy_snapshot into policy from public.assessment_policy_bindings where id=s.assessment_policy_binding_id;
    if policy->>'schemaVersion' in ('haiedu-assessment-policy-v2','haiedu-assessment-policy-v3') then
      select private.assessment_result_v2(policy,jsonb_agg(jsonb_build_object('skillId',skill_id,'correct',correct,'total',total,'earned',earned))) into reporting from
      (select lsi.skill_id,count(*) total,count(*) filter(where lsi.correct) correct,sum(a.score) earned from public.learning_session_items lsi join public.attempts a on a.id=lsi.attempt_id where lsi.session_id=s.id and lsi.answered_at is not null group by lsi.skill_id) q;
    end if;
    update public.learning_sessions set status='completed',completed_at=p_attempted_at,
      updated_at=p_attempted_at,metadata=case when reporting is null then metadata else coalesce(metadata,'{}')||jsonb_build_object('assessmentResultReporting',reporting) end where id=p_session_id;
  end if;
  return v_result || jsonb_build_object('attemptId',v_attempt_id,'replayed',false);
end;
$$;
