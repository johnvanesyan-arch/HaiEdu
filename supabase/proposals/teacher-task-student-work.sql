-- Isolated proposal; not a production migration. Review/return/cancellation,
-- privacy/retention and endpoint deployment remain separate release gates.
create table public.teacher_task_student_work (
 delivery_id uuid not null, enrollment_id uuid not null,
 student_id uuid not null references public.profiles(id),
 revision integer not null check(revision>0),
 state text not null check(state in ('draft','submitted')),
 content jsonb not null,
 updated_at timestamptz not null default clock_timestamp(),
 primary key(delivery_id,enrollment_id),
 foreign key(delivery_id,enrollment_id) references public.teacher_task_delivery_recipients(delivery_id,enrollment_id)
);
create index teacher_task_student_work_student on public.teacher_task_student_work(student_id);
create table public.teacher_task_response_files (
 id uuid primary key default gen_random_uuid(),
 delivery_id uuid not null, enrollment_id uuid not null,
 student_id uuid not null references public.profiles(id),
 request_id uuid not null,
 format text not null check(format in ('pdf','docx')),
 file_sha256 text not null check(file_sha256~'^[a-f0-9]{64}$'),
 file_bytes integer not null check(file_bytes between 1 and 10485760),
 object_path text not null unique,
 status text not null default 'pending' check(status in ('pending','ready')),
 created_at timestamptz not null default clock_timestamp(),
 unique(student_id,request_id),
 foreign key(delivery_id,enrollment_id) references public.teacher_task_delivery_recipients(delivery_id,enrollment_id)
);
create index teacher_task_response_files_context on public.teacher_task_response_files(delivery_id,enrollment_id);
create table public.teacher_task_submissions (
 id uuid primary key default gen_random_uuid(),
 delivery_id uuid not null, enrollment_id uuid not null,
 student_id uuid not null references public.profiles(id),
 request_id uuid not null, request_hash text not null,
 content jsonb not null,
 file_id uuid references public.teacher_task_response_files(id),
 submitted_at timestamptz not null default clock_timestamp(),
 unique(student_id,request_id),
 foreign key(delivery_id,enrollment_id) references public.teacher_task_student_work(delivery_id,enrollment_id)
);
create index teacher_task_submissions_work on public.teacher_task_submissions(delivery_id,enrollment_id,submitted_at,id);
create index teacher_task_submissions_student on public.teacher_task_submissions(student_id);
create index teacher_task_submissions_file on public.teacher_task_submissions(file_id);
create table public.teacher_task_work_events (
 id uuid primary key default gen_random_uuid(),
 submission_id uuid not null references public.teacher_task_submissions(id),
 actor_id uuid not null references public.profiles(id),
 event text not null check(event='submitted'),
 created_at timestamptz not null default clock_timestamp()
);
create index teacher_task_work_events_submission on public.teacher_task_work_events(submission_id);
create index teacher_task_work_events_actor on public.teacher_task_work_events(actor_id);
alter table public.teacher_task_student_work enable row level security;
alter table public.teacher_task_response_files enable row level security;
alter table public.teacher_task_submissions enable row level security;
alter table public.teacher_task_work_events enable row level security;
revoke all on public.teacher_task_student_work,public.teacher_task_response_files,public.teacher_task_submissions,public.teacher_task_work_events from public,anon,authenticated,service_role;
create function private.teacher_task_work_guard() returns trigger language plpgsql set search_path='' as $$begin
 if tg_op='DELETE' or old.state='submitted' or new.delivery_id<>old.delivery_id or new.enrollment_id<>old.enrollment_id or new.student_id<>old.student_id or new.revision<>old.revision+1 then raise exception 'task_work_immutable';end if;return new;end;$$;
create trigger teacher_task_work_guard before update or delete on public.teacher_task_student_work for each row execute function private.teacher_task_work_guard();
create function private.teacher_task_response_file_guard() returns trigger language plpgsql set search_path='' as $$begin
 if tg_op='UPDATE' and (to_jsonb(new)-'status')=(to_jsonb(old)-'status') and (new.status=old.status or old.status='pending' and new.status='ready') then return new;end if;raise exception 'task_file_immutable';end;$$;
