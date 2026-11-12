-- BF-16 candidate migration; generated with Supabase CLI 3.1.0.
-- Repository preparation only. No production application or enforcement approval.
-- Candidate policy values are unchanged from the separately tested foundation.
begin;

create schema if not exists private;

create table private.actor_rate_policies (
  policy_key text primary key check (policy_key in
    ('app', 'session_start', 'code_redemption', 'invitation_email')),
  capacity integer not null check (capacity between 1 and 10000),
  token_interval_us bigint not null check (token_interval_us between 1000 and 3600000000),
  retention_seconds integer not null check (retention_seconds between 3600 and 259200),
  check (capacity::bigint * token_interval_us <= retention_seconds::bigint * 1000000)
);

-- Candidate test policies: sustained refill / initial burst. No live settings.
-- app 120/min / 60; start 30/min / 10; code 10/10min / 10; email 120/hour / 100.
insert into private.actor_rate_policies values
  ('app', 60, 500000, 86400),
  ('session_start', 10, 2000000, 86400),
  ('code_redemption', 10, 60000000, 86400),
  ('invitation_email', 100, 30000000, 86400);

create table private.actor_rate_buckets (
  actor_id uuid not null references auth.users(id) on delete cascade,
  policy_key text not null references private.actor_rate_policies(policy_key),
  -- Integer microseconds of virtual debt avoid floating-point token drift.
  debt_until_us bigint not null check (debt_until_us >= 0),
  expires_at timestamptz not null,
  primary key (actor_id, policy_key)
);
create index actor_rate_buckets_expiry_idx
  on private.actor_rate_buckets (expires_at, actor_id, policy_key);

alter table private.actor_rate_policies enable row level security;
alter table private.actor_rate_buckets enable row level security;
revoke all on private.actor_rate_policies, private.actor_rate_buckets
  from public, anon, authenticated, service_role;

-- Narrow, service-only capability. This primitive is deliberately not an Auth
-- or permission check. Its caller must supply the already verified actor; it
-- must commit the reservation before a separate fallible business transaction.
create function private.reserve_actor_rate_budgets(p_actor uuid, p_costs jsonb)
returns jsonb
language plpgsql security definer
set search_path = pg_catalog
as $function$
declare
  v_key text;
  v_value jsonb;
  v_cost integer;
  v_policy private.actor_rate_policies%rowtype;
  v_requested jsonb := '{}'::jsonb;
  v_changes jsonb := '{}'::jsonb;
  v_remaining jsonb := '{}'::jsonb;
  v_now timestamptz;
  v_now_us bigint;
  v_old bigint;
  v_base bigint;
  v_next bigint;
  v_ceiling bigint;
  v_before integer;
  v_retry integer := 0;
begin
  if p_actor is null or p_actor = '00000000-0000-0000-0000-000000000000'::uuid
     or p_costs is null or jsonb_typeof(p_costs) <> 'object' then
    raise exception 'invalid_rate_budget_request' using errcode = '22023';
  end if;
  if (select count(*) from jsonb_object_keys(p_costs)) not between 1 and 4 then
    raise exception 'invalid_rate_budget_request' using errcode = '22023';
  end if;

  -- Keep account deletion/cascade and this reservation mutually consistent.
  perform 1 from auth.users where id = p_actor for key share;
  if not found then
    raise exception 'rate_budget_actor_unavailable' using errcode = '22023';
  end if;

  -- Lock the fixed registry in canonical order. The service role cannot alter
  -- policies; these locks also prevent a maintenance edit mixing two versions.
  for v_key, v_value in select key, value from jsonb_each(p_costs) order by key loop
    if jsonb_typeof(v_value) <> 'number' or v_value::text !~ '^[1-9][0-9]{0,4}$' then
      raise exception 'invalid_rate_budget_cost' using errcode = '22023';
    end if;
    v_cost := (v_value::text)::integer;
    select * into v_policy from private.actor_rate_policies
      where policy_key = v_key for share;
    if not found or v_cost > v_policy.capacity then
      raise exception 'invalid_rate_budget_policy_or_cost' using errcode = '22023';
    end if;
    v_requested := v_requested || jsonb_build_object(v_key,
      jsonb_build_object('cost', v_cost, 'capacity', v_policy.capacity,
        'interval', v_policy.token_interval_us, 'retention', v_policy.retention_seconds));
  end loop;

  -- Serialize this person's requests across workers, sessions and missing rows.
  -- A hash collision can briefly share a lock, never an allowance/state key.
  perform pg_advisory_xact_lock(hashtextextended('haiedu:actor-rate:v1:' || p_actor::text, 0));
  perform 1 from private.actor_rate_buckets
    where actor_id = p_actor and policy_key in (select jsonb_object_keys(v_requested))
    order by policy_key for update;

  -- Capture real server time AFTER waiting for locks. No caller clock argument.
  v_now := clock_timestamp();
  v_now_us := (extract(epoch from v_now) * 1000000)::bigint;
  for v_key, v_value in select key, value from jsonb_each(v_requested) order by key loop
    select debt_until_us into v_old from private.actor_rate_buckets
      where actor_id = p_actor and policy_key = v_key;
    v_base := greatest(coalesce(v_old, v_now_us), v_now_us);
    v_next := v_base + (v_value->>'cost')::bigint * (v_value->>'interval')::bigint;
    v_ceiling := v_now_us + (v_value->>'capacity')::bigint * (v_value->>'interval')::bigint;
    v_before := greatest(0, least((v_value->>'capacity')::integer,
      ((v_ceiling - v_base) / (v_value->>'interval')::bigint)::integer));
    v_remaining := v_remaining || jsonb_build_object(v_key, v_before);
    v_changes := v_changes || jsonb_build_object(v_key,
      jsonb_build_object('debt', v_next, 'retention', (v_value->>'retention')::integer));
    if v_next > v_ceiling then
      v_retry := greatest(v_retry, ((v_next - v_ceiling + 999999) / 1000000)::integer);
    end if;
  end loop;

  if v_retry > 0 then
    -- No partial spend, new bucket, expiry extension or denial-event write.
    return jsonb_build_object('allowed', false, 'retryAfterSeconds', v_retry,
      'remaining', v_remaining);
  end if;

  for v_key, v_value in select key, value from jsonb_each(v_changes) order by key loop
    insert into private.actor_rate_buckets(actor_id, policy_key, debt_until_us, expires_at)
      values (p_actor, v_key, (v_value->>'debt')::bigint,
        v_now + (v_value->>'retention')::integer * interval '1 second')
      on conflict (actor_id, policy_key) do update set
        debt_until_us = excluded.debt_until_us, expires_at = excluded.expires_at;
    v_remaining := jsonb_set(v_remaining, array[v_key], to_jsonb(
      (v_remaining->>v_key)::integer - (v_requested->v_key->>'cost')::integer));
  end loop;
  return jsonb_build_object('allowed', true, 'retryAfterSeconds', 0,
    'remaining', v_remaining);
