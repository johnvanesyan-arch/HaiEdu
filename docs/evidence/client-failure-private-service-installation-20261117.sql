-- Exact BF22 private-service installation for reviewed source 7ea3d9806d4d0e646959b158ddf14e032f334c76.
-- No learning rows, frontend flag, build registration or service secret is changed.
-- The single DO statement is atomic, including its precondition and cleanup schedule.
DO $bf22_install$
BEGIN
 PERFORM set_config('lock_timeout','3s',true);
 PERFORM set_config('statement_timeout','30s',true);
 IF (SELECT catalogue_sha256 FROM (
with objects as (
select 'table:'||n.nspname||'.'||c.relname as key, jsonb_build_object('owner',pg_get_userbyid(c.relowner),'acl',c.relacl::text,'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,
'columns',(select jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'default',pg_get_expr(d.adbin,d.adrelid)) order by a.attnum) from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped),
'constraints',(select jsonb_agg(pg_get_constraintdef(k.oid) order by k.conname) from pg_constraint k where k.conrelid=c.oid),
'policies',(select jsonb_agg(jsonb_build_object('name',p.polname,'roles',p.polroles::text,'command',p.polcmd,'permissive',p.polpermissive,'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) order by p.polname) from pg_policy p where p.polrelid=c.oid),
'indexes',(select jsonb_agg(pg_get_indexdef(i.indexrelid) order by i.indexrelid::regclass::text) from pg_index i where i.indrelid=c.oid),
'triggers',(select jsonb_agg(pg_get_triggerdef(t.oid) order by t.tgname) from pg_trigger t where t.tgrelid=c.oid and not t.tgisinternal))::text as definition
from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','private') and c.relkind in ('r','p') and not(n.nspname='private' and c.relname like 'client_failure_%')
union all
select 'function:'||n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')',jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text,'config',p.proconfig)::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private') and p.prokind='f' and not(p.proname in ('purge_client_failures','record_client_failure','service_record_client_failure','service_read_client_failure_summary'))
)
select count(*) as objects,count(*) filter(where key like 'table:%') as tables,count(*) filter(where key like 'function:%') as functions,encode(sha256(convert_to(string_agg(key||E'\n'||definition,E'\n' order by key),'UTF8')),'hex') as catalogue_sha256 from objects
) prior) IS DISTINCT FROM '2967964ab656b681444d4d6dd20281401755921db9b5e8832ca7f001b60d7dd5' THEN RAISE EXCEPTION 'bf22_existing_catalogue_changed'; END IF;
 IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='private' AND c.relname LIKE 'client_failure_%')
 OR EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','private') AND p.proname IN ('purge_client_failures','record_client_failure','service_record_client_failure','service_read_client_failure_summary')) THEN RAISE EXCEPTION 'bf22_objects_already_exist'; END IF;
 EXECUTE $reviewed_bf22_sql$
-- BF-22 private diagnostics. New tables only; no business rows are changed.
create table private.client_failure_builds (
 build_id text primary key check (build_id ~ '^[a-f0-9]{64}$'),
 expires_at timestamptz not null
);
create table private.client_failure_hours (
 hour timestamptz primary key,
 accepted integer not null default 0 check (accepted between 0 and 500),
 dropped integer not null default 0 check (dropped between 0 and 1000000)
);
create table private.client_failure_events (
 actor_id uuid not null references public.profiles(id) on delete cascade,
 event_id uuid not null,
 received_at timestamptz not null,
 build_id text not null references private.client_failure_builds(build_id),
 operation text not null,
 category text not null,
 primary key(actor_id,event_id)
);
create index client_failure_events_admission on private.client_failure_events(actor_id,received_at);
create index client_failure_events_expiry on private.client_failure_events(received_at);
create table private.client_failure_buckets (
 bucket timestamptz not null,
 build_id text not null references private.client_failure_builds(build_id),
 operation text not null,
 category text not null,
 reports integer not null check (reports between 1 and 500),
 actors integer not null check (actors between 1 and 500),
 admin_reports integer not null check (admin_reports between 0 and 500),
 primary key(bucket,build_id,operation,category)
);
-- No raw reports, identities, error messages or response bodies in aggregates.
-- Short-lived admission/dedup linkage is erased when the profile is erased.
alter table private.client_failure_builds enable row level security;
alter table private.client_failure_hours enable row level security;
alter table private.client_failure_events enable row level security;
alter table private.client_failure_buckets enable row level security;
revoke all on private.client_failure_builds,private.client_failure_hours,private.client_failure_events,private.client_failure_buckets from public,anon,authenticated,service_role;

