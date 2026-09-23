-- Resolve an existing account by email inside the service boundary. No email
-- copy is added to the public invitation table or returned to browser clients.
create function public.service_lookup_invitee_by_email_14b(p_email text, p_role text)
returns uuid language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_id uuid;
begin
  if p_email is null or length(btrim(p_email)) < 3 or length(p_email) > 320 or
     p_role not in ('student','teacher') then return null; end if;
  select p.id into v_id from auth.users u join public.profiles p on p.id=u.id
    where lower(u.email)=lower(btrim(p_email)) and p.role::text=p_role
      and p.account_status='active' limit 1;
  return v_id;
end $$;
revoke all on function public.service_lookup_invitee_by_email_14b(text,text)
  from public, anon, authenticated;
grant execute on function public.service_lookup_invitee_by_email_14b(text,text) to service_role;
