-- Teacher-owned authoring drafts. No curriculum task, learner work or release is created.
create table public.teacher_task_drafts (
 id uuid primary key default gen_random_uuid(),
 created_by uuid not null references public.profiles(id) on delete cascade,
 teacher_assignment_id uuid not null references public.teacher_assignments(id),
 school_id uuid not null references public.schools(id),
 academic_year_id uuid not null references public.academic_years(id),
 class_id uuid not null references public.classes(id),
 subject_program_id uuid not null references public.subject_programs(id),
 curriculum_release_id uuid not null, unit_id uuid not null,
 request_id uuid not null,
 initial_definition jsonb not null,
 definition jsonb not null,
 revision integer not null default 1 check(revision>0),
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 unique(created_by,request_id),
 foreign key(curriculum_release_id,unit_id) references public.curriculum_release_units(curriculum_release_id,unit_id),
 check(jsonb_typeof(definition)='object' and definition->>'schemaVersion'='teacher-task-v1' and octet_length(definition::text)<=100000)
);
create index teacher_task_drafts_context on public.teacher_task_drafts(teacher_assignment_id,curriculum_release_id,unit_id,updated_at desc,id);
create index teacher_task_drafts_school on public.teacher_task_drafts(school_id);
create index teacher_task_drafts_year on public.teacher_task_drafts(academic_year_id);
create index teacher_task_drafts_class on public.teacher_task_drafts(class_id);
create index teacher_task_drafts_programme on public.teacher_task_drafts(subject_program_id);
create index teacher_task_drafts_release_unit on public.teacher_task_drafts(curriculum_release_id,unit_id);
alter table public.teacher_task_drafts enable row level security;
revoke all on public.teacher_task_drafts from public,anon,authenticated,service_role;
create function private.service_teacher_task_drafts(p_actor uuid,p_auth uuid,p_action text,p_context jsonb,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' set timezone='UTC' as $$
#variable_conflict use_column
declare ctx jsonb; d public.teacher_task_drafts%rowtype; result jsonb; entries jsonb; off integer;
 ta uuid:=(p_context->>'assignmentId')::uuid; rel uuid:=(p_context->>'curriculumReleaseId')::uuid; unt uuid:=(p_context->>'unitId')::uuid;
begin
 if jsonb_typeof(p_context) is distinct from 'object' or jsonb_typeof(p_payload) is distinct from 'object'
 or ta is null or rel is null or unt is null or exists(select 1 from jsonb_object_keys(p_context) k where k not in ('assignmentId','curriculumReleaseId','unitId'))
 or p_action not in ('create','save','get','list') then raise exception 'task_draft_invalid';end if;
 ctx:=private.lock_written_teacher_context(p_actor,p_auth,ta,rel,unt,p_action in ('create','save'));
 if p_action='create' then
  if exists(select 1 from jsonb_object_keys(p_payload) k where k not in ('requestId','definition')) or p_payload->>'requestId' is null
   or jsonb_typeof(p_payload->'definition') is distinct from 'object' then raise exception 'task_draft_invalid';end if;
  perform pg_advisory_xact_lock(hashtextextended('teacher-task-draft:'||p_actor::text||':'||(p_payload->>'requestId')::uuid::text,0));
  select * into d from public.teacher_task_drafts where created_by=p_actor and request_id=(p_payload->>'requestId')::uuid;
  if found then
   if d.teacher_assignment_id<>ta or d.curriculum_release_id<>rel or d.unit_id<>unt or d.initial_definition is distinct from p_payload->'definition' then raise exception 'task_draft_conflict';end if;
  else
   insert into public.teacher_task_drafts(created_by,teacher_assignment_id,school_id,academic_year_id,class_id,subject_program_id,curriculum_release_id,unit_id,request_id,initial_definition,definition)
   values(p_actor,ta,(ctx->>'schoolId')::uuid,(ctx->>'academicYearId')::uuid,(ctx->>'classId')::uuid,(ctx->>'subjectProgramId')::uuid,rel,unt,(p_payload->>'requestId')::uuid,p_payload->'definition',p_payload->'definition') returning * into d;
  end if;
 elsif p_action='list' then
  if exists(select 1 from jsonb_object_keys(p_payload) k where k<>'offset') then raise exception 'task_draft_invalid';end if;
  off:=coalesce((p_payload->>'offset')::integer,0);if off not between 0 and 100000 then raise exception 'task_draft_invalid';end if;
  select coalesce(jsonb_agg(entry order by updated_at desc,id),'[]') into entries from (
   select id,updated_at,jsonb_build_object('id',id,'title',definition->>'title','revision',revision,'updatedAt',updated_at) entry
   from public.teacher_task_drafts where created_by=p_actor and teacher_assignment_id=ta and curriculum_release_id=rel and unit_id=unt order by updated_at desc,id offset off limit 51) q;
  result:=jsonb_build_object('drafts',case when jsonb_array_length(entries)>50 then entries-50 else entries end,'hasMore',jsonb_array_length(entries)>50,'nextOffset',off+50);
 else
  if exists(select 1 from jsonb_object_keys(p_payload) k where k not in ('id','expectedRevision','definition')) then raise exception 'task_draft_invalid';end if;
  select * into d from public.teacher_task_drafts where id=(p_payload->>'id')::uuid and created_by=p_actor and teacher_assignment_id=ta and curriculum_release_id=rel and unit_id=unt for update;
  if not found then raise exception 'task_draft_unavailable';end if;
  if p_action='get' and p_payload<>jsonb_build_object('id',p_payload->'id') then raise exception 'task_draft_invalid';end if;
  if p_action='save' then
   if jsonb_typeof(p_payload->'expectedRevision') is distinct from 'number' or coalesce(p_payload->>'expectedRevision','')!~'^[0-9]+$' or jsonb_typeof(p_payload->'definition') is distinct from 'object' then raise exception 'task_draft_invalid';end if;
   -- An exact replay reconciles a lost acknowledgement, including a later revision.
   if d.definition is distinct from p_payload->'definition' then
    if d.revision<>(p_payload->>'expectedRevision')::integer then raise exception 'task_draft_conflict';end if;
    update public.teacher_task_drafts set definition=p_payload->'definition',revision=revision+1,updated_at=clock_timestamp() where id=d.id returning * into d;
   end if;
  end if;
 end if;
 perform private.lock_written_teacher_context(p_actor,p_auth,ta,rel,unt,p_action in ('create','save'));
 return jsonb_build_object('version','teacher-task-drafts-v1','readOnly',ctx->'readOnly')||coalesce(result,jsonb_build_object('draft',jsonb_build_object('id',d.id,'revision',d.revision,'definition',d.definition,'updatedAt',d.updated_at)));
exception when invalid_text_representation or numeric_value_out_of_range or check_violation then raise exception 'task_draft_invalid';
end;$$;
create function public.service_teacher_task_drafts(p_actor uuid,p_auth uuid,p_action text,p_context jsonb,p_payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private.service_teacher_task_drafts(p_actor,p_auth,p_action,p_context,p_payload);$$;
revoke all on function private.service_teacher_task_drafts(uuid,uuid,text,jsonb,jsonb),public.service_teacher_task_drafts(uuid,uuid,text,jsonb,jsonb) from public,anon,authenticated,service_role;
grant execute on function private.service_teacher_task_drafts(uuid,uuid,text,jsonb,jsonb),public.service_teacher_task_drafts(uuid,uuid,text,jsonb,jsonb) to service_role;
