-- Issuers can inspect pending staff invitations; only an active platform admin
-- or the current admin of the target school can revoke them.
alter table public.staff_account_provisioning
  add column revoked_by uuid references public.profiles(id) on delete restrict;
create index staff_provisioning_revoked_by_idx
  on public.staff_account_provisioning(revoked_by) where revoked_by is not null;

create or replace function public.audit_academic_identity_14a() returns trigger
language plpgsql set search_path=public,pg_temp as $$
declare v jsonb := to_jsonb(new);
begin
  insert into public.academic_identity_events
    (table_name,row_id,operation,old_value,new_value,actor_id)
  values(tg_table_name,new.id,tg_op,to_jsonb(old),v,
    coalesce(nullif(v->>'revoked_by','')::uuid,
             nullif(v->>'ended_by','')::uuid,
             nullif(v->>'created_by','')::uuid,
             nullif(v->>'issued_by','')::uuid,auth.uid()));
  return new;
end $$;

create function public.service_list_staff_invites_14b(p_actor uuid)
returns table(invitation_id uuid, recipient_email text, kind text,
  school_name text, subject_name text, school_id uuid,
  created_at timestamptz, expires_at timestamptz, expired boolean)
language sql stable security definer set search_path=public,pg_temp as $$
  select i.id, u.email::text, i.kind,
    coalesce(s.name,i.school_name)::text, sub.name_hy::text, i.school_id,
    i.created_at, i.expires_at, i.expires_at<=now()
  from public.staff_account_provisioning i
  join auth.users u on u.id=i.recipient_id
  left join public.schools s on s.id=i.school_id
  left join public.subjects sub on sub.id=i.subject_id
  where i.accepted_at is null and i.revoked_at is null
    and (exists(select 1 from public.profiles p where p.id=p_actor
          and p.role='admin' and p.account_status='active')
      or (i.kind='teacher' and private.active_school_admin_14b(p_actor,i.school_id)))
  order by i.created_at desc limit 100;
$$;

create function public.service_revoke_staff_invite_14b(p_actor uuid,p_invitation uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v record;
begin
  select kind,school_id,accepted_at,revoked_at into v
    from public.staff_account_provisioning where id=p_invitation for update;
  if not found or v.accepted_at is not null or v.revoked_at is not null then
    return false;
  end if;
  if not exists(select 1 from public.profiles p where p.id=p_actor
        and p.role='admin' and p.account_status='active')
     and not (v.kind='teacher' and private.active_school_admin_14b(p_actor,v.school_id)) then
    return false;
  end if;
  update public.staff_account_provisioning
    set revoked_at=now(),revoked_by=p_actor where id=p_invitation;
  return true;
end $$;

revoke all on function public.service_list_staff_invites_14b(uuid),
  public.service_revoke_staff_invite_14b(uuid,uuid)
  from public,anon,authenticated;
grant execute on function public.service_list_staff_invites_14b(uuid),
  public.service_revoke_staff_invite_14b(uuid,uuid) to service_role;
