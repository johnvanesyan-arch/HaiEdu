-- B.12.3.2 production integration; promoted unchanged SQL after isolated verification.
-- Filename generated with Supabase CLI 2.122.0; deployment remains gated by release acceptance.
alter table public.account_deletion_requests add column execution_started_at timestamptz;
create table public.teacher_task_erasure_jobs (
 request_id uuid primary key references public.account_deletion_requests(id),
 target_id uuid, phase text not null check(phase in ('prepared','data_erased','profile_erased','completed')),
 inventory jsonb not null default '{}', legacy_inventory jsonb,
 started_at timestamptz not null default clock_timestamp(), completed_at timestamptz
);
create table public.teacher_task_cleanup_runs (
 id uuid primary key default gen_random_uuid(), actor_id uuid references public.profiles(id) on delete set null,
 request_id uuid not null, fingerprint text not null, before_at timestamptz not null,
 file_count integer not null, created_at timestamptz not null default clock_timestamp(), unique(actor_id,request_id)
);
create table public.teacher_task_storage_deletions (
 id uuid primary key default gen_random_uuid(), owner_id uuid references public.profiles(id),
 request_id uuid references public.account_deletion_requests(id), cleanup_id uuid references public.teacher_task_cleanup_runs(id),
 asset_id uuid, asset_kind text not null check(asset_kind in ('source','response')),
 object_path text unique, file_bytes integer not null check(file_bytes between 1 and 10485760),
 not_before timestamptz not null, created_at timestamptz not null default clock_timestamp(), deleted_at timestamptz,
 check((deleted_at is null and object_path is not null and owner_id is not null and asset_id is not null)
   or (deleted_at is not null and object_path is null and owner_id is null and asset_id is null))
);
create index teacher_task_erasure_target on public.teacher_task_erasure_jobs(target_id);
create index teacher_task_cleanup_actor on public.teacher_task_cleanup_runs(actor_id);
create index teacher_task_storage_owner on public.teacher_task_storage_deletions(owner_id);
create index teacher_task_storage_request on public.teacher_task_storage_deletions(request_id,not_before) where deleted_at is null;
create index teacher_task_storage_request_all on public.teacher_task_storage_deletions(request_id);
create index teacher_task_storage_cleanup_all on public.teacher_task_storage_deletions(cleanup_id);
create index teacher_task_storage_cleanup on public.teacher_task_storage_deletions(cleanup_id,not_before) where deleted_at is null;
create index teacher_task_storage_pending on public.teacher_task_storage_deletions(not_before,id) where deleted_at is null;
alter table public.teacher_task_erasure_jobs enable row level security;
alter table public.teacher_task_cleanup_runs enable row level security;
alter table public.teacher_task_storage_deletions enable row level security;
revoke all on public.teacher_task_erasure_jobs,public.teacher_task_cleanup_runs,public.teacher_task_storage_deletions from public,anon,authenticated,service_role;

-- Only this transaction's audited erasure/GC may relax immutable DELETE guards.
-- No client-set GUC, trigger disabling or general-purpose history-delete RPC.
create table private.teacher_task_privacy_scopes (
 transaction_id bigint not null, backend_pid integer not null, student_id uuid, asset_id uuid, asset_kind text
);
alter table private.teacher_task_privacy_scopes enable row level security;
revoke all on private.teacher_task_privacy_scopes from public,anon,authenticated,service_role;
create function private.teacher_task_privacy_delete_allowed(p_table text,p_row jsonb) returns boolean
language plpgsql security definer set search_path='' as $$
declare sid uuid;
begin
 if p_table in ('teacher_task_source_files','teacher_task_response_files') and exists(
  select 1 from private.teacher_task_privacy_scopes x where x.transaction_id=txid_current() and x.backend_pid=pg_backend_pid()
  and x.asset_id=(p_row->>'id')::uuid and x.asset_kind=case when p_table='teacher_task_source_files' then 'source' else 'response' end
 ) then return true;end if;
 if p_table in ('teacher_task_student_work','teacher_task_submissions','teacher_task_response_files','teacher_task_delivery_recipients') then sid:=(p_row->>'student_id')::uuid;
 elsif p_table in ('teacher_task_reviews','teacher_task_review_drafts','teacher_task_work_events') then
  select student_id into sid from public.teacher_task_submissions where id=(p_row->>'submission_id')::uuid;
 else return false;end if;
 return sid is not null and exists(select 1 from private.teacher_task_privacy_scopes x
  where x.transaction_id=txid_current() and x.backend_pid=pg_backend_pid() and x.student_id=sid);