create function private.purge_client_failures() returns void
language plpgsql security definer set search_path='' as $$
begin
 -- The approved activation schedules this every 15 minutes. A 15-minute margin
 -- keeps admission linkage below 24h and aggregates below seven days.
 delete from private.client_failure_events where received_at < clock_timestamp()-interval '23 hours 45 minutes';
 delete from private.client_failure_buckets where bucket < clock_timestamp()-interval '6 days 23 hours 45 minutes';
 delete from private.client_failure_hours where hour < clock_timestamp()-interval '6 days 23 hours 45 minutes';
 delete from private.client_failure_builds b where expires_at < clock_timestamp()
  and not exists(select 1 from private.client_failure_events e where e.build_id=b.build_id)
  and not exists(select 1 from private.client_failure_buckets s where s.build_id=b.build_id);
end;
$$;
revoke all on function private.purge_client_failures() from public,anon,authenticated,service_role;

create function private.record_client_failure(p_actor uuid,p_session uuid,p_report jsonb) returns text
language plpgsql security definer set search_path='' set lock_timeout='250ms' as $$
declare
 observed timestamptz:=clock_timestamp();
 at_hour timestamptz:=date_trunc('hour',observed);
 at_bucket timestamptz:=date_bin(interval '10 minutes',observed,'2000-01-01'::timestamptz);
 actor_role text; build text; operation_name text; category_name text; event uuid;
 accepted_count integer; actor_count integer; is_new_actor integer;
begin
 if not public.service_validate_active_session(p_actor,p_session) then return 'inactive';end if;
 if jsonb_typeof(p_report) is distinct from 'object'
  or (select count(*) from jsonb_object_keys(p_report))<>8
  or not p_report ?& array['schemaVersion','buildId','page','operation','category','status','durationMs','eventId']
  or p_report->'schemaVersion'<>'1'::jsonb
  or jsonb_typeof(p_report->'buildId')<>'string' or (p_report->>'buildId') !~ '^[a-f0-9]{64}$'
  or coalesce(p_report->>'page'=any(array['student','teacher','school_admin','master_admin','content','account','other']),false)=false
  or coalesce(p_report->>'operation'=any(array['dashboard_load','learning_load','answer_submit','draft_save','writing_submit','feedback_publish','assignment_send','audio_load','file_load','admin_action','content_action','auth_action','page_execution']),false)=false
  or coalesce(p_report->>'category'=any(array['service_failure','request_failed','write_unconfirmed','invalid_response','audio_playback','application_exception']),false)=false
  or jsonb_typeof(p_report->'status')<>'number' or (p_report->>'status') !~ '^(0|[1-5][0-9]{2})$'
  or jsonb_typeof(p_report->'durationMs')<>'number' or (p_report->>'durationMs') !~ '^[0-9]{1,5}$'
  or (p_report->>'durationMs')::integer>60000
  or jsonb_typeof(p_report->'eventId')<>'string'
  or (p_report->>'eventId') !~ '^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$'
 then return 'invalid';end if;
 build:=p_report->>'buildId';operation_name:=p_report->>'operation';category_name:=p_report->>'category';event:=(p_report->>'eventId')::uuid;
 if not exists(select 1 from private.client_failure_builds where build_id=build and expires_at>observed) then return 'invalid';end if;
 -- One short independent diagnostic lock. No business operation takes this lock.
 perform pg_catalog.pg_advisory_xact_lock(2026111622);
 perform private.purge_client_failures();
 -- Recheck after the lock so revocation and expiry fail closed.
 if not public.service_validate_active_session(p_actor,p_session) then return 'inactive';end if;
 if exists(select 1 from private.client_failure_events where actor_id=p_actor and event_id=event) then return 'duplicate';end if;
 if exists(select 1 from private.client_failure_events where actor_id=p_actor and build_id=build
   and operation=operation_name and category=category_name and received_at>observed-interval '1 minute') then return 'duplicate';end if;
 insert into private.client_failure_hours(hour) values(at_hour) on conflict do nothing;
 select accepted into accepted_count from private.client_failure_hours where hour=at_hour;
 select count(*) into actor_count from private.client_failure_events where actor_id=p_actor and received_at>=at_hour;
 if accepted_count>=500 or actor_count>=5 then
  update private.client_failure_hours set dropped=least(dropped+1,1000000) where hour=at_hour;return 'limited';
 end if;
 select role::text into actor_role from public.profiles where id=p_actor;
 select case when exists(select 1 from private.client_failure_events where actor_id=p_actor and build_id=build
   and operation=operation_name and category=category_name and received_at>=at_bucket) then 0 else 1 end into is_new_actor;
 insert into private.client_failure_events(actor_id,event_id,received_at,build_id,operation,category)
  values(p_actor,event,observed,build,operation_name,category_name);
 insert into private.client_failure_buckets(bucket,build_id,operation,category,reports,actors,admin_reports)
  values(at_bucket,build,operation_name,category_name,1,1,case when actor_role in ('admin','school_admin') then 1 else 0 end)
  on conflict(bucket,build_id,operation,category) do update set
   reports=private.client_failure_buckets.reports+1,
   actors=private.client_failure_buckets.actors+is_new_actor,
   admin_reports=private.client_failure_buckets.admin_reports+excluded.admin_reports;
 update private.client_failure_hours set accepted=accepted+1 where hour=at_hour;
 return 'accepted';
