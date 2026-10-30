-- Private teacher source PDFs; no learner upload or response access is enabled.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('teacher-task-files','teacher-task-files',false,10485760,array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document']) on conflict(id) do nothing;
do $$begin if exists(select 1 from storage.buckets where id='teacher-task-files' and (public or file_size_limit is distinct from 10485760::bigint)) then raise exception 'task_source_bucket_configuration_conflict';end if;end;$$;
create table public.teacher_task_source_files (
 id uuid primary key default gen_random_uuid(),
 draft_id uuid not null references public.teacher_task_drafts(id) on delete cascade,
 created_by uuid not null references public.profiles(id) on delete cascade,
 request_id uuid not null,
 file_sha256 text not null check(file_sha256~'^[a-f0-9]{64}$'),
 file_bytes integer not null check(file_bytes between 1 and 10485760),
 object_path text not null unique,
 upload_lease_until timestamptz not null default (clock_timestamp()+interval '15 minutes'),
 status text not null default 'pending' check(status in ('pending','ready')),
 created_at timestamptz not null default clock_timestamp(),
 unique(created_by,request_id)
);
create index teacher_task_source_files_draft on public.teacher_task_source_files(draft_id,created_at desc,id);
alter table public.teacher_task_source_files enable row level security;
revoke all on public.teacher_task_source_files from public,anon,authenticated,service_role;
create function private.teacher_task_source_guard() returns trigger language plpgsql set search_path='' as $$begin
 if tg_op='UPDATE' and (to_jsonb(new)-'status'-'upload_lease_until')=(to_jsonb(old)-'status'-'upload_lease_until') and new.upload_lease_until>=old.upload_lease_until and new.upload_lease_until<=greatest(old.upload_lease_until,clock_timestamp()+interval '15 minutes 5 seconds') and (new.status=old.status or old.status='pending' and new.status='ready') then return new;end if;
 raise exception 'task_source_immutable';end;$$;
create trigger teacher_task_source_immutable before update on public.teacher_task_source_files for each row execute function private.teacher_task_source_guard();
create function private.teacher_task_draft_source_guard() returns trigger language plpgsql set search_path='' as $$
declare asset uuid;
begin
 if new.definition->'source'->>'kind'='pdf' and new.definition->'source'->>'attachmentId' is not null then
  asset:=(new.definition->'source'->>'attachmentId')::uuid;
  -- Reuse immutable bytes only within the same owner's exact governed context.
  perform a.id from public.teacher_task_source_files a join public.teacher_task_drafts origin on origin.id=a.draft_id
   where a.id=asset and a.created_by=new.created_by and a.status='ready' and origin.created_by=new.created_by
   and origin.teacher_assignment_id=new.teacher_assignment_id and origin.curriculum_release_id=new.curriculum_release_id and origin.unit_id=new.unit_id for key share of a;
  if not found then raise exception 'task_draft_invalid';end if;
 end if;return new;end;$$;
create trigger teacher_task_draft_source before insert or update of definition on public.teacher_task_drafts for each row execute function private.teacher_task_draft_source_guard();
create function private.service_teacher_task_sources(p_actor uuid,p_auth uuid,p_action text,p_context jsonb,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' set timezone='UTC' as $$
#variable_conflict use_column
declare ctx jsonb; d public.teacher_task_drafts%rowtype; a public.teacher_task_source_files%rowtype; asset_id uuid;
 ta uuid:=(p_context->>'assignmentId')::uuid; rel uuid:=(p_context->>'curriculumReleaseId')::uuid; unt uuid:=(p_context->>'unitId')::uuid;
begin
 if jsonb_typeof(p_context) is distinct from 'object' or jsonb_typeof(p_payload) is distinct from 'object' or ta is null or rel is null or unt is null
 or exists(select 1 from jsonb_object_keys(p_context) k where k not in ('assignmentId','curriculumReleaseId','unitId')) or p_action not in ('reserve','ready','open') then raise exception 'task_source_invalid';end if;
 ctx:=private.lock_written_teacher_context(p_actor,p_auth,ta,rel,unt,p_action<>'open');
 if p_action='reserve' then
  if exists(select 1 from jsonb_object_keys(p_payload) k where k not in ('draftId','requestId','sha256','bytes')) or p_payload->>'requestId' is null
   or coalesce(p_payload->>'sha256','')!~'^[a-f0-9]{64}$' or jsonb_typeof(p_payload->'bytes') is distinct from 'number' or coalesce(p_payload->>'bytes','')!~'^[0-9]+$' or (p_payload->>'bytes')::numeric not between 1 and 10485760 then raise exception 'task_source_invalid';end if;
  select * into d from public.teacher_task_drafts where id=(p_payload->>'draftId')::uuid and created_by=p_actor and teacher_assignment_id=ta and curriculum_release_id=rel and unit_id=unt for update;
  if not found then raise exception 'task_source_unavailable';end if;
  if d.definition->'source'->>'kind' is distinct from 'pdf' then raise exception 'task_source_invalid';end if;
  perform pg_advisory_xact_lock(hashtextextended('task-source:'||p_actor::text||':'||(p_payload->>'requestId')::uuid::text,0));
  select * into a from public.teacher_task_source_files where created_by=p_actor and request_id=(p_payload->>'requestId')::uuid;
  if found then
   if a.draft_id<>d.id or a.file_sha256<>p_payload->>'sha256' or a.file_bytes<>(p_payload->>'bytes')::integer then raise exception 'task_source_conflict';end if;
  else
   asset_id:=gen_random_uuid();insert into public.teacher_task_source_files(id,draft_id,created_by,request_id,file_sha256,file_bytes,object_path)
    values(asset_id,d.id,p_actor,(p_payload->>'requestId')::uuid,p_payload->>'sha256',(p_payload->>'bytes')::integer,d.id::text||'/'||asset_id::text||'.pdf') returning * into a;
  end if;
  if a.status='pending' then update public.teacher_task_source_files set upload_lease_until=greatest(upload_lease_until,clock_timestamp()+interval '15 minutes') where id=a.id returning * into a;end if;
 else
  if p_payload<>jsonb_build_object('id',p_payload->'id') then raise exception 'task_source_invalid';end if;
  select * into a from public.teacher_task_source_files where id=(p_payload->>'id')::uuid and created_by=p_actor for update;
  if not found then raise exception 'task_source_unavailable';end if;
  select * into d from public.teacher_task_drafts where id=a.draft_id and created_by=p_actor and teacher_assignment_id=ta and curriculum_release_id=rel and unit_id=unt for share;
  if not found then raise exception 'task_source_unavailable';end if;
  if p_action='ready' then
   if d.definition->'source'->>'kind' is distinct from 'pdf' then raise exception 'task_source_invalid';end if;
   update public.teacher_task_source_files set status='ready' where id=a.id returning * into a;
  elsif a.status<>'ready' then raise exception 'task_source_unavailable';end if;
 end if;
 perform private.lock_written_teacher_context(p_actor,p_auth,ta,rel,unt,p_action<>'open');
 return jsonb_build_object('id',a.id,'draftId',a.draft_id,'path',a.object_path,'sha256',a.file_sha256,'bytes',a.file_bytes,'status',a.status);
exception when invalid_text_representation or numeric_value_out_of_range then raise exception 'task_source_invalid';end;$$;
create function public.service_teacher_task_sources(p_actor uuid,p_auth uuid,p_action text,p_context jsonb,p_payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private.service_teacher_task_sources(p_actor,p_auth,p_action,p_context,p_payload);$$;
revoke all on function private.teacher_task_source_guard(),private.teacher_task_draft_source_guard(),private.service_teacher_task_sources(uuid,uuid,text,jsonb,jsonb),public.service_teacher_task_sources(uuid,uuid,text,jsonb,jsonb) from public,anon,authenticated,service_role;
grant execute on function private.service_teacher_task_sources(uuid,uuid,text,jsonb,jsonb),public.service_teacher_task_sources(uuid,uuid,text,jsonb,jsonb) to service_role;