end;$$;
create function private.teacher_task_privacy_delete_guard() returns trigger language plpgsql set search_path='' as $$begin
 if private.teacher_task_privacy_delete_allowed(tg_table_name,to_jsonb(old)) then return old;end if;
 raise exception 'task_privacy_delete_forbidden';end;$$;
-- Preserve every original update guard; narrowly replace only DELETE dispatch.
drop trigger teacher_task_version_immutable on public.teacher_task_versions;
drop trigger teacher_task_delivery_immutable on public.teacher_task_deliveries;
drop trigger teacher_task_delivery_recipient_immutable on public.teacher_task_delivery_recipients;
drop trigger teacher_task_delivery_event_immutable on public.teacher_task_delivery_events;
drop trigger teacher_task_submission_immutable on public.teacher_task_submissions;
drop trigger teacher_task_work_event_immutable on public.teacher_task_work_events;
drop trigger teacher_task_review_immutable on public.teacher_task_reviews;
drop trigger teacher_task_cancellation_immutable on public.teacher_task_delivery_cancellations;
create trigger teacher_task_version_immutable before update on public.teacher_task_versions for each row execute function private.teacher_task_delivery_immutable();
create trigger teacher_task_delivery_immutable before update on public.teacher_task_deliveries for each row execute function private.teacher_task_delivery_immutable();
create trigger teacher_task_delivery_recipient_immutable before update on public.teacher_task_delivery_recipients for each row execute function private.teacher_task_delivery_immutable();
create trigger teacher_task_delivery_event_immutable before update on public.teacher_task_delivery_events for each row execute function private.teacher_task_delivery_immutable();
create trigger teacher_task_submission_immutable before update on public.teacher_task_submissions for each row execute function private.teacher_task_delivery_immutable();
create trigger teacher_task_work_event_immutable before update on public.teacher_task_work_events for each row execute function private.teacher_task_delivery_immutable();
create trigger teacher_task_review_immutable before update on public.teacher_task_reviews for each row execute function private.teacher_task_delivery_immutable();
create trigger teacher_task_cancellation_immutable before update on public.teacher_task_delivery_cancellations for each row execute function private.teacher_task_delivery_immutable();
-- Work/response/private-feedback guards handle DELETE internally, so split them.
drop trigger teacher_task_work_guard on public.teacher_task_student_work;
drop trigger teacher_task_response_file_guard on public.teacher_task_response_files;
drop trigger teacher_task_review_draft_guard on public.teacher_task_review_drafts;
create trigger teacher_task_work_guard before update on public.teacher_task_student_work for each row execute function private.teacher_task_work_guard();
create trigger teacher_task_response_file_guard before update on public.teacher_task_response_files for each row execute function private.teacher_task_response_file_guard();
create trigger teacher_task_review_draft_guard before update on public.teacher_task_review_drafts for each row execute function private.teacher_task_review_draft_guard();
do $$declare tab text;begin
 foreach tab in array array['teacher_task_versions','teacher_task_deliveries','teacher_task_delivery_recipients','teacher_task_delivery_events',
 'teacher_task_student_work','teacher_task_response_files','teacher_task_submissions','teacher_task_work_events','teacher_task_review_drafts',
 'teacher_task_reviews','teacher_task_delivery_cancellations','teacher_task_source_files'] loop
  execute format('create trigger teacher_task_privacy_delete before delete on public.%I for each row execute function private.teacher_task_privacy_delete_guard()',tab);
 end loop;
end;$$;

create function private.teacher_task_execution_guard() returns trigger language plpgsql set search_path='' as $$begin
 if old.execution_started_at is not null and (new.execution_started_at is distinct from old.execution_started_at
  or new.status not in ('processing','completed') or old.status='completed' and new.status<>'completed') then raise exception 'deletion_execution_started';end if;
 return new;end;$$;
create trigger teacher_task_execution_guard before update on public.account_deletion_requests for each row execute function private.teacher_task_execution_guard();