end;
$function$;

create function private.purge_idle_actor_rate_buckets(p_limit integer default 200)
returns integer
language plpgsql security definer
set search_path = pg_catalog
as $function$
declare
  v_now timestamptz := clock_timestamp();
  v_now_us bigint := (extract(epoch from v_now) * 1000000)::bigint;
  v_deleted integer;
begin
  if p_limit is null or p_limit not between 1 and 500 then
    raise exception 'invalid_rate_budget_cleanup_limit' using errcode = '22023';
  end if;
  with expired as (
    select actor_id, policy_key from private.actor_rate_buckets
      where expires_at <= v_now and debt_until_us <= v_now_us
      order by expires_at, actor_id, policy_key
      for update skip locked limit p_limit
  )
  delete from private.actor_rate_buckets b using expired e
    where b.actor_id = e.actor_id and b.policy_key = e.policy_key;
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$function$;

-- Service-only primitives used by the session-bound wrapper below.
-- Maintenance is bounded; no production cleanup schedule is installed here.
create function public.service_reserve_actor_rate_budgets(p_actor uuid, p_costs jsonb)
returns jsonb language sql security invoker set search_path = pg_catalog
as $$ select private.reserve_actor_rate_budgets(p_actor, p_costs); $$;

create function public.service_purge_idle_actor_rate_buckets(p_limit integer default 200)
returns integer language sql security invoker set search_path = pg_catalog
as $$ select private.purge_idle_actor_rate_buckets(p_limit); $$;

revoke all on function private.reserve_actor_rate_budgets(uuid, jsonb),
  private.purge_idle_actor_rate_buckets(integer),
  public.service_reserve_actor_rate_budgets(uuid, jsonb),
  public.service_purge_idle_actor_rate_buckets(integer)
  from public, anon, authenticated;
grant usage on schema private to service_role;
grant execute on function private.reserve_actor_rate_budgets(uuid, jsonb),
  private.purge_idle_actor_rate_buckets(integer),
  public.service_reserve_actor_rate_budgets(uuid, jsonb),
  public.service_purge_idle_actor_rate_buckets(integer) to service_role;

-- Auth-session binding is deliberately separate from profile/role permission.
-- In particular, a deletion_pending person must retain the existing right to
-- cancel deletion. Every endpoint still applies its own role/MFA/tenant checks.
create function private.reserve_session_rate_budgets(p_actor uuid, p_session uuid, p_costs jsonb)
returns jsonb
language plpgsql security definer
set search_path = pg_catalog
as $function$
declare
  v_result jsonb;
begin
  if p_actor is null or p_session is null or not exists (
    select 1 from auth.sessions s join auth.users u on u.id=s.user_id
    where s.id=p_session and s.user_id=p_actor and u.deleted_at is null
      and (u.banned_until is null or u.banned_until<=clock_timestamp())
      and (s.not_after is null or s.not_after>clock_timestamp())
  ) then
    raise exception 'rate_budget_session_inactive' using errcode='42501';
  end if;
  v_result:=private.reserve_actor_rate_budgets(p_actor,p_costs);
  -- The actor lock can have waited. Re-read after admission, using wall-clock
  -- time, so expiry/revocation during that wait rolls this reservation back.
  if not exists (
    select 1 from auth.sessions s join auth.users u on u.id=s.user_id
    where s.id=p_session and s.user_id=p_actor and u.deleted_at is null
      and (u.banned_until is null or u.banned_until<=clock_timestamp())
      and (s.not_after is null or s.not_after>clock_timestamp())
  ) then
    raise exception 'rate_budget_session_inactive' using errcode='42501';
  end if;
  return v_result;
end;
$function$;

create function public.service_reserve_session_rate_budgets(p_actor uuid,p_session uuid,p_costs jsonb)
returns jsonb language sql security invoker set search_path=pg_catalog
as $$ select private.reserve_session_rate_budgets(p_actor,p_session,p_costs); $$;
revoke all on function private.reserve_session_rate_budgets(uuid,uuid,jsonb),
  public.service_reserve_session_rate_budgets(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function private.reserve_session_rate_budgets(uuid,uuid,jsonb),
  public.service_reserve_session_rate_budgets(uuid,uuid,jsonb) to service_role;

commit;
