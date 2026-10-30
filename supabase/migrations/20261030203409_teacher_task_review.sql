-- B.12.3.2 production integration; promoted unchanged SQL after isolated verification.
-- Filename generated with Supabase CLI 2.122.0; deployment remains gated by release acceptance.
create table public.teacher_task_review_drafts (
 submission_id uuid primary key references public.teacher_task_submissions(id),
 teacher_id uuid not null references public.profiles(id),
 revision integer not null check(revision>0), review jsonb not null,
 updated_at timestamptz not null default clock_timestamp()
);
create index teacher_task_review_drafts_teacher on public.teacher_task_review_drafts(teacher_id);
create table public.teacher_task_reviews (
 id uuid primary key default gen_random_uuid(),
 submission_id uuid not null references public.teacher_task_submissions(id),
 teacher_id uuid not null references public.profiles(id),
 version integer not null check(version>0),
 draft_revision integer not null check(draft_revision>0),
 request_id uuid not null, request_hash text not null,
 review jsonb not null, published_at timestamptz not null default clock_timestamp(),
 unique(submission_id,version), unique(submission_id,draft_revision), unique(teacher_id,request_id)
);
create index teacher_task_reviews_teacher on public.teacher_task_reviews(teacher_id);
create table public.teacher_task_delivery_cancellations (
 delivery_id uuid primary key references public.teacher_task_deliveries(id),
 actor_id uuid not null references public.profiles(id),
 request_id uuid not null, request_hash text not null, reason text not null check(length(btrim(reason)) between 1 and 1000),
 cancelled_at timestamptz not null default clock_timestamp(), unique(actor_id,request_id)
);
create index teacher_task_delivery_cancellations_actor on public.teacher_task_delivery_cancellations(actor_id);
alter table public.teacher_task_review_drafts enable row level security;
alter table public.teacher_task_reviews enable row level security;
alter table public.teacher_task_delivery_cancellations enable row level security;
revoke all on public.teacher_task_review_drafts,public.teacher_task_reviews,public.teacher_task_delivery_cancellations from public,anon,authenticated,service_role;
create trigger teacher_task_review_immutable before update or delete on public.teacher_task_reviews for each row execute function private.teacher_task_delivery_immutable();
create trigger teacher_task_cancellation_immutable before update or delete on public.teacher_task_delivery_cancellations for each row execute function private.teacher_task_delivery_immutable();
create function private.teacher_task_review_draft_guard() returns trigger language plpgsql set search_path='' as $$begin
 if tg_op='DELETE' or new.submission_id<>old.submission_id or new.teacher_id<>old.teacher_id or new.revision<>old.revision+1 then raise exception 'task_review_immutable';end if;return new;end;$$;
create trigger teacher_task_review_draft_guard before update or delete on public.teacher_task_review_drafts for each row execute function private.teacher_task_review_draft_guard();

create function private.teacher_task_review_valid(p_definition jsonb,p_review jsonb,p_complete boolean) returns boolean language plpgsql set search_path='' as $$
declare c jsonb; v jsonb;
begin
 if jsonb_typeof(p_review) is distinct from 'object' or (select count(*) from jsonb_object_keys(p_review))<>4
 or exists(select 1 from jsonb_object_keys(p_review) k where k not in ('decision','feedback','scores','reason'))
 or coalesce(p_review->>'decision','') not in ('reviewed','returned')
 or jsonb_typeof(p_review->'feedback') is distinct from 'string' or length(p_review->>'feedback')>8000
 or jsonb_typeof(p_review->'reason') is distinct from 'string' or length(p_review->>'reason')>1000
 or jsonb_typeof(p_review->'scores') is distinct from 'object' then return false;end if;
 if p_definition->'assessment'->>'kind'='feedback' then
  if p_review->'scores'<>'{}' then return false;end if;
 elsif p_definition->'assessment'->>'kind'='criteria' then
  if exists(select 1 from jsonb_object_keys(p_review->'scores') k where not exists(select 1 from jsonb_array_elements(p_definition->'assessment'->'criteria') criterion where criterion->>'key'=k)) then return false;end if;
  for c in select value from jsonb_array_elements(p_definition->'assessment'->'criteria') loop
   v:=p_review->'scores'->(c->>'key');
   if v is not null and v<>'null'::jsonb and (jsonb_typeof(v)<>'number' or v::text!~'^[0-9]+$' or v::numeric>(c->>'maxPoints')::numeric) then return false;end if;
   if p_complete and p_review->>'decision'='reviewed' and (v is null or v='null'::jsonb) then return false;end if;
  end loop;
 else return false;end if;
 return not p_complete or (p_review->>'decision'='reviewed' and p_definition->'assessment'->>'kind'='criteria') or length(btrim(p_review->>'feedback'))>0;
