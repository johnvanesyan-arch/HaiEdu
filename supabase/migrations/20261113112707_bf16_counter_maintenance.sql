-- BF-16 housekeeping candidate. Applying this migration installs/enables only
-- the named counter-cleanup job; it does not enable application rate limits.
-- Production application requires the owner's specific approval.
begin;

create extension if not exists pg_cron with schema pg_catalog;

-- Refuse to overwrite an unrelated job, including one left by another release.
do $check$
begin
  if exists (select 1 from cron.job where jobname = 'haiedu-bf16-counter-maintenance'
    and username = current_user) then
    raise exception 'bf16_maintenance_job_already_exists';
  end if;
end;
$check$;

create function private.run_actor_rate_maintenance()
returns jsonb
language plpgsql security invoker
set search_path = pg_catalog
as $function$
declare
  v_deleted integer;
  v_history_deleted integer;
  v_job_id bigint;
begin
  -- A duplicate/manual invocation never queues behind the running cleaner.
  if not pg_try_advisory_xact_lock(hashtextextended('haiedu:actor-rate:maintenance:v1', 0)) then
    return jsonb_build_object('skipped', true);
  end if;

  select jobid into v_job_id from cron.job
    where jobname = 'haiedu-bf16-counter-maintenance'
      and username = current_user and database = current_database();
  if v_job_id is null then
    raise exception 'bf16_maintenance_job_missing';
  end if;

  -- The existing primitive checks both idle expiry and fully repaid debt,
  -- skips locked rows and deletes at most500 actor/policy counter rows.
  v_deleted := private.purge_idle_actor_rate_buckets(500);

  -- pg_cron does not prune run history. Touch only this job's completed runs,
  -- retain seven days, and bound each pruning pass independently to500 rows.
  with stale as (
    select runid from cron.job_run_details
    where jobid = v_job_id and end_time < clock_timestamp() - interval '7 days'
    order by end_time, runid limit 500
  )
  delete from cron.job_run_details h using stale s where h.runid = s.runid;
  get diagnostics v_history_deleted = row_count;
  return jsonb_build_object('skipped', false, 'counterRowsRemoved', v_deleted,
    'ownHistoryRowsRemoved', v_history_deleted);
end;
$function$;

revoke all on function private.run_actor_rate_maintenance()
  from public, anon, authenticated, service_role;

-- Database-local work: no external API, mail, service key or learner workflow.
-- A failed/timed-out run remains visible in cron.job_run_details.
select cron.schedule(
  'haiedu-bf16-counter-maintenance',
  '*/15 * * * *',
  -- pg_cron background workers own the transaction. Explicit BEGIN/COMMIT
  -- fails on that execution path. These settings belong to the job connection.
  $job$set statement_timeout = '5s';
set lock_timeout = '1s';
select private.run_actor_rate_maintenance();
$job$
);

create view private.actor_rate_maintenance_health
with (security_invoker = true)
as
with job as (
  select jobid, active, schedule from cron.job
  where jobname = 'haiedu-bf16-counter-maintenance'
    and username = current_user and database = current_database()
), runs as (
  select max(end_time) filter (where status = 'succeeded') as last_success_at,
    count(*) filter (where status = 'failed' and start_time > clock_timestamp() - interval '24 hours') as failures_last_day
  from cron.job_run_details where jobid = (select jobid from job)
), counters as (
  select count(*) as counter_rows,
    count(*) filter (where expires_at <= clock_timestamp()
      and debt_until_us <= (extract(epoch from clock_timestamp()) *1000000)::bigint) as eligible_expired_rows,
    min(expires_at) filter (where expires_at <= clock_timestamp()
      and debt_until_us <= (extract(epoch from clock_timestamp()) *1000000)::bigint) as oldest_eligible_expiry
  from private.actor_rate_buckets
)
select exists(select 1 from job) as job_present,
  coalesce((select active from job), false) as job_active,
  (select schedule from job) as schedule,
  r.last_success_at, r.failures_last_day,
  c.counter_rows, c.eligible_expired_rows, c.oldest_eligible_expiry,
  pg_total_relation_size('private.actor_rate_buckets'::regclass) as counter_storage_bytes,
  case
    when not exists(select 1 from job) then 'job_missing'
    when not (select active from job) then 'job_paused'
    when r.last_success_at is null then 'awaiting_first_success'
    when r.last_success_at < clock_timestamp() - interval '45 minutes' then 'cleanup_overdue'
    when r.failures_last_day > 0 then 'recent_failure'
    when c.oldest_eligible_expiry < clock_timestamp() - interval '1 hour' then 'expired_backlog'
    else 'ok'
  end as maintenance_status
from runs r cross join counters c;

revoke all on private.actor_rate_maintenance_health
  from public, anon, authenticated, service_role;

commit;
