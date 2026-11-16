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
