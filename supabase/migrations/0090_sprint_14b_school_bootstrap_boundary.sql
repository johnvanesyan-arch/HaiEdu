-- Preserve atomic first-admin creation and expose only own-school metadata.
alter table public.schools alter column school_code set not null;
alter table public.schools alter column created_by set not null;
drop policy if exists schools_admin_write on public.schools;
revoke insert,update,delete,truncate on public.schools from public,anon,authenticated,service_role;

create function private.current_school_admin_of_school_14b(p_school uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select exists(select 1 from public.institutional_memberships m
    join public.profiles p on p.id=m.person_id
    where m.school_id=p_school and m.person_id=auth.uid()
      and m.role='school_admin' and m.status='active'
      and m.valid_from<=now() and (m.valid_to is null or m.valid_to>now())
      and p.role='school_admin' and p.account_status='active');
$$;
revoke all on function private.current_school_admin_of_school_14b(uuid) from public,anon;
grant execute on function private.current_school_admin_of_school_14b(uuid) to authenticated;
create policy schools_own_admin_read_14b on public.schools for select to authenticated
  using (private.current_school_admin_of_school_14b(id));