create trigger teacher_task_response_file_guard before update or delete on public.teacher_task_response_files for each row execute function private.teacher_task_response_file_guard();
create trigger teacher_task_submission_immutable before update or delete on public.teacher_task_submissions for each row execute function private.teacher_task_delivery_immutable();
create trigger teacher_task_work_event_immutable before update or delete on public.teacher_task_work_events for each row execute function private.teacher_task_delivery_immutable();

-- Derive all tenant/course identity from the actual recipient and pinned delivery.
-- Client URL parameters select a context; they never confer access.
create function private.teacher_task_student_context(p_actor uuid,p_auth uuid,p_id uuid,p_context jsonb) returns jsonb
language plpgsql set search_path='' as $$
declare a public.teacher_task_deliveries%rowtype; e public.institutional_class_enrollments%rowtype;
begin
 if private.supplementary_session(p_actor,p_auth)<>'student' or jsonb_typeof(p_context) is distinct from 'object'
 or (select count(*) from jsonb_object_keys(p_context))<>3 or exists(select 1 from jsonb_object_keys(p_context) k where k not in ('enrollmentId','curriculumReleaseId','unitId')) then raise exception 'task_work_forbidden';end if;
 select * into a from public.teacher_task_deliveries where id=p_id and curriculum_release_id=(p_context->>'curriculumReleaseId')::uuid and unit_id=(p_context->>'unitId')::uuid;
 if not found or not exists(select 1 from public.teacher_task_delivery_recipients where delivery_id=p_id and enrollment_id=(p_context->>'enrollmentId')::uuid and student_id=p_actor) then raise exception 'task_work_unavailable';end if;
 e:=private.lock_student_learning_context(p_actor,p_auth,(p_context->>'enrollmentId')::uuid,a.curriculum_release_id,a.unit_id);
 if e.teacher_assignment_id<>a.teacher_assignment_id then raise exception 'task_work_unavailable';end if;
 return jsonb_build_object('id',a.id,'taskVersionId',a.task_version_id,'context',p_context,'sentAt',a.created_at,
 'className',(select name from public.classes where id=e.class_id),
 'schoolName',(select name from public.schools where id=e.school_id),
 'subjectName',(select s.name_hy from public.subject_programs sp join public.subjects s on s.id=sp.subject_id where sp.id=e.subject_program_id),
 'unitTitle',(select title_hy_snapshot from public.curriculum_release_units where curriculum_release_id=a.curriculum_release_id and unit_id=a.unit_id),
 'teacherName',(select display_name from public.profiles where id=a.created_by));
end;$$;
create function private.teacher_task_content_valid(p_actor uuid,p_id uuid,p_enrollment uuid,p_definition jsonb,p_content jsonb,p_complete boolean) returns boolean
language plpgsql set search_path='' as $$
declare kind text:=p_definition->'response'->>'kind'; value text;
begin
 if jsonb_typeof(p_content) is distinct from 'object' or p_content->>'kind' is distinct from kind then return false;end if;
 if kind='text' then
  return not exists(select 1 from jsonb_object_keys(p_content) k where k not in ('kind','text')) and jsonb_typeof(p_content->'text')='string' and length(p_content->>'text')<=20000 and (not p_complete or length(btrim(p_content->>'text'))>0);
 elsif kind='link' then
  value:=p_content->>'url';
  return not exists(select 1 from jsonb_object_keys(p_content) k where k not in ('kind','url')) and jsonb_typeof(p_content->'url')='string' and length(value)<=2048 and (not p_complete or value~'^https://[^[:space:]]+$');
 elsif kind='document' then
  if exists(select 1 from jsonb_object_keys(p_content) k where k not in ('kind','fileId')) then return false;end if;
  if not p_complete and p_content->'fileId'='null'::jsonb then return true;end if;
  return exists(select 1 from public.teacher_task_response_files f where f.id=(p_content->>'fileId')::uuid and f.delivery_id=p_id and f.enrollment_id=p_enrollment and f.student_id=p_actor and f.status='ready' and p_definition->'response'->'allowedFormats' ? f.format);
 end if;return false;