end;$$;
create function private.teacher_task_reviews_public(p_submission uuid) returns jsonb language sql stable set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'version',version,'review',review,'publishedAt',published_at) order by version),'[]') from public.teacher_task_reviews where submission_id=p_submission;
$$;

create function private.service_teacher_task_review(p_actor uuid,p_auth uuid,p_action text,p_context jsonb,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' set timezone='UTC' as $$
#variable_conflict use_column
declare ctx jsonb; result jsonb; entries jsonb; off integer; state_filter text; definition jsonb;
 a public.teacher_task_deliveries%rowtype; s public.teacher_task_submissions%rowtype; w public.teacher_task_student_work%rowtype;
 d public.teacher_task_review_drafts%rowtype; published public.teacher_task_reviews%rowtype; cancellation public.teacher_task_delivery_cancellations%rowtype;
 file jsonb; fingerprint text; can_edit boolean; latest uuid; prior integer;
 ta uuid:=(p_context->>'assignmentId')::uuid; rel uuid:=(p_context->>'curriculumReleaseId')::uuid; unt uuid:=(p_context->>'unitId')::uuid;
begin
 if jsonb_typeof(p_context) is distinct from 'object' or (select count(*) from jsonb_object_keys(p_context))<>3
 or exists(select 1 from jsonb_object_keys(p_context) k where k not in ('assignmentId','curriculumReleaseId','unitId'))
 or ta is null or rel is null or unt is null or jsonb_typeof(p_payload) is distinct from 'object'
 or p_action not in ('queue','deliveries','open','save','publish','cancel','file','source') then raise exception 'task_review_invalid';end if;
 ctx:=private.lock_written_teacher_context(p_actor,p_auth,ta,rel,unt,false);
 if p_action in ('queue','deliveries') then
  if exists(select 1 from jsonb_object_keys(p_payload) k where k not in ('offset','state')) or p_action='deliveries' and p_payload ? 'state' then raise exception 'task_review_invalid';end if;
  off:=coalesce((p_payload->>'offset')::integer,0);state_filter:=coalesce(p_payload->>'state','submitted');
  if off not between 0 and 100000 or state_filter not in ('submitted','returned','reviewed','all') then raise exception 'task_review_invalid';end if;
  if p_action='queue' then
   select coalesce(jsonb_agg(entry order by submitted_at,id),'[]') into entries from (
    select s.id,s.submitted_at,jsonb_build_object('id',s.id,'deliveryId',a.id,'title',v.definition->>'title','studentName',coalesce(nullif(btrim(p.display_name),''),'Աշակերտ'),
     'state',w.state,'submittedAt',s.submitted_at,'cancelled',exists(select 1 from public.teacher_task_delivery_cancellations c where c.delivery_id=a.id)) entry
    from public.teacher_task_submissions s join public.teacher_task_deliveries a on a.id=s.delivery_id
    join public.teacher_task_versions v on v.id=a.task_version_id join public.profiles p on p.id=s.student_id
    join public.teacher_task_student_work w on w.delivery_id=s.delivery_id and w.enrollment_id=s.enrollment_id
    where a.created_by=p_actor and a.teacher_assignment_id=ta and a.curriculum_release_id=rel and a.unit_id=unt
    and s.id=(select s2.id from public.teacher_task_submissions s2 where s2.delivery_id=s.delivery_id and s2.enrollment_id=s.enrollment_id order by s2.submitted_at desc,s2.id desc limit 1)
    and (state_filter='all' or w.state=state_filter)
    order by s.submitted_at,s.id offset off limit 51
   ) q;
  else
   select coalesce(jsonb_agg(entry order by created_at desc,id),'[]') into entries from (
    select a.id,a.created_at,jsonb_build_object('id',a.id,'title',v.definition->>'title','recipientCount',a.recipient_count,'sentAt',a.created_at,
     'cancelled',exists(select 1 from public.teacher_task_delivery_cancellations c where c.delivery_id=a.id),
     'submissionCount',(select count(distinct s.enrollment_id) from public.teacher_task_submissions s where s.delivery_id=a.id)) entry
    from public.teacher_task_deliveries a join public.teacher_task_versions v on v.id=a.task_version_id
    where a.created_by=p_actor and a.teacher_assignment_id=ta and a.curriculum_release_id=rel and a.unit_id=unt
    order by a.created_at desc,a.id offset off limit 51
   ) q;
  end if;
  result:=jsonb_build_object('entries',case when jsonb_array_length(entries)>50 then entries-50 else entries end,'hasMore',jsonb_array_length(entries)>50,'nextOffset',off+50);
 else
  if p_action='cancel' then
   if p_payload<>jsonb_build_object('deliveryId',p_payload->'deliveryId','requestId',p_payload->'requestId','reason',p_payload->'reason') or jsonb_typeof(p_payload->'reason') is distinct from 'string' or length(btrim(p_payload->>'reason')) not between 1 and 1000 then raise exception 'task_review_invalid';end if;
   select * into a from public.teacher_task_deliveries where id=(p_payload->>'deliveryId')::uuid;
  else
   if exists(select 1 from jsonb_object_keys(p_payload) k where k not in ('submissionId','expectedRevision','review','requestId')) or p_payload->>'submissionId' is null then raise exception 'task_review_invalid';end if;
   select * into s from public.teacher_task_submissions where id=(p_payload->>'submissionId')::uuid;
   select * into a from public.teacher_task_deliveries where id=s.delivery_id;
  end if;
  if a.id is null or a.created_by<>p_actor or a.teacher_assignment_id<>ta or a.curriculum_release_id<>rel or a.unit_id<>unt then raise exception 'task_review_unavailable';end if;
  -- Same order as the student service: delivery cancellation fence, then work.
  if p_action='cancel' then perform pg_advisory_xact_lock(hashtextextended('teacher-task-delivery:'||a.id::text,0));else perform pg_advisory_xact_lock_shared(hashtextextended('teacher-task-delivery:'||a.id::text,0));end if;
  if p_action='cancel' then
   fingerprint:=encode(sha256(convert_to(jsonb_build_array(p_context,p_payload)::text,'UTF8')),'hex');
   perform pg_advisory_xact_lock(hashtextextended('task-cancel:'||p_actor::text||':'||(p_payload->>'requestId')::uuid::text,0));
   select * into cancellation from public.teacher_task_delivery_cancellations where actor_id=p_actor and request_id=(p_payload->>'requestId')::uuid;
   if found then if cancellation.request_hash<>fingerprint then raise exception 'task_review_conflict';end if;
   else
    perform private.lock_written_teacher_context(p_actor,p_auth,ta,rel,unt,true);
    if exists(select 1 from public.teacher_task_delivery_cancellations where delivery_id=a.id) then raise exception 'task_review_locked';end if;
    insert into public.teacher_task_delivery_cancellations(delivery_id,actor_id,request_id,request_hash,reason) values(a.id,p_actor,(p_payload->>'requestId')::uuid,fingerprint,p_payload->>'reason') returning * into cancellation;
   end if;
   result:=jsonb_build_object('cancellation',jsonb_build_object('deliveryId',a.id,'cancelledAt',cancellation.cancelled_at,'reason',cancellation.reason));
  else
   perform pg_advisory_xact_lock(hashtextextended('teacher-task-work:'||a.id::text||':'||s.enrollment_id::text,0));
   select * into w from public.teacher_task_student_work where delivery_id=a.id and enrollment_id=s.enrollment_id for update;
   select s2.id into latest from public.teacher_task_submissions s2 where s2.delivery_id=a.id and s2.enrollment_id=s.enrollment_id order by s2.submitted_at desc,s2.id desc limit 1;
   select v.definition into definition from public.teacher_task_versions v where v.id=a.task_version_id;
   select * into d from public.teacher_task_review_drafts where submission_id=s.id and teacher_id=p_actor;
   can_edit:=not (ctx->>'readOnly')::boolean and latest=s.id and w.state in ('submitted','reviewed') and not exists(select 1 from public.teacher_task_delivery_cancellations where delivery_id=a.id);
   if p_action in ('save','publish') then
    if jsonb_typeof(p_payload->'expectedRevision') is distinct from 'number' or coalesce(p_payload->>'expectedRevision','')!~'^[0-9]+$' or not coalesce(private.teacher_task_review_valid(definition,p_payload->'review',p_action='publish'),false) then raise exception 'task_review_invalid';end if;
    if p_action='publish' then
     if p_payload->>'requestId' is null then raise exception 'task_review_invalid';end if;
     fingerprint:=encode(sha256(convert_to(jsonb_build_array(p_context,p_payload)::text,'UTF8')),'hex');
     perform pg_advisory_xact_lock(hashtextextended('task-review-publish:'||p_actor::text||':'||(p_payload->>'requestId')::uuid::text,0));
     select * into published from public.teacher_task_reviews where teacher_id=p_actor and request_id=(p_payload->>'requestId')::uuid;
     if found then
      if published.request_hash<>fingerprint then raise exception 'task_review_conflict';end if;
      result:=jsonb_build_object('receipt',jsonb_build_object('id',published.id,'version',published.version,'publishedAt',published.published_at),'replayed',true);
     end if;
    elsif p_payload ? 'requestId' then raise exception 'task_review_invalid';end if;
    if result is null then
     if p_action='save' and d.review is not distinct from p_payload->'review' then null;
     else
      if not can_edit then raise exception 'task_review_locked';end if;
      perform private.lock_written_teacher_context(p_actor,p_auth,ta,rel,unt,true);
      if coalesce(d.revision,0)<>(p_payload->>'expectedRevision')::integer then raise exception 'task_review_conflict';end if;
      if p_action='save' then
       if d.submission_id is null then insert into public.teacher_task_review_drafts(submission_id,teacher_id,revision,review) values(s.id,p_actor,1,p_payload->'review') returning * into d;
       else update public.teacher_task_review_drafts set review=p_payload->'review',revision=revision+1,updated_at=clock_timestamp() where submission_id=s.id returning * into d;end if;
      else
       if d.review is distinct from p_payload->'review' then raise exception 'task_review_conflict';end if;
       if exists(select 1 from public.teacher_task_reviews where submission_id=s.id and draft_revision=d.revision) then raise exception 'task_review_conflict';end if;
       select count(*) into prior from public.teacher_task_reviews where submission_id=s.id;
       if prior>0 and length(btrim(p_payload->'review'->>'reason'))=0 then raise exception 'task_review_reason_required';end if;
       insert into public.teacher_task_reviews(submission_id,teacher_id,version,draft_revision,request_id,request_hash,review) values(s.id,p_actor,prior+1,d.revision,(p_payload->>'requestId')::uuid,fingerprint,d.review) returning * into published;
       update public.teacher_task_student_work set state=d.review->>'decision',revision=revision+1,updated_at=clock_timestamp() where delivery_id=a.id and enrollment_id=s.enrollment_id;
       insert into public.teacher_task_work_events(submission_id,actor_id,event) values(s.id,p_actor,d.review->>'decision');
       result:=jsonb_build_object('receipt',jsonb_build_object('id',published.id,'version',published.version,'publishedAt',published.published_at),'replayed',false);
       can_edit:=can_edit and d.review->>'decision'='reviewed';
      end if;
     end if;
    end if;
   elsif p_payload<>jsonb_build_object('submissionId',p_payload->'submissionId') then raise exception 'task_review_invalid';end if;
   if p_action in ('file','source') then
    if p_action='file' then select jsonb_build_object('path',f.object_path,'sha256',f.file_sha256,'bytes',f.file_bytes,'format',f.format) into file from public.teacher_task_response_files f where f.id=s.file_id and f.delivery_id=s.delivery_id and f.enrollment_id=s.enrollment_id and f.student_id=s.student_id and f.status='ready';
    else select jsonb_build_object('path',f.object_path,'sha256',f.file_sha256,'bytes',f.file_bytes,'format','pdf') into file from public.teacher_task_source_files f join public.teacher_task_versions v on v.source_file_id=f.id where v.id=a.task_version_id and f.status='ready';end if;
    if file is null then raise exception 'task_file_unavailable';end if;result:=jsonb_build_object('file',file);
   else
    result:=coalesce(result,'{}')||jsonb_build_object('submission',jsonb_build_object('id',s.id,'deliveryId',a.id,'content',s.content,'submittedAt',s.submitted_at,'studentName',(select coalesce(nullif(btrim(display_name),''),'Աշակերտ') from public.profiles where id=s.student_id),'definition',definition,
     'state',(select state from public.teacher_task_student_work where delivery_id=a.id and enrollment_id=s.enrollment_id),'editable',can_edit,
     'cancelled',exists(select 1 from public.teacher_task_delivery_cancellations where delivery_id=a.id),
     'history',(select coalesce(jsonb_agg(jsonb_build_object('id',s2.id,'submittedAt',s2.submitted_at) order by s2.submitted_at,s2.id),'[]') from public.teacher_task_submissions s2 where s2.delivery_id=a.id and s2.enrollment_id=s.enrollment_id),
     'reviews',private.teacher_task_reviews_public(s.id)),
     'draft',jsonb_build_object('revision',coalesce(d.revision,0),'review',d.review));
   end if;
  end if;
 end if;
 perform private.lock_written_teacher_context(p_actor,p_auth,ta,rel,unt,false);
 return jsonb_build_object('version','teacher-task-review-v1','readOnly',ctx->'readOnly')||result;
exception when invalid_text_representation or numeric_value_out_of_range then raise exception 'task_review_invalid';
end;$$;
create function public.service_teacher_task_review(p_actor uuid,p_auth uuid,p_action text,p_context jsonb,p_payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private.service_teacher_task_review(p_actor,p_auth,p_action,p_context,p_payload);$$;
revoke all on function private.teacher_task_review_draft_guard(),private.teacher_task_review_valid(jsonb,jsonb,boolean),private.teacher_task_reviews_public(uuid),private.service_teacher_task_review(uuid,uuid,text,jsonb,jsonb),public.service_teacher_task_review(uuid,uuid,text,jsonb,jsonb) from public,anon,authenticated,service_role;
grant execute on function private.service_teacher_task_review(uuid,uuid,text,jsonb,jsonb),public.service_teacher_task_review(uuid,uuid,text,jsonb,jsonb) to service_role;

-- Only published reviews enter the learner projection. Never join private drafts.
create or replace function private.teacher_task_submission_reviews(p_id uuid) returns jsonb language sql stable set search_path='' as $$select private.teacher_task_reviews_public(p_id);$$;
alter function private.teacher_task_student_context(uuid,uuid,uuid,jsonb) rename to teacher_task_student_context_base;
create function private.teacher_task_student_context(p_actor uuid,p_auth uuid,p_id uuid,p_context jsonb) returns jsonb language plpgsql set search_path='' as $$
declare result jsonb;
begin
 result:=private.teacher_task_student_context_base(p_actor,p_auth,p_id,p_context);
 return result||jsonb_build_object('cancelled',exists(select 1 from public.teacher_task_delivery_cancellations where delivery_id=p_id));
end;$$;
revoke all on function private.teacher_task_student_context_base(uuid,uuid,uuid,jsonb),private.teacher_task_student_context(uuid,uuid,uuid,jsonb),private.teacher_task_submission_reviews(uuid) from public,anon,authenticated,service_role;
