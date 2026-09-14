create or replace function public.service_validate_active_session(p_user_id uuid, p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.profiles p
    join auth.users u on u.id = p.id
    join auth.sessions s on s.user_id = p.id
    where p.id = p_user_id
      and p.account_status = 'active'
      and s.id = p_session_id
      and (s.not_after is null or s.not_after > now())
      and u.deleted_at is null
      and (u.banned_until is null or u.banned_until <= now())
  );
$$;

revoke all on function public.service_validate_active_session(uuid, uuid) from public;
revoke all on function public.service_validate_active_session(uuid, uuid) from anon;
revoke all on function public.service_validate_active_session(uuid, uuid) from authenticated;
grant execute on function public.service_validate_active_session(uuid, uuid) to service_role;

comment on function public.service_validate_active_session(uuid, uuid) is
'Sprint 10 server-side authorization gate for service-role Edge Functions. Requires an active application profile, non-banned/non-deleted Auth user, and a live auth.sessions row matching the JWT session_id.';
