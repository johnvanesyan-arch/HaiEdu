-- Pause only BF-16 housekeeping. Does not change application enforcement,
-- erase counters/history, remove pg_cron or disturb any other scheduled job.
-- Production SQL write: obtain the owner's approval for this specific action.
select cron.alter_job(
  job_id := (select jobid from cron.job where jobname = 'haiedu-bf16-counter-maintenance'
    and username = current_user and database = current_database()),
  active := false
);