create index teacher_task_drafts_source_reference on public.teacher_task_drafts((definition#>>'{source,attachmentId}'));
create index teacher_task_drafts_initial_source_reference on public.teacher_task_drafts((initial_definition#>>'{source,attachmentId}'));
create index teacher_task_work_file_reference on public.teacher_task_student_work((content->>'fileId'));
create function private.teacher_task_file_referenced(p_kind text,p_id uuid) returns boolean language sql stable set search_path='' as $$
 select case when p_kind='source' then
  exists(select 1 from public.teacher_task_drafts where definition#>>'{source,attachmentId}'=p_id::text or initial_definition#>>'{source,attachmentId}'=p_id::text)
  or exists(select 1 from public.teacher_task_versions where source_file_id=p_id or definition#>>'{source,attachmentId}'=p_id::text)
 when p_kind='response' then
  exists(select 1 from public.teacher_task_student_work where content->>'fileId'=p_id::text)
  or exists(select 1 from public.teacher_task_submissions where file_id=p_id or content->>'fileId'=p_id::text)
 else true end;
$$;
create function private.teacher_task_privacy_counts(p_user uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
 'drafts',(select count(*) from public.teacher_task_drafts where created_by=p_user),
 'copies',(select count(*) from public.teacher_task_drafts where created_by=p_user and copied_from_id is not null),
 'deliveries',(select count(*) from public.teacher_task_deliveries where created_by=p_user),
 'sources',(select count(*) from public.teacher_task_source_files where created_by=p_user),
 'sourceBytes',(select coalesce(sum(file_bytes),0) from public.teacher_task_source_files where created_by=p_user),
 'privateFeedback',(select count(*) from public.teacher_task_review_drafts where teacher_id=p_user),
 'publishedFeedback',(select count(*) from public.teacher_task_reviews where teacher_id=p_user),
 'received',(select count(*) from public.teacher_task_delivery_recipients where student_id=p_user),
 'workDrafts',(select count(*) from public.teacher_task_student_work where student_id=p_user and state in ('draft','returned')),
 'submissions',(select count(*) from public.teacher_task_submissions where student_id=p_user),
 'responseFiles',(select count(*) from public.teacher_task_response_files where student_id=p_user),
 'responseBytes',(select coalesce(sum(file_bytes),0) from public.teacher_task_response_files where student_id=p_user),
 'receivedFeedback',(select count(*) from public.teacher_task_reviews r join public.teacher_task_submissions s on s.id=r.submission_id where s.student_id=p_user),
 'pendingFileRemoval',(select count(*) from public.teacher_task_storage_deletions where owner_id=p_user and deleted_at is null));
$$;
create function public.service_teacher_task_privacy_counts(p_user_id uuid) returns jsonb language sql security invoker set search_path='' as $$select private.teacher_task_privacy_counts(p_user_id);$$;

create function private.teacher_task_erasure_state(p_request uuid) returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('version','teacher-task-privacy-v1','phase',j.phase,'inventory',j.inventory||coalesce(j.legacy_inventory,'{}'),
 'pendingFiles',(select count(*) from public.teacher_task_storage_deletions where request_id=j.request_id and deleted_at is null),
 'retryAfterSeconds',(select greatest(0,coalesce(ceil(extract(epoch from min(not_before)-clock_timestamp())),0)) from public.teacher_task_storage_deletions where request_id=j.request_id and deleted_at is null),
 'request',jsonb_build_object('id',r.id,'status',r.status,'requested_at',r.requested_at,'execution_started_at',r.execution_started_at,
 'resolved_at',r.resolved_at,'resolution_code',r.resolution_code))
 from public.teacher_task_erasure_jobs j join public.account_deletion_requests r on r.id=j.request_id where j.request_id=p_request;
$$;

create function private.service_teacher_task_privacy(p_actor uuid,p_auth uuid,p_action text,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' set timezone='UTC' as $$
#variable_conflict use_column
declare req public.account_deletion_requests%rowtype; job public.teacher_task_erasure_jobs%rowtype; person public.profiles%rowtype;
 f record; target_request uuid; result jsonb; ids uuid[]; n integer;
begin
 if private.supplementary_session(p_actor,p_auth)<>'admin' then raise exception 'task_privacy_forbidden';end if;
 if jsonb_typeof(p_payload) is distinct from 'object' or p_action is null or p_action not in ('prepare','purge','status','files','ack','finish')
 or exists(select 1 from jsonb_object_keys(p_payload) k where k not in ('requestId','ids','cleanupId')) then raise exception 'task_privacy_invalid';end if;
 if p_action not in ('files','ack','status') and p_payload<>jsonb_build_object('requestId',p_payload->'requestId') or p_action<>'ack' and p_payload ? 'ids' then raise exception 'task_privacy_invalid';end if;
 if p_action in ('files','ack','status') and p_payload ? 'cleanupId' then
  if p_payload ? 'requestId' or not exists(select 1 from public.teacher_task_cleanup_runs where id=(p_payload->>'cleanupId')::uuid) then raise exception 'task_privacy_invalid';end if;
 else
  target_request:=(p_payload->>'requestId')::uuid;if target_request is null then raise exception 'task_privacy_invalid';end if;
  select * into req from public.account_deletion_requests where id=target_request for update;
  if not found or req.status not in ('processing','completed') then raise exception 'approved_request_required';end if;
  select * into job from public.teacher_task_erasure_jobs where teacher_task_erasure_jobs.request_id=req.id for update;
  if p_action='prepare' and job.request_id is null then
   select * into person from public.profiles where id=req.user_id for update;
   if not found or person.role::text<>'student' or person.account_status<>'deletion_pending' or req.auth_user_id is distinct from person.id or person.id=p_actor then raise exception 'task_privacy_target';end if;
   -- A role change never authorizes removing teacher-owned resources or others' work.
   if exists(select 1 from public.teacher_task_drafts where created_by=person.id)
    or exists(select 1 from public.teacher_task_deliveries where created_by=person.id)
    or exists(select 1 from public.teacher_task_reviews where teacher_id=person.id)
    or exists(select 1 from public.teacher_task_review_drafts where teacher_id=person.id)
    or exists(select 1 from public.teacher_task_delivery_cancellations where actor_id=person.id)
    then raise exception 'staff_offboarding_required';end if;
   update public.account_deletion_requests set execution_started_at=clock_timestamp() where id=req.id;
   insert into public.teacher_task_erasure_jobs(request_id,target_id,phase,inventory)
    values(req.id,person.id,'prepared',jsonb_build_object('teacherTasks',private.teacher_task_privacy_counts(person.id))) returning * into job;
  end if;
  if job.request_id is null then raise exception 'task_privacy_prepare_required';end if;
 end if;
 if p_action='purge' and job.phase='prepared' then
  -- Ban is acknowledged before erasure. Revoke live sessions in the same transaction.
  if not exists(select 1 from auth.users where id=job.target_id and banned_until>clock_timestamp()) then raise exception 'task_privacy_ban_required';end if;
  perform 1 from public.profiles where id=job.target_id and account_status='deletion_pending' for update;
  if not found then raise exception 'task_privacy_target';end if;
  delete from auth.sessions where user_id=job.target_id;
  -- Existing student RPCs lock the profile before work; review RPCs lock each work.
  perform 1 from public.teacher_task_student_work where student_id=job.target_id order by delivery_id,enrollment_id for update;
  update public.teacher_task_erasure_jobs set inventory=jsonb_build_object('teacherTasks',private.teacher_task_privacy_counts(job.target_id)) where teacher_task_erasure_jobs.request_id=req.id;
  for f in select * from public.teacher_task_response_files where student_id=job.target_id order by id for update loop
   insert into public.teacher_task_storage_deletions(owner_id,request_id,asset_id,asset_kind,object_path,file_bytes,not_before)
    values(job.target_id,req.id,f.id,'response',f.object_path,f.file_bytes,f.upload_lease_until) on conflict(object_path) do nothing;
  end loop;
  -- Include previously queued orphan files owned by this same account.
  update public.teacher_task_storage_deletions set request_id=req.id where owner_id=job.target_id and deleted_at is null;
  insert into private.teacher_task_privacy_scopes(transaction_id,backend_pid,student_id) values(txid_current(),pg_backend_pid(),job.target_id);
  delete from public.teacher_task_review_drafts where submission_id in (select id from public.teacher_task_submissions where student_id=job.target_id);
  delete from public.teacher_task_reviews where submission_id in (select id from public.teacher_task_submissions where student_id=job.target_id);
  delete from public.teacher_task_work_events where submission_id in (select id from public.teacher_task_submissions where student_id=job.target_id);
  delete from public.teacher_task_submissions where student_id=job.target_id;
  delete from public.teacher_task_student_work where student_id=job.target_id;
  delete from public.teacher_task_response_files where student_id=job.target_id;
  delete from public.teacher_task_delivery_recipients where student_id=job.target_id;
  delete from private.teacher_task_privacy_scopes where transaction_id=txid_current() and backend_pid=pg_backend_pid();
  update public.teacher_task_erasure_jobs set phase='data_erased' where teacher_task_erasure_jobs.request_id=req.id;
 elsif p_action='files' then
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'path',object_path)),'[]') into result from (
   select id,object_path from public.teacher_task_storage_deletions where deleted_at is null and not_before<=clock_timestamp()
   and (case when target_request is not null then teacher_task_storage_deletions.request_id=target_request else cleanup_id=(p_payload->>'cleanupId')::uuid end)
   order by id limit 100) q;
  return jsonb_build_object('version','teacher-task-privacy-v1','files',result);
 elsif p_action='ack' then
  if jsonb_typeof(p_payload->'ids') is distinct from 'array' or jsonb_array_length(p_payload->'ids') not between 1 and 100 then raise exception 'task_privacy_invalid';end if;
  select array_agg(x::uuid) into ids from jsonb_array_elements_text(p_payload->'ids') x;
  if cardinality(ids)<>(select count(distinct x) from unnest(ids) x) or exists(select 1 from unnest(ids) x where not exists(
   select 1 from public.teacher_task_storage_deletions d where d.id=x and d.not_before<=clock_timestamp()
   and (case when target_request is not null then d.request_id=target_request else d.cleanup_id=(p_payload->>'cleanupId')::uuid end))) then raise exception 'task_privacy_invalid';end if;
  update public.teacher_task_storage_deletions set owner_id=null,asset_id=null,object_path=null,deleted_at=clock_timestamp() where id=any(ids) and deleted_at is null;
 elsif p_action='finish' and job.phase<>'completed' then
  if job.phase<>'profile_erased' or exists(select 1 from public.teacher_task_storage_deletions where teacher_task_storage_deletions.request_id=req.id and deleted_at is null)
   or exists(select 1 from auth.users where id=job.target_id) or exists(select 1 from public.profiles where id=job.target_id) then raise exception 'task_privacy_not_finished';end if;
  update public.account_deletion_requests set status='completed',resolved_at=clock_timestamp(),resolved_by=p_actor,resolution_code='student_erased',auth_user_id=null where id=req.id;
  update public.teacher_task_erasure_jobs set phase='completed',target_id=null,completed_at=clock_timestamp() where teacher_task_erasure_jobs.request_id=req.id;
  insert into public.security_audit_log(actor_user_id,actor_role,action,outcome,target_type,target_key,details)
   values(p_actor,'admin','admin.student_account_erased','success','deletion_request',req.id::text,jsonb_build_object('erasedInventory',job.inventory||coalesce(job.legacy_inventory,'{}'),'authDeleted',true));
 end if;
 perform private.supplementary_session(p_actor,p_auth);
 if target_request is not null then return private.teacher_task_erasure_state(target_request);end if;
 return jsonb_build_object('version','teacher-task-privacy-v1','pendingFiles',(select count(*) from public.teacher_task_storage_deletions where cleanup_id=(p_payload->>'cleanupId')::uuid and deleted_at is null));
exception when invalid_text_representation or numeric_value_out_of_range then raise exception 'task_privacy_invalid';
end;$$;
create function public.service_teacher_task_privacy(p_actor uuid,p_auth uuid,p_action text,p_payload jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.service_teacher_task_privacy(p_actor,p_auth,p_action,p_payload);$$;

-- Keep the existing learning/profile cascade, but fence it behind prepared,
-- completed file cleanup and retain its result for lost-response recovery.
alter function public.erase_student_data(uuid) set schema private;
alter function private.erase_student_data(uuid) rename to erase_student_data_legacy;
revoke all on function private.erase_student_data_legacy(uuid) from public,anon,authenticated,service_role;
create function public.erase_student_data(p_student_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.teacher_task_erasure_jobs%rowtype; inv jsonb; rid uuid;
begin
 -- Match progress/finish: request -> job -> profile. The legacy profile FK
 -- cascade also updates the request; reversing these locks can deadlock.
 select request_id into rid from public.teacher_task_erasure_jobs where target_id=p_student_id;
 if rid is null then raise exception 'task_privacy_prepare_required';end if;
 perform 1 from public.account_deletion_requests where id=rid for update;
 select * into j from public.teacher_task_erasure_jobs where request_id=rid and target_id=p_student_id for update;
 if not found then raise exception 'task_privacy_prepare_required';end if;
 if j.phase='profile_erased' then return j.inventory||j.legacy_inventory;end if;
 if j.phase<>'data_erased' or exists(select 1 from public.teacher_task_storage_deletions where request_id=j.request_id and deleted_at is null) then raise exception 'task_privacy_files_pending';end if;
 inv:=private.erase_student_data_legacy(p_student_id);
 update public.teacher_task_erasure_jobs set phase='profile_erased',legacy_inventory=inv where request_id=j.request_id;
 return j.inventory||inv;
end;$$;

revoke all on function private.teacher_task_privacy_delete_allowed(text,jsonb),private.teacher_task_privacy_delete_guard(),private.teacher_task_execution_guard(),
 private.teacher_task_file_referenced(text,uuid),private.teacher_task_privacy_counts(uuid),public.service_teacher_task_privacy_counts(uuid),
 private.teacher_task_erasure_state(uuid),private.service_teacher_task_privacy(uuid,uuid,text,jsonb),public.service_teacher_task_privacy(uuid,uuid,text,jsonb),public.erase_student_data(uuid)
 from public,anon,authenticated,service_role;
grant execute on function private.teacher_task_privacy_counts(uuid),public.service_teacher_task_privacy_counts(uuid),
 private.service_teacher_task_privacy(uuid,uuid,text,jsonb),public.service_teacher_task_privacy(uuid,uuid,text,jsonb),public.erase_student_data(uuid) to service_role;

-- Operator-selected cutoff; no scheduled expiry of saved work or assigned tasks.
-- A minimum day is an operational orphan-upload safeguard, not a curriculum policy.
create function private.teacher_task_retention_candidates(p_before timestamptz) returns jsonb language sql stable set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(q) order by created_at,kind,id),'[]') from (
  select * from (
   select 'source'::text kind,id,created_by owner_id,object_path,file_bytes,upload_lease_until,created_at from public.teacher_task_source_files
   union all select 'response',id,student_id,object_path,file_bytes,upload_lease_until,created_at from public.teacher_task_response_files
  ) files where created_at<p_before and upload_lease_until<=clock_timestamp() and not private.teacher_task_file_referenced(kind,id)
  order by created_at,kind,id limit 51
 ) q;
$$;
create function private.service_teacher_task_retention(p_actor uuid,p_auth uuid,p_action text,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' set timezone='UTC' as $$
#variable_conflict use_column
declare cutoff timestamptz; entries jsonb; manifest jsonb; stamp text; run public.teacher_task_cleanup_runs%rowtype;
 f jsonb; actual record; nonce uuid; n integer;
begin
 if private.supplementary_session(p_actor,p_auth)<>'admin' then raise exception 'task_privacy_forbidden';end if;
 if p_action is null or p_action not in ('preview','enqueue') or jsonb_typeof(p_payload) is distinct from 'object'
  or exists(select 1 from jsonb_object_keys(p_payload) k where k not in ('before','fingerprint','requestId')) then raise exception 'task_privacy_invalid';end if;
 cutoff:=(p_payload->>'before')::timestamptz;
 if cutoff is null or not isfinite(cutoff) or cutoff>clock_timestamp()-interval '1 day' then raise exception 'task_retention_cutoff';end if;
 if p_action='enqueue' then
  nonce:=(p_payload->>'requestId')::uuid;
  if nonce is null or coalesce(p_payload->>'fingerprint','')!~'^[a-f0-9]{64}$' then raise exception 'task_privacy_invalid';end if;
  perform pg_advisory_xact_lock(hashtextextended('task-retention:'||p_actor::text||':'||nonce::text,0));
  select * into run from public.teacher_task_cleanup_runs where actor_id=p_actor and request_id=nonce;
  if found then
   if run.before_at<>cutoff or run.fingerprint<>p_payload->>'fingerprint' then raise exception 'task_retention_conflict';end if;
   return jsonb_build_object('version','teacher-task-retention-v1','cleanupId',run.id,'files',run.file_count,'replayed',true);
  end if;
 end if;
 entries:=private.teacher_task_retention_candidates(cutoff);
 manifest:=case when jsonb_array_length(entries)>50 then entries-50 else entries end;
 if p_action='enqueue' then
  -- Same profile -> asset lock order as erasure; do not lock drafts or work here.
  perform 1 from public.profiles where id in(select (x->>'owner_id')::uuid from jsonb_array_elements(manifest) x) order by id for share;
  for f in select x from jsonb_array_elements(manifest) x order by x->>'kind',x->>'id' loop
   if f->>'kind'='source' then
    select * into actual from public.teacher_task_source_files where id=(f->>'id')::uuid for update;
   else select * into actual from public.teacher_task_response_files where id=(f->>'id')::uuid for update;end if;
   if not found or actual.object_path<>f->>'object_path' or actual.upload_lease_until>clock_timestamp()
    or private.teacher_task_file_referenced(f->>'kind',(f->>'id')::uuid) then raise exception 'task_retention_stale';end if;
  end loop;
  -- A changed candidate set must be previewed again, never silently expanded.
  entries:=private.teacher_task_retention_candidates(cutoff);
  if manifest is distinct from (case when jsonb_array_length(entries)>50 then entries-50 else entries end) then raise exception 'task_retention_stale';end if;
 end if;
 stamp:=encode(sha256(convert_to(jsonb_build_array(cutoff,manifest)::text,'UTF8')),'hex');
 if p_action='preview' then
  return jsonb_build_object('version','teacher-task-retention-v1','fingerprint',stamp,'files',jsonb_array_length(manifest),
   'bytes',(select coalesce(sum((x->>'file_bytes')::integer),0) from jsonb_array_elements(manifest) x),'hasMore',jsonb_array_length(entries)>50);
 end if;
 if stamp<>p_payload->>'fingerprint' then raise exception 'task_retention_stale';end if;
 insert into public.teacher_task_cleanup_runs(actor_id,request_id,fingerprint,before_at,file_count)
  values(p_actor,nonce,stamp,cutoff,jsonb_array_length(manifest)) returning * into run;
 insert into public.security_audit_log(actor_user_id,actor_role,action,outcome,target_type,target_key,details) values(p_actor,'admin','admin.teacher_task_orphans_queued','success','task_cleanup',run.id::text,jsonb_build_object('files',run.file_count,'before',cutoff));
 for f in select x from jsonb_array_elements(manifest) x loop
  insert into private.teacher_task_privacy_scopes(transaction_id,backend_pid,asset_id,asset_kind)
   values(txid_current(),pg_backend_pid(),(f->>'id')::uuid,f->>'kind');
  insert into public.teacher_task_storage_deletions(owner_id,cleanup_id,asset_id,asset_kind,object_path,file_bytes,not_before)
   values((f->>'owner_id')::uuid,run.id,(f->>'id')::uuid,f->>'kind',f->>'object_path',(f->>'file_bytes')::integer,(f->>'upload_lease_until')::timestamptz);
  if f->>'kind'='source' then delete from public.teacher_task_source_files where id=(f->>'id')::uuid;
  else delete from public.teacher_task_response_files where id=(f->>'id')::uuid;end if;
 end loop;
 delete from private.teacher_task_privacy_scopes where transaction_id=txid_current() and backend_pid=pg_backend_pid();
 perform private.supplementary_session(p_actor,p_auth);
 return jsonb_build_object('version','teacher-task-retention-v1','cleanupId',run.id,'files',run.file_count,'replayed',false);
exception when invalid_text_representation or numeric_value_out_of_range or datetime_field_overflow or invalid_datetime_format then raise exception 'task_privacy_invalid';
end;$$;
create function public.service_teacher_task_retention(p_actor uuid,p_auth uuid,p_action text,p_payload jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.service_teacher_task_retention(p_actor,p_auth,p_action,p_payload);$$;
revoke all on function private.teacher_task_retention_candidates(timestamptz),private.service_teacher_task_retention(uuid,uuid,text,jsonb),public.service_teacher_task_retention(uuid,uuid,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function private.service_teacher_task_retention(uuid,uuid,text,jsonb),public.service_teacher_task_retention(uuid,uuid,text,jsonb) to service_role;
