-- Shared teacher feedback. Subject/rubric/task authority stays in the governed writing service.
create table private.teacher_feedback_drafts (
 teacher_id uuid not null references public.profiles(id) on delete cascade,
 work_id uuid not null references public.written_work(id) on delete cascade,
 submission_id uuid not null references public.written_submissions(id) on delete cascade,
 work_revision integer not null check(work_revision>=0), revision integer not null check(revision>0),
 data jsonb not null check(jsonb_typeof(data)='object'), updated_at timestamptz not null default now(),
 primary key(teacher_id,work_id)
);
create index teacher_feedback_drafts_work_idx on private.teacher_feedback_drafts(work_id);
create index teacher_feedback_drafts_submission_idx on private.teacher_feedback_drafts(submission_id);
create table private.teacher_feedback_snippets (
 id uuid primary key, teacher_id uuid not null references public.profiles(id) on delete cascade,
 title text not null check(length(btrim(title)) between 1 and 80), body text not null check(length(btrim(body)) between 1 and 2000),
 archived boolean not null default false, revision integer not null check(revision>0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index teacher_feedback_snippets_owner_idx on private.teacher_feedback_snippets(teacher_id,archived,updated_at desc,id);
create table private.teacher_feedback_receipts (
 teacher_id uuid not null references public.profiles(id) on delete cascade,
 request_id uuid not null, work_id uuid not null references public.written_work(id) on delete cascade,
 review_id uuid not null references public.written_reviews(id) on delete cascade,
 request_data jsonb not null, created_at timestamptz not null default now(), primary key(teacher_id,request_id)
);
create index teacher_feedback_receipts_work_idx on private.teacher_feedback_receipts(work_id);
create index teacher_feedback_receipts_review_idx on private.teacher_feedback_receipts(review_id);
alter table private.teacher_feedback_drafts enable row level security;
alter table private.teacher_feedback_snippets enable row level security;
alter table private.teacher_feedback_receipts enable row level security;
revoke all on private.teacher_feedback_drafts,private.teacher_feedback_snippets,private.teacher_feedback_receipts from public,anon,authenticated,service_role;

-- Work lock -> draft lock is shared by legacy writing, resubmission and new feedback.
-- Every writer invalidates obsolete private drafts, including old browser clients.
create function private.invalidate_teacher_feedback_drafts() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.revision is distinct from old.revision then delete from private.teacher_feedback_drafts where work_id=new.id;end if;
 return new;
end;$$;
revoke all on function private.invalidate_teacher_feedback_drafts() from public,anon,authenticated,service_role;
create trigger teacher_feedback_invalidate after update of revision on public.written_work for each row execute function private.invalidate_teacher_feedback_drafts();

-- Personal snippets need a live teacher identity but confer no school/learner access.
create function private.lock_feedback_actor(p_actor uuid,p_auth uuid) returns void language plpgsql security definer set search_path='' as $$
declare x record;t timestamptz;
begin
 select p.role,p.account_status,u.deleted_at,u.banned_until,s.not_after into x
 from public.profiles p join auth.users u on u.id=p.id join auth.sessions s on s.user_id=p.id and s.id=p_auth
 where p.id=p_actor for share of p,u,s;
 t:=clock_timestamp();
 if not found or x.role<>'teacher' or x.account_status<>'active' or x.deleted_at is not null or x.banned_until>t or x.not_after<=t then
 raise exception 'feedback_context_unavailable';end if;
end;$$;
revoke all on function private.lock_feedback_actor(uuid,uuid) from public,anon,authenticated,service_role;

create function private.service_teacher_feedback(p_actor uuid,p_auth uuid,p_action text,p_context jsonb default '{}',p_payload jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare ctx jsonb; result jsonb; written jsonb; w public.written_work%rowtype; d private.teacher_feedback_drafts%rowtype;
 sn private.teacher_feedback_snippets%rowtype; receipt private.teacher_feedback_receipts%rowtype;
 assignment uuid:=(p_context->>'assignmentId')::uuid; rel uuid:=(p_context->>'curriculumReleaseId')::uuid; unt uuid:=(p_context->>'unitId')::uuid;
 work uuid:=(p_payload->>'workId')::uuid; req uuid; expected integer; version_n integer; info jsonb; definition jsonb; c jsonb;
 is_archived boolean; skip_n integer; request_data jsonb; review uuid;
begin
 if p_actor is null or p_auth is null or jsonb_typeof(p_context) is distinct from 'object' or jsonb_typeof(p_payload) is distinct from 'object'
 or p_action not in ('open','save_draft','publish','snippets','save_snippet') then raise exception 'feedback_request_invalid';end if;
 if p_action in ('snippets','save_snippet') then
  if p_context<>'{}' then raise exception 'feedback_request_invalid';end if;
  perform private.lock_feedback_actor(p_actor,p_auth);
  if p_action='snippets' then
   if exists(select 1 from jsonb_object_keys(p_payload) k where k not in ('archived','offset')) then raise exception 'feedback_request_invalid';end if;
   is_archived:=coalesce((p_payload->>'archived')::boolean,false);skip_n:=coalesce((p_payload->>'offset')::integer,0);
   if skip_n not between 0 and 100000 then raise exception 'feedback_request_invalid';end if;
   select jsonb_build_object('snippets',coalesce(jsonb_agg(to_jsonb(q)-'teacher_id' order by updated_at desc,id),'[]'),'hasMore',count(*)>20)
   into result from(select * from private.teacher_feedback_snippets where teacher_id=p_actor and archived=is_archived order by updated_at desc,id offset skip_n limit 21) q;
   result:=jsonb_set(result,'{snippets}',coalesce((select jsonb_agg(v) from(select v from jsonb_array_elements(result->'snippets') v limit 20) z),'[]'));
  else
   if exists(select 1 from jsonb_object_keys(p_payload) k where k not in ('id','expectedRevision','title','body','archived'))
   or jsonb_typeof(p_payload->'expectedRevision') is distinct from 'number' or (p_payload->>'expectedRevision')!~'^[0-9]+$'
   or (p_payload->>'expectedRevision')::numeric>2147483646 or jsonb_typeof(p_payload->'title') is distinct from 'string'
   or length(btrim(p_payload->>'title')) not between 1 and 80 or jsonb_typeof(p_payload->'body') is distinct from 'string'
   or length(btrim(p_payload->>'body')) not between 1 and 2000 or jsonb_typeof(p_payload->'archived') is distinct from 'boolean' then raise exception 'feedback_request_invalid';end if;
   req:=(p_payload->>'id')::uuid;expected:=(p_payload->>'expectedRevision')::integer;if req is null then raise exception 'feedback_request_invalid';end if;
   perform pg_advisory_xact_lock(hashtextextended('feedback-snippets:'||p_actor::text,0));
   select * into sn from private.teacher_feedback_snippets where id=req for update;
   if found and sn.teacher_id<>p_actor then raise exception 'feedback_context_unavailable';end if;
   if sn.id is not null and sn.revision=expected+1 and sn.title=btrim(p_payload->>'title') and sn.body=btrim(p_payload->>'body') and sn.archived=(p_payload->>'archived')::boolean then
    result:=jsonb_build_object('snippet',to_jsonb(sn)-'teacher_id');
   else
    if coalesce(sn.revision,0)<>expected then raise exception 'feedback_conflict';end if;
    if not (p_payload->>'archived')::boolean and (sn.id is null or sn.archived)
    and (select count(*) from private.teacher_feedback_snippets where teacher_id=p_actor and not archived)>=50 then raise exception 'feedback_snippet_limit';end if;
    insert into private.teacher_feedback_snippets(id,teacher_id,title,body,archived,revision) values(req,p_actor,btrim(p_payload->>'title'),btrim(p_payload->>'body'),(p_payload->>'archived')::boolean,1)
    on conflict(id) do update set title=excluded.title,body=excluded.body,archived=excluded.archived,revision=private.teacher_feedback_snippets.revision+1,updated_at=clock_timestamp() returning * into sn;
    result:=jsonb_build_object('snippet',to_jsonb(sn)-'teacher_id');
   end if;
  end if;
  perform private.lock_feedback_actor(p_actor,p_auth);
 else
  if assignment is null or rel is null or unt is null or work is null or exists(select 1 from jsonb_object_keys(p_context) k where k not in ('assignmentId','curriculumReleaseId','unitId')) then raise exception 'feedback_request_invalid';end if;
  ctx:=private.lock_written_teacher_context(p_actor,p_auth,assignment,rel,unt,p_action<>'open');
  select * into w from public.written_work where id=work and school_id=(ctx->>'schoolId')::uuid and academic_year_id=(ctx->>'academicYearId')::uuid
   and class_id=(ctx->>'classId')::uuid and subject_program_id=(ctx->>'subjectProgramId')::uuid and curriculum_release_id=rel and unit_id=unt for update;
  if not found or w.current_submission_id is null then raise exception 'feedback_context_unavailable';end if;
  select * into d from private.teacher_feedback_drafts where teacher_id=p_actor and work_id=w.id for update;
  if p_action='open' then
   if exists(select 1 from jsonb_object_keys(p_payload) k where k<>'workId') then raise exception 'feedback_request_invalid';end if;
   written:=private.service_written_work(p_actor,p_auth,'inspect',p_context,p_payload);
   select coalesce(jsonb_agg(to_jsonb(q)-'teacher_id' order by updated_at desc,id),'[]') into info from(select * from private.teacher_feedback_snippets where teacher_id=p_actor and not archived order by updated_at desc,id limit 20) q;
   result:=jsonb_build_object('writtenWork',written,'draft',case when d.work_id is null then null else to_jsonb(d)-array['teacher_id','work_id'] end,'snippets',info,'snippetsHasMore',(select count(*)>20 from private.teacher_feedback_snippets where teacher_id=p_actor and not archived));
  else
   if jsonb_typeof(p_payload->'expectedRevision') is distinct from 'number' or (p_payload->>'expectedRevision')!~'^[0-9]+$'
   or jsonb_typeof(p_payload->'draftRevision') is distinct from 'number' or (p_payload->>'draftRevision')!~'^[0-9]+$'
   or (p_payload->>'expectedRevision')::numeric>2147483646 or (p_payload->>'draftRevision')::numeric>2147483646 then raise exception 'feedback_request_invalid';end if;
   expected:=(p_payload->>'expectedRevision')::integer;version_n:=(p_payload->>'draftRevision')::integer;
   if p_action='publish' then
    if exists(select 1 from jsonb_object_keys(p_payload) k where k not in ('workId','expectedRevision','draftRevision','decision','requestId'))
    or coalesce(p_payload->>'decision','') not in ('assessed','return') then raise exception 'feedback_request_invalid';end if;
    req:=(p_payload->>'requestId')::uuid;if req is null then raise exception 'feedback_request_invalid';end if;
    perform pg_advisory_xact_lock(hashtextextended('feedback-publish:'||p_actor::text||':'||req::text,0));
    request_data:=jsonb_build_object('context',p_context,'payload',p_payload-'requestId');
    select * into receipt from private.teacher_feedback_receipts where teacher_id=p_actor and request_id=req;
    if found then
     if receipt.work_id<>w.id or receipt.request_data<>request_data then raise exception 'feedback_conflict';end if;
     written:=private.service_written_work(p_actor,p_auth,'inspect',p_context,jsonb_build_object('workId',work));
     result:=jsonb_build_object('writtenWork',written,'receipt',jsonb_build_object('requestId',req,'reviewId',receipt.review_id,'replayed',true));
    end if;
   end if;
   if p_action='save_draft' and result is null and w.revision=expected and d.work_revision=w.revision and d.submission_id=w.current_submission_id and d.revision=version_n+1 and d.data=p_payload->'data' and not exists(select 1 from jsonb_object_keys(p_payload) k where k not in ('workId','expectedRevision','draftRevision','data')) then result:=jsonb_build_object('draft',to_jsonb(d)-array['teacher_id','work_id']);end if;
   if result is null then
    if w.revision<>expected or w.state not in ('submitted','reviewed') or coalesce(d.revision,0)<>version_n or (d.work_id is not null and (d.work_revision<>w.revision or d.submission_id<>w.current_submission_id)) then raise exception 'feedback_conflict';end if;
    if p_action='save_draft' then
     if exists(select 1 from jsonb_object_keys(p_payload) k where k not in ('workId','expectedRevision','draftRevision','data')) then raise exception 'feedback_request_invalid';end if;
     info:=p_payload->'data';
     if jsonb_typeof(info) is distinct from 'object' or exists(select 1 from jsonb_object_keys(info) k where k not in ('scores','feedback','changeReason'))
     or jsonb_typeof(info->'scores') is distinct from 'object' or jsonb_typeof(info->'feedback') is distinct from 'string' or length(info->>'feedback')>4000
     or jsonb_typeof(info->'changeReason') is distinct from 'string' or length(info->>'changeReason')>1000 then raise exception 'feedback_request_invalid';end if;
     select definition into definition from public.written_task_versions where id=w.task_version_id;
     if exists(select 1 from jsonb_object_keys(info->'scores') k where not exists(select 1 from jsonb_array_elements(definition->'criteria') c where c->>'key'=k)) then raise exception 'feedback_request_invalid';end if;
     for c in select value from jsonb_array_elements(definition->'criteria') loop
      if info->'scores' ? (c->>'key') and info->'scores'->(c->>'key')<>'null'::jsonb and
       (jsonb_typeof(info->'scores'->(c->>'key'))<>'number' or coalesce(info->'scores'->>(c->>'key'),'')!~'^[0-9]+$' or (info->'scores'->>(c->>'key'))::numeric>=jsonb_array_length(c->'descriptors')) then raise exception 'feedback_request_invalid';end if;
     end loop;
     insert into private.teacher_feedback_drafts(teacher_id,work_id,submission_id,work_revision,revision,data) values(p_actor,w.id,w.current_submission_id,w.revision,1,info)
     on conflict(teacher_id,work_id) do update set revision=private.teacher_feedback_drafts.revision+1,data=excluded.data,updated_at=clock_timestamp() returning * into d;
     result:=jsonb_build_object('draft',to_jsonb(d)-array['teacher_id','work_id']);
    else
     if d.work_id is null then raise exception 'feedback_conflict';end if;
     written:=private.service_written_work(p_actor,p_auth,'review',p_context,jsonb_build_object('workId',work,'expectedRevision',expected,'decision',p_payload->>'decision',
      'scores',case when p_payload->>'decision'='assessed' then d.data->'scores' else 'null'::jsonb end,'feedback',d.data->>'feedback','changeReason',d.data->>'changeReason'));
     review:=((written->'submissions'->-1)->'reviews'->-1->>'id')::uuid;
     insert into private.teacher_feedback_receipts(teacher_id,request_id,work_id,review_id,request_data) values(p_actor,req,work,review,request_data);
     result:=jsonb_build_object('writtenWork',written,'receipt',jsonb_build_object('requestId',req,'reviewId',review,'replayed',false));
    end if;
   end if;
  end if;
  perform private.lock_written_teacher_context(p_actor,p_auth,assignment,rel,unt,p_action<>'open');
 end if;
 return result||jsonb_build_object('version','teacher-feedback-v1');
exception when invalid_text_representation or numeric_value_out_of_range then raise exception 'feedback_request_invalid';
end;$$;
create function public.service_teacher_feedback(p_actor uuid,p_auth uuid,p_action text,p_context jsonb default '{}',p_payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private.service_teacher_feedback(p_actor,p_auth,p_action,p_context,p_payload);$$;
revoke all on function private.service_teacher_feedback(uuid,uuid,text,jsonb,jsonb),public.service_teacher_feedback(uuid,uuid,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function private.service_teacher_feedback(uuid,uuid,text,jsonb,jsonb),public.service_teacher_feedback(uuid,uuid,text,jsonb,jsonb) to service_role;

create function private.teacher_feedback_privacy_counts(p_user uuid) returns jsonb language sql stable security definer set search_path='' as $$
select jsonb_build_object('feedbackDrafts',(select count(*) from private.teacher_feedback_drafts where teacher_id=p_user),
 'feedbackSnippets',(select count(*) from private.teacher_feedback_snippets where teacher_id=p_user),
 'feedbackReceipts',(select count(*) from private.teacher_feedback_receipts where teacher_id=p_user));$$;
create function public.service_teacher_feedback_privacy_counts(p_user uuid) returns jsonb language sql stable security invoker set search_path='' as $$select private.teacher_feedback_privacy_counts(p_user);$$;
revoke all on function private.teacher_feedback_privacy_counts(uuid),public.service_teacher_feedback_privacy_counts(uuid) from public,anon,authenticated;
grant execute on function private.teacher_feedback_privacy_counts(uuid),public.service_teacher_feedback_privacy_counts(uuid) to service_role;
