-- UX-ORDER-01: order governed unit snapshots within each exact programme and
-- school/year/assignment before the release UUID. No entitlement, write,
-- publication, session, payload or historical record changes.
begin;
create or replace function private.service_supplementary_resources(p_actor_id uuid,p_auth_session_id uuid,p_aal text,p_action text,p_context jsonb default '{}',p_payload jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' set timezone='UTC' as $$
#variable_conflict use_column
declare role_name text;ctx jsonb;result jsonb;entries jsonb:='[]';r record;m public.supplementary_resource_versions%rowtype;n public.supplementary_resource_versions%rowtype;
 rel uuid:=(p_context->>'curriculumReleaseId')::uuid;unt uuid:=(p_context->>'unitId')::uuid;teacher boolean;is_student boolean;off integer;reason text;issues jsonb;
begin
 if p_aal not in ('aal1','aal2') or p_aal is null or jsonb_typeof(p_context) is distinct from 'object' or jsonb_typeof(p_payload) is distinct from 'object'
 or exists(select 1 from jsonb_object_keys(p_context) k where k not in ('curriculumReleaseId','unitId','assignmentId','enrollmentId'))
 or p_action not in ('contexts','list','get','create','revise','qa','publish','withdraw','upload_check','attach','open') then raise exception 'resource_request_invalid';end if;
 role_name:=private.supplementary_session(p_actor_id,p_auth_session_id);teacher:=role_name='teacher';is_student:=role_name='student';
 if role_name not in ('teacher','student','admin','content_admin') then raise exception 'resource_forbidden';end if;
 if p_action='contexts' then
  if p_context<>'{}' or p_payload<>'{}' then raise exception 'resource_request_invalid';end if;
  if is_student then return public.service_student_learning_navigation(p_actor_id,p_auth_session_id)||jsonb_build_object('role',role_name);end if;
  for r in select distinct cr.id release_id,ru.unit_id,a.id assignment_id,sp.id programme_id,s.name_hy subject_name,g.label_hy grade_label,
    ru.title_hy_snapshot unit_title,ru.sequence_order_snapshot seq,cl.name class_name,sch.name school_name,y.label year_label
   from public.curriculum_releases cr join public.curriculum_release_units ru on ru.curriculum_release_id=cr.id
   join public.subject_programs sp on sp.id=cr.subject_program_id join public.subjects s on s.id=sp.subject_id join public.grades g on g.id=sp.grade_id
   left join public.teacher_assignments a on teacher and a.subject_program_id=sp.id
   left join public.institutional_memberships im on im.id=a.teacher_membership_id
   left join public.classes cl on cl.id=a.class_id left join public.schools sch on sch.id=a.school_id left join public.academic_years y on y.id=a.academic_year_id
   where cr.status in ('pilot','production') and (not teacher or im.person_id=p_actor_id)
   order by subject_name,grade_label,programme_id,school_name,class_name,year_label,assignment_id,seq,unit_id,release_id
  loop
   ctx:=jsonb_build_object('curriculumReleaseId',r.release_id,'unitId',r.unit_id)||case when teacher then jsonb_build_object('assignmentId',r.assignment_id) else '{}'::jsonb end;
   begin perform private.supplementary_context(p_actor_id,p_auth_session_id,role_name,ctx);
   exception when raise_exception then if sqlerrm not in ('resource_forbidden','written_context_unavailable','written_read_only') then raise;end if;continue;end;
   entries:=entries||jsonb_build_array(ctx||jsonb_build_object('subjectProgramId',r.programme_id,'subjectNameHy',r.subject_name,'gradeLabelHy',r.grade_label,'unitTitleHy',r.unit_title,'className',r.class_name,'schoolName',r.school_name,'academicYearLabel',r.year_label));
  end loop;
  for ctx in select value from jsonb_array_elements(entries) loop
   perform private.supplementary_context(p_actor_id,p_auth_session_id,role_name,ctx);
  end loop;
  perform private.supplementary_session(p_actor_id,p_auth_session_id);
  return jsonb_build_object('role',role_name,'contexts',entries);
 end if;
 ctx:=private.supplementary_context(p_actor_id,p_auth_session_id,role_name,p_context);
 if is_student and p_action not in ('list','get','open') then raise exception 'resource_forbidden';end if;
 if p_action='list' then
  if exists(select 1 from jsonb_object_keys(p_payload) k where k<>'offset') then raise exception 'resource_request_invalid';end if;
  off:=coalesce((p_payload->>'offset')::integer,0);if off not between 0 and 100000 then raise exception 'resource_request_invalid';end if;
  select coalesce(jsonb_agg(entry order by created_at desc,id),'[]') into entries from (
   select m.id,m.created_at,private.supplementary_public(m)||case when is_student then '{}'::jsonb else jsonb_build_object('qa',m.qa) end entry
   from public.supplementary_resource_versions m where m.curriculum_release_id=rel and m.unit_id=unt
   and m.subject_program_id=(ctx->>'subjectProgramId')::uuid
   and ((is_student and m.status='published' and (m.provider='platform' or (m.assignment_id=(ctx->>'assignmentId')::uuid and m.created_by=(select im.person_id from public.teacher_assignments ta join public.institutional_memberships im on im.id=ta.teacher_membership_id where ta.id=m.assignment_id))))
     or (not is_student and ((teacher and m.provider='teacher' and m.assignment_id=(ctx->>'assignmentId')::uuid and m.created_by=p_actor_id) or (not teacher and m.provider='platform'))
       and not exists(select 1 from public.supplementary_resource_versions newer where newer.resource_id=m.resource_id and newer.version_no>m.version_no)))
   order by m.created_at desc,m.id offset off limit 51
  ) q;
  result:=jsonb_build_object('materials',entries,'hasMore',jsonb_array_length(entries)>50);
  if jsonb_array_length(entries)>50 then result:=jsonb_set(result,'{materials}',entries-50);end if;
 elsif p_action='create' then
  if exists(select 1 from jsonb_object_keys(p_payload) k where k<>'definition') then raise exception 'resource_request_invalid';end if;
  perform private.supplementary_definition(p_payload->'definition',teacher);
  insert into public.supplementary_resource_versions(version_no,subject_program_id,curriculum_release_id,unit_id,assignment_id,provider,created_by,definition,fingerprint)
   values(1,(ctx->>'subjectProgramId')::uuid,rel,unt,(ctx->>'assignmentId')::uuid,case when teacher then 'teacher' else 'platform' end,p_actor_id,p_payload->'definition','') returning * into m;
  insert into public.supplementary_resource_events(version_id,actor_id,event,actor_aal) values(m.id,p_actor_id,'created',p_aal);
  result:=jsonb_build_object('material',private.supplementary_public(m)||jsonb_build_object('definition',m.definition,'qa',m.qa));
 else
  if exists(select 1 from jsonb_object_keys(p_payload) k where k not in ('id','fingerprint','definition','reason','objectPath','fileBytes','fileSha256')) then raise exception 'resource_request_invalid';end if;
  select * into m from public.supplementary_resource_versions where id=(p_payload->>'id')::uuid and curriculum_release_id=rel and unit_id=unt and subject_program_id=(ctx->>'subjectProgramId')::uuid
   and ((is_student and (provider='platform' or (assignment_id=(ctx->>'assignmentId')::uuid and created_by=(select im.person_id from public.teacher_assignments ta join public.institutional_memberships im on im.id=ta.teacher_membership_id where ta.id=assignment_id)))) or
       (not is_student and ((teacher and provider='teacher' and assignment_id=(ctx->>'assignmentId')::uuid and created_by=p_actor_id) or (not teacher and provider='platform'))));
  if not found then raise exception 'resource_unavailable';end if;
  perform pg_advisory_xact_lock(hashtextextended('supplementary:'||m.resource_id::text,0));
  select * into strict m from public.supplementary_resource_versions where id=m.id for update;
  if is_student and m.status<>'published' then raise exception 'resource_unavailable';end if;
  if p_action not in ('get','open') then
   if p_payload->>'fingerprint' is distinct from m.fingerprint or exists(select 1 from public.supplementary_resource_versions where resource_id=m.resource_id and version_no>m.version_no) then raise exception 'resource_conflict';end if;
   if p_action in ('publish','withdraw') and not teacher and p_aal<>'aal2' then raise exception 'resource_mfa_required';end if;
  end if;
  reason:=btrim(coalesce(p_payload->>'reason',''));
  if p_action='revise' then
   if length(reason) not between 1 and 2000 then raise exception 'resource_reason_required';end if;
   perform private.supplementary_definition(p_payload->'definition',teacher);
   insert into public.supplementary_resource_versions(resource_id,version_no,subject_program_id,curriculum_release_id,unit_id,assignment_id,provider,created_by,definition,fingerprint)
    values(m.resource_id,m.version_no+1,m.subject_program_id,rel,unt,m.assignment_id,m.provider,p_actor_id,p_payload->'definition','') returning * into n;
   insert into public.supplementary_resource_events(version_id,actor_id,event,actor_aal,detail) values(n.id,p_actor_id,'revised',p_aal,jsonb_build_object('from',m.id,'reason',reason));m:=n;
  elsif p_action in ('upload_check','attach','qa') then
   if m.status<>'draft' then raise exception 'resource_read_only';end if;
   if p_action in ('upload_check','attach') then
    if m.definition->>'format'<>'pdf' or m.object_path is not null then raise exception 'resource_conflict';end if;
    if p_action='attach' then
     if p_payload->>'objectPath' !~ ('^'||m.id::text||'/[0-9a-f-]{36}\.pdf$') or p_payload->>'objectPath' is null
      or (p_payload->>'fileBytes')::integer not between 1 and 5242880 or p_payload->>'fileBytes' is null
      or p_payload->>'fileSha256' !~ '^[a-f0-9]{64}$' or p_payload->>'fileSha256' is null then raise exception 'resource_file_invalid';end if;
     update public.supplementary_resource_versions set object_path=p_payload->>'objectPath',file_bytes=(p_payload->>'fileBytes')::integer,file_sha256=p_payload->>'fileSha256',qa=null where id=m.id returning * into m;
     insert into public.supplementary_resource_events(version_id,actor_id,event,actor_aal) values(m.id,p_actor_id,'file_attached',p_aal);
    end if;
   else
    perform private.supplementary_definition(m.definition,teacher);issues:=case when m.definition->>'format'='pdf' and m.object_path is null then '["file_required"]'::jsonb else '[]'::jsonb end;
    update public.supplementary_resource_versions set qa=jsonb_build_object('passed',issues='[]'::jsonb,'issues',issues,'fingerprint',m.fingerprint,'checkedAt',clock_timestamp()) where id=m.id returning * into m;
    insert into public.supplementary_resource_events(version_id,actor_id,event,actor_aal,detail) values(m.id,p_actor_id,'qa',p_aal,m.qa);
   end if;
  elsif p_action='publish' and m.status<>'published' then
   if m.status<>'draft' then raise exception 'resource_read_only';end if;
   if m.qa->>'passed' is distinct from 'true' or m.qa->>'fingerprint' is distinct from m.fingerprint then raise exception 'resource_qa_required';end if;
   with old as (update public.supplementary_resource_versions set status='superseded' where resource_id=m.resource_id and status='published' returning id)
    insert into public.supplementary_resource_events(version_id,actor_id,event,actor_aal,detail) select id,p_actor_id,'superseded',p_aal,jsonb_build_object('replacement',m.id) from old;
   update public.supplementary_resource_versions set status='published',published_at=clock_timestamp() where id=m.id returning * into m;
   insert into public.supplementary_resource_events(version_id,actor_id,event,actor_aal) values(m.id,p_actor_id,'published',p_aal);
  elsif p_action='withdraw' then
   if length(reason) not between 1 and 2000 then raise exception 'resource_reason_required';end if;
   -- Withdraw the logical resource, including its published predecessor while a revision is pending.
   with old as (update public.supplementary_resource_versions set status='withdrawn' where resource_id=m.resource_id and status in ('draft','published') returning id)
    insert into public.supplementary_resource_events(version_id,actor_id,event,actor_aal,detail) select id,p_actor_id,'withdrawn',p_aal,jsonb_build_object('reason',reason) from old;
   select * into m from public.supplementary_resource_versions where id=m.id;
  end if;
  result:=jsonb_build_object('material',private.supplementary_public(m)||case when is_student then '{}'::jsonb else jsonb_build_object('definition',m.definition,'qa',m.qa) end);
  if p_action='get' and not is_student then
   result:=result||jsonb_build_object('history',(select coalesce(jsonb_agg(private.supplementary_public(v) order by v.version_no desc),'[]') from public.supplementary_resource_versions v where v.resource_id=m.resource_id),
    'events',(select coalesce(jsonb_agg(jsonb_build_object('event',ev.event,'version',v.version_no,'at',ev.created_at,'detail',ev.detail) order by ev.created_at desc),'[]') from public.supplementary_resource_events ev join public.supplementary_resource_versions v on v.id=ev.version_id where v.resource_id=m.resource_id));
  end if;
  if p_action='open' then
   if m.definition->>'format'='pdf' and m.object_path is null then raise exception 'resource_unavailable';end if;
   result:=result||jsonb_build_object('delivery',jsonb_build_object('path',m.object_path,'sha256',m.file_sha256,'bytes',m.file_bytes,'url',m.definition->>'url'));
  end if;
 end if;
 perform private.supplementary_context(p_actor_id,p_auth_session_id,role_name,p_context);
 perform private.supplementary_session(p_actor_id,p_auth_session_id);
 return result;
end;$$;

revoke all on function private.service_supplementary_resources(uuid,uuid,text,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function private.service_supplementary_resources(uuid,uuid,text,text,jsonb,jsonb) to service_role;
commit;
