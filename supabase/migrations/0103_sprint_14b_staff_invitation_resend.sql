-- Reserve a bounded resend attempt before asking Supabase Auth to deliver a fresh invite.
-- The existing recipient identity and pending institutional grant are unchanged.
alter table public.staff_account_provisioning
  add column resend_attempts integer not null default 0
    constraint staff_provisioning_resend_attempts_check check (resend_attempts between 0 and 3),
  add column last_resend_attempt_at timestamptz;

create function public.service_claim_staff_invite_resend_14b(
  p_actor uuid, p_invitation uuid
) returns table(recipient_id uuid, recipient_email text)
language plpgsql security definer set search_path=public,pg_temp as $$
declare v record;
begin
  select i.*,u.email::text as contact_email,u.email_confirmed_at,
         p.role::text as profile_role,p.account_status as profile_status
    into v
    from public.staff_account_provisioning i
    join auth.users u on u.id=i.recipient_id
    join public.profiles p on p.id=i.recipient_id
    where i.id=p_invitation for update of i;
  if not found or v.accepted_at is not null or v.revoked_at is not null
     or v.expires_at<=now() or v.email_confirmed_at is not null
     or v.profile_role is distinct from 'student'
     or v.profile_status is distinct from 'active'
     or not public.service_authorize_staff_invite_14b(
       p_actor,v.kind,v.school_id,v.subject_id)
     or not public.service_authorize_staff_invite_14b(
       v.issued_by,v.kind,v.school_id,v.subject_id) then
    return;
  end if;
  if v.resend_attempts>=3
     or now()<v.created_at+interval '2 minutes'
     or (v.last_resend_attempt_at is not null
         and now()<v.last_resend_attempt_at+interval '15 minutes') then
    return;
  end if;
  update public.staff_account_provisioning
    set resend_attempts=resend_attempts+1,last_resend_attempt_at=now()
    where id=p_invitation;
  insert into public.academic_identity_events
    (table_name,row_id,operation,old_value,new_value,actor_id)
  values('staff_account_provisioning',p_invitation,'RESEND_REQUESTED',
    jsonb_build_object('resend_attempts',v.resend_attempts),
    jsonb_build_object('resend_attempts',v.resend_attempts+1),p_actor);
  return query select v.recipient_id,v.contact_email;
end $$;

revoke all on function public.service_claim_staff_invite_resend_14b(uuid,uuid)
  from public,anon,authenticated;
grant execute on function public.service_claim_staff_invite_resend_14b(uuid,uuid)
  to service_role;
