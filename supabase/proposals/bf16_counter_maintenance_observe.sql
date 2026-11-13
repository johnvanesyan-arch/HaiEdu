-- Owner/operator SELECT-only check. No actor IDs, codes, tokens, IPs, email
-- addresses or learner responses are returned. No API role can read this view.
select job_present, job_active, schedule, last_success_at, failures_last_day,
  counter_rows, eligible_expired_rows, oldest_eligible_expiry,
  counter_storage_bytes, maintenance_status
from private.actor_rate_maintenance_health;
