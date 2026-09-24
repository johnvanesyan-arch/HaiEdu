-- Resolve a pending invitation from the signed-in recipient's identity.
create function public.service_accept_staff_invite_14b(p_recipient uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_request uuid;
begin
  select id into v_request from public.staff_account_provisioning
    where recipient_id=p_recipient and accepted_at is null and revoked_at is null
      and expires_at>now() for update;
  if v_request is null then
    raise exception 'staff_invite_unavailable' using errcode='P0001'; end if;
  return public.service_accept_staff_invite_14b(p_recipient,v_request);
end $$;
revoke all on function public.service_accept_staff_invite_14b(uuid)
  from public,anon,authenticated;
grant execute on function public.service_accept_staff_invite_14b(uuid) to service_role;
