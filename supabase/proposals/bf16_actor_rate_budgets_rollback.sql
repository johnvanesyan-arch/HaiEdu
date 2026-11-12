-- Prepared rollback only. First set HAIEDU_RATE_BUDGETS_MODE=off for every
-- deployed consumer and verify readback; removing SQL while enforcing fails
-- closed. Apply only under a separate, explicit production approval.
-- This removes only BF-16 counters and capabilities, never business records.
begin;
drop function public.service_reserve_session_rate_budgets(uuid,uuid,jsonb);
drop function private.reserve_session_rate_budgets(uuid,uuid,jsonb);
drop function public.service_reserve_actor_rate_budgets(uuid,jsonb);
drop function public.service_purge_idle_actor_rate_buckets(integer);
drop function private.reserve_actor_rate_budgets(uuid,jsonb);
drop function private.purge_idle_actor_rate_buckets(integer);
drop table private.actor_rate_buckets;
drop table private.actor_rate_policies;
commit;
