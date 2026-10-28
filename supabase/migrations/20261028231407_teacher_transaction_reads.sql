-- Request-local composition only. Existing service-only readers retain their
-- authorization and exact evidence predicates; final live reads stay in Edge.
create function public.service_teacher_dashboard_initial(
 p_actor uuid,p_session uuid,p_class uuid default null,p_assignment uuid default null,p_release uuid default null,p_unit uuid default null
) returns jsonb language plpgsql stable security invoker set search_path='' set timezone='UTC' as $$
declare r jsonb; a jsonb; chosen jsonb; evidence jsonb;
begin
 if (p_release is null)<>(p_unit is null) then raise exception 'academic_context_unavailable' using errcode='42501';end if;
 r:=public.service_teacher_dashboard_rows(p_actor,p_session,p_class,p_assignment);
 if not (r->>'institutionalTeacher')::boolean then return jsonb_build_object('rows',r);end if;
 -- Rows already use the existing active/history assignment precedence. A
 -- selected class without an explicit assignment uses exactly its first row.
 a:=r->'assignments'->0;
 if a is not null then
  select jsonb_build_object('assignmentId',a->>'id','curriculumReleaseId',release_row->>'id','unitId',unit_row->>'id') into chosen
  from jsonb_array_elements(r->'releaseUnits') with ordinality links(link,ordinal)
  join jsonb_array_elements(r->'releases') releases(release_row) on release_row->>'id'=link->>'curriculum_release_id'
  join jsonb_array_elements(r->'units') units(unit_row) on unit_row->>'id'=link->>'unit_id'
  where release_row->>'subject_program_id'=a->>'subject_program_id' and unit_row->>'subject_program_id'=a->>'subject_program_id'
   and coalesce(link->>'unit_code_snapshot','')<>'' and coalesce(link->>'title_hy_snapshot','')<>''
   and (p_release is null or (release_row->>'id'=p_release::text and unit_row->>'id'=p_unit::text))
  -- Same governed ordering as the canonical teacher projection. Ordinality
  -- preserves its stable tie order. Edge independently checks the chosen tuple.
  order by not (release_row->>'status' in('pilot','production')
   and (release_row->>'effective_from' is null or release_row->>'effective_from'<=current_date::text)
   and (release_row->>'effective_to' is null or current_date::text<=release_row->>'effective_to')),
   coalesce((link->>'sequence_order_snapshot')::numeric,0), (release_row->>'release_number')::numeric desc, ordinal
  limit 1;
 end if;
 if chosen is not null then
  evidence:=public.service_teacher_dashboard_evidence(p_actor,p_session,(chosen->>'assignmentId')::uuid,(chosen->>'curriculumReleaseId')::uuid,(chosen->>'unitId')::uuid);
 end if;
 return jsonb_build_object('rows',r,'selected',chosen,'evidence',evidence);
end;$$;
revoke all on function public.service_teacher_dashboard_initial(uuid,uuid,uuid,uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.service_teacher_dashboard_initial(uuid,uuid,uuid,uuid,uuid,uuid) to service_role;

create function public.service_teacher_dashboard_home(p_actor uuid,p_session uuid,p_workspace jsonb default '{}')
returns jsonb language plpgsql stable security invoker set search_path='' set timezone='UTC' as $$
declare result jsonb; workspace jsonb;
begin
 result:=public.service_teacher_dashboard_directory(p_actor,p_session,false,0,'');
 -- Today failure remains an explicit unknown/denied state, without hiding the
 -- otherwise authorized class directory. Never turn a failed read into zero.
 begin
  workspace:=public.service_teacher_workspace(p_actor,p_session,(p_workspace->>'assignmentId')::uuid,nullif(p_workspace->'cursor','null'::jsonb),
   (p_workspace->>'workId')::uuid,coalesce(p_workspace->'recent','[]'::jsonb));
  result:=result||jsonb_build_object('workspace',workspace);
 exception when insufficient_privilege then
  result:=result||jsonb_build_object('workspaceError','workspace_context_unavailable');
 when others then
  result:=result||jsonb_build_object('workspaceError','workspace_unavailable');
 end;
 return result;
end;$$;
revoke all on function public.service_teacher_dashboard_home(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.service_teacher_dashboard_home(uuid,uuid,jsonb) to service_role;