exception when invalid_text_representation then return false;
end;$$;
create function private.teacher_task_work_public(p_id uuid,p_enrollment uuid) returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('revision',coalesce(w.revision,0),'state',coalesce(w.state,'not_started'),'content',w.content,'document',(select jsonb_build_object('id',f.id,'format',f.format,'bytes',f.file_bytes) from public.teacher_task_response_files f where f.id=case when w.content->>'kind'='document' then (w.content->>'fileId')::uuid end and f.delivery_id=p_id and f.enrollment_id=p_enrollment),
 'submissions',(select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'content',s.content,'submittedAt',s.submitted_at) order by s.submitted_at,s.id),'[]') from public.teacher_task_submissions s where s.delivery_id=p_id and s.enrollment_id=p_enrollment))
 from (values(1)) seed(n) left join public.teacher_task_student_work w on w.delivery_id=p_id and w.enrollment_id=p_enrollment;
$$;
create function private.service_teacher_task_student_work(p_actor uuid,p_auth uuid,p_action text,p_context jsonb,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' set timezone='UTC' as $$
#variable_conflict use_column
declare ctx jsonb; definition jsonb; result jsonb; item jsonb; entries jsonb:='[]'; r record; off integer; n integer:=0;
 task_id uuid:=(p_payload->>'id')::uuid; enr uuid; w public.teacher_task_student_work%rowtype; s public.teacher_task_submissions%rowtype;
 f public.teacher_task_response_files%rowtype; source public.teacher_task_source_files%rowtype; file_id uuid; request_hash text;
begin
 if private.supplementary_session(p_actor,p_auth)<>'student' or jsonb_typeof(p_payload) is distinct from 'object' or jsonb_typeof(p_context) is distinct from 'object' or p_action not in ('inbox','open','save','submit','reserve_file','ready_file','open_file','source') then raise exception 'task_work_forbidden';end if;
 if p_action='inbox' then
  if p_context<>'{}' or exists(select 1 from jsonb_object_keys(p_payload) k where k<>'offset') then raise exception 'task_work_invalid';end if;
  off:=coalesce((p_payload->>'offset')::integer,0);if off not between 0 and 100000 then raise exception 'task_work_invalid';end if;
  for r in select a.id,a.task_version_id,a.curriculum_release_id,a.unit_id,rp.enrollment_id from public.teacher_task_delivery_recipients rp join public.teacher_task_deliveries a on a.id=rp.delivery_id where rp.student_id=p_actor order by a.created_at desc,a.id,rp.enrollment_id offset off limit 51 loop
   n:=n+1;if n=51 then exit;end if;
   begin
    item:=private.teacher_task_student_context(p_actor,p_auth,r.id,jsonb_build_object('enrollmentId',r.enrollment_id,'curriculumReleaseId',r.curriculum_release_id,'unitId',r.unit_id));
   exception when raise_exception then if sqlerrm not in ('task_work_unavailable','learning_context_unavailable') then raise;end if;continue;end;
   select v.definition into definition from public.teacher_task_versions v where v.id=r.task_version_id;
   entries:=entries||jsonb_build_array(item||jsonb_build_object('title',definition->>'title','response',definition->'response','state',coalesce((select state from public.teacher_task_student_work where delivery_id=r.id and enrollment_id=r.enrollment_id),'not_started')));
  end loop;
  for item in select value from jsonb_array_elements(entries) loop perform private.teacher_task_student_context(p_actor,p_auth,(item->>'id')::uuid,item->'context');end loop;
  return jsonb_build_object('version','teacher-task-student-work-v1','assignments',entries,'hasMore',n>50,'nextOffset',off+50);
 end if;
 ctx:=private.teacher_task_student_context(p_actor,p_auth,task_id,p_context);enr:=(p_context->>'enrollmentId')::uuid;
 select v.definition into strict definition from public.teacher_task_versions v where v.id=(ctx->>'taskVersionId')::uuid;
 -- One lock covers draft creation/save, submit and upload state transitions.
 perform pg_advisory_xact_lock(hashtextextended('teacher-task-work:'||task_id::text||':'||enr::text,0));
 select * into w from public.teacher_task_student_work where delivery_id=task_id and enrollment_id=enr for update;
 if p_action='source' then
  if p_payload<>jsonb_build_object('id',p_payload->'id') then raise exception 'task_work_invalid';end if;
  select f.* into source from public.teacher_task_source_files f join public.teacher_task_versions v on v.source_file_id=f.id where v.id=(ctx->>'taskVersionId')::uuid and f.status='ready';
  if not found then raise exception 'task_file_unavailable';end if;
  result:=jsonb_build_object('file',jsonb_build_object('path',source.object_path,'sha256',source.file_sha256,'bytes',source.file_bytes,'format','pdf'));
 elsif p_action in ('reserve_file','ready_file','open_file') then
  if p_action='reserve_file' then
   if exists(select 1 from jsonb_object_keys(p_payload) k where k not in ('id','requestId','sha256','bytes','format')) or p_payload->>'requestId' is null or coalesce(p_payload->>'sha256','')!~'^[a-f0-9]{64}$' or jsonb_typeof(p_payload->'bytes') is distinct from 'number' or coalesce(p_payload->>'bytes','')!~'^[0-9]+$' or (p_payload->>'bytes')::numeric not between 1 and 10485760 then raise exception 'task_work_invalid';end if;
   if definition->'response'->>'kind'<>'document' or not(definition->'response'->'allowedFormats' ? (p_payload->>'format')) then raise exception 'task_work_format';end if;
   if w.state='submitted' then raise exception 'task_work_locked';end if;
   perform pg_advisory_xact_lock(hashtextextended('task-response-file:'||p_actor::text||':'||(p_payload->>'requestId')::uuid::text,0));
   select * into f from public.teacher_task_response_files where student_id=p_actor and request_id=(p_payload->>'requestId')::uuid;
   if found then
    if f.delivery_id<>task_id or f.enrollment_id<>enr or f.file_sha256<>p_payload->>'sha256' or f.file_bytes<>(p_payload->>'bytes')::integer or f.format<>p_payload->>'format' then raise exception 'task_work_conflict';end if;
   else
    file_id:=gen_random_uuid();insert into public.teacher_task_response_files(id,delivery_id,enrollment_id,student_id,request_id,format,file_sha256,file_bytes,object_path)
     values(file_id,task_id,enr,p_actor,(p_payload->>'requestId')::uuid,p_payload->>'format',p_payload->>'sha256',(p_payload->>'bytes')::integer,'responses/'||task_id::text||'/'||file_id::text||'.'||(p_payload->>'format')) returning * into f;
   end if;
  else
   if p_payload<>jsonb_build_object('id',p_payload->'id','fileId',p_payload->'fileId') then raise exception 'task_work_invalid';end if;
   select * into f from public.teacher_task_response_files where id=(p_payload->>'fileId')::uuid and delivery_id=task_id and enrollment_id=enr and student_id=p_actor for update;
   if not found then raise exception 'task_file_unavailable';end if;
   if p_action='ready_file' then
    if w.state='submitted' then raise exception 'task_work_locked';end if;
    update public.teacher_task_response_files set status='ready' where teacher_task_response_files.id=f.id returning * into f;
   elsif f.status<>'ready' then raise exception 'task_file_unavailable';end if;
  end if;
  result:=jsonb_build_object('file',jsonb_build_object('id',f.id,'path',f.object_path,'sha256',f.file_sha256,'bytes',f.file_bytes,'format',f.format,'status',f.status));
 elsif p_action in ('save','submit') then
  if exists(select 1 from jsonb_object_keys(p_payload) k where k not in ('id','expectedRevision','content','requestId')) or jsonb_typeof(p_payload->'expectedRevision') is distinct from 'number' or coalesce(p_payload->>'expectedRevision','')!~'^[0-9]+$' then raise exception 'task_work_invalid';end if;
  if not coalesce(private.teacher_task_content_valid(p_actor,task_id,enr,definition,p_payload->'content',p_action='submit'),false) then raise exception 'task_work_format';end if;
  if p_action='submit' then
   if p_payload->>'requestId' is null then raise exception 'task_work_invalid';end if;
   request_hash:=encode(sha256(convert_to(jsonb_build_array(p_context,p_payload)::text,'UTF8')),'hex');
   perform pg_advisory_xact_lock(hashtextextended('task-submit:'||p_actor::text||':'||(p_payload->>'requestId')::uuid::text,0));
   select * into s from public.teacher_task_submissions where student_id=p_actor and request_id=(p_payload->>'requestId')::uuid;
   if found then
    if s.request_hash<>request_hash then raise exception 'task_work_conflict';end if;
    result:=jsonb_build_object('receipt',jsonb_build_object('id',s.id,'submittedAt',s.submitted_at),'replayed',true);
   end if;
  elsif p_payload ? 'requestId' then raise exception 'task_work_invalid';end if;
  if result is null then
   if w.state='submitted' then raise exception 'task_work_locked';end if;
   if p_action='save' and w.content is not distinct from p_payload->'content' then null;
   else
    if coalesce(w.revision,0)<>(p_payload->>'expectedRevision')::integer then raise exception 'task_work_conflict';end if;
    if p_action='submit' then
     if w.content is distinct from p_payload->'content' then raise exception 'task_work_conflict';end if;
     insert into public.teacher_task_submissions(delivery_id,enrollment_id,student_id,request_id,request_hash,content,file_id)
      values(task_id,enr,p_actor,(p_payload->>'requestId')::uuid,request_hash,w.content,case when w.content->>'kind'='document' then (w.content->>'fileId')::uuid end) returning * into s;
     update public.teacher_task_student_work set state='submitted',revision=revision+1,updated_at=clock_timestamp() where delivery_id=task_id and enrollment_id=enr;
     insert into public.teacher_task_work_events(submission_id,actor_id,event) values(s.id,p_actor,'submitted');
     result:=jsonb_build_object('receipt',jsonb_build_object('id',s.id,'submittedAt',s.submitted_at),'replayed',false);
    elsif w.delivery_id is null then
     insert into public.teacher_task_student_work(delivery_id,enrollment_id,student_id,revision,state,content) values(task_id,enr,p_actor,1,'draft',p_payload->'content');
    else
     update public.teacher_task_student_work set content=p_payload->'content',revision=revision+1,updated_at=clock_timestamp() where delivery_id=task_id and enrollment_id=enr;
    end if;
   end if;
  end if;
 elsif p_action='open' then
  if p_payload<>jsonb_build_object('id',p_payload->'id') then raise exception 'task_work_invalid';end if;
 else raise exception 'task_work_invalid';end if;
 perform private.teacher_task_student_context(p_actor,p_auth,task_id,p_context);
 if p_action in ('open','save','submit') then result:=coalesce(result,'{}')||jsonb_build_object('assignment',ctx||jsonb_build_object('definition',definition),'work',private.teacher_task_work_public(task_id,enr));end if;
 return jsonb_build_object('version','teacher-task-student-work-v1')||result;
exception when invalid_text_representation or numeric_value_out_of_range then raise exception 'task_work_invalid';
end;$$;
create function public.service_teacher_task_student_work(p_actor uuid,p_auth uuid,p_action text,p_context jsonb,p_payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private.service_teacher_task_student_work(p_actor,p_auth,p_action,p_context,p_payload);$$;
revoke all on function private.teacher_task_work_guard(),private.teacher_task_response_file_guard(),private.teacher_task_student_context(uuid,uuid,uuid,jsonb),private.teacher_task_content_valid(uuid,uuid,uuid,jsonb,jsonb,boolean),private.teacher_task_work_public(uuid,uuid),private.service_teacher_task_student_work(uuid,uuid,text,jsonb,jsonb),public.service_teacher_task_student_work(uuid,uuid,text,jsonb,jsonb) from public,anon,authenticated,service_role;
grant execute on function private.service_teacher_task_student_work(uuid,uuid,text,jsonb,jsonb),public.service_teacher_task_student_work(uuid,uuid,text,jsonb,jsonb) to service_role;