exception when lock_not_available then return 'limited';
end;
$$;
revoke all on function private.record_client_failure(uuid,uuid,jsonb) from public,anon,authenticated,service_role;

create function public.service_record_client_failure(p_actor uuid,p_session uuid,p_report jsonb) returns text
language sql security definer set search_path='' as $$
 select private.record_client_failure(p_actor,p_session,p_report);
$$;
revoke all on function public.service_record_client_failure(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.service_record_client_failure(uuid,uuid,jsonb) to service_role;

create function public.service_read_client_failure_summary() returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 perform private.purge_client_failures();
 -- Hourly best-effort polling includes 70 minutes, including the last bucket.
 -- No identity, event ID, raw payload or client-supplied build is projected.
 select coalesce(jsonb_agg(jsonb_build_object('category',s.category,'operation',s.operation,'count',s.reports)
  order by s.category,s.operation),'[]'::jsonb) into result
 from (select category,operation,max(reports) reports from private.client_failure_buckets
  where bucket>=clock_timestamp()-interval '70 minutes' and reports>=3 and (actors>=2 or admin_reports>=3)
  group by category,operation) s;
 return result;
end;
$$;
revoke all on function public.service_read_client_failure_summary() from public,anon,authenticated;
grant execute on function public.service_read_client_failure_summary() to service_role;

comment on function public.service_record_client_failure(uuid,uuid,jsonb) is 'Internal service-only BF22 collector; live-session gate, registered builds, fixed categories, 5 reports/actor/hour and 500/project/hour. Browser reports are untrusted symptoms.';
comment on function public.service_read_client_failure_summary() is 'Service-only fixed BF22 incident candidates. No raw diagnostics or identifiers. Silence never establishes recovery.';

-- Separate provider operation. Do not run until the exact rollout is approved.
-- Run as the database owner, after the reviewed forward update. App tables,
-- function source and existing BF16 scheduling are not altered by this file.
do $$
begin
 if exists(select 1 from cron.job where jobname='haiedu-bf22-client-failure-retention') then
  raise exception 'client_failure_retention_already_registered';
 end if;
end;
$$;
select cron.schedule('haiedu-bf22-client-failure-retention','*/15 * * * *',$job$
 select private.purge_client_failures();
 delete from cron.job_run_details where jobid=(select jobid from cron.job where jobname='haiedu-bf22-client-failure-retention')
  and end_time<clock_timestamp()-interval '7 days' and status in ('succeeded','failed');
$job$);

$reviewed_bf22_sql$;
END;
$bf22_install$;
