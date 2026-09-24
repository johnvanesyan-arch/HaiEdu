-- Archive is a blocked account state kept out of the everyday admin list.
-- Restoration returns it to suspended; activation remains a separate action.
alter table public.profiles drop constraint if exists profiles_account_status_check;
alter table public.profiles add constraint profiles_account_status_check
  check (account_status in ('active', 'suspended', 'archived', 'deletion_pending'));

-- Service-only preflight for staff deletion. Foreign keys with RESTRICT / NO
-- ACTION must be offboarded, and CASCADE-linked academic evidence must never
-- disappear just because a profile's current role is staff. The only
-- deliberate cascade here is the account's own privacy preferences.
create function public.service_account_deletion_blockers(p_user_id uuid)
returns text[]
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_fk record;
  v_has_rows boolean;
  v_blockers text[] := '{}'::text[];
begin
  for v_fk in
    select c.conrelid::regclass as child_table, a.attname as child_column
    from pg_catalog.pg_constraint c
    join pg_catalog.pg_attribute a
      on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    where c.contype = 'f'
      and c.confrelid = 'public.profiles'::regclass
      and c.confdeltype in ('a', 'r', 'c')
      and array_length(c.conkey, 1) = 1
      and c.conrelid <> 'public.privacy_preferences'::regclass
    order by c.conrelid::regclass::text, a.attname
  loop
    execute format('select exists(select 1 from %s where %I = $1)', v_fk.child_table, v_fk.child_column)
      into v_has_rows using p_user_id;
    if v_has_rows then
      v_blockers := array_append(v_blockers, format('%s.%I', v_fk.child_table, v_fk.child_column));
    end if;
  end loop;
  return v_blockers;
end;
$$;

revoke all on function public.service_account_deletion_blockers(uuid) from public, anon, authenticated;
grant execute on function public.service_account_deletion_blockers(uuid) to service_role;

-- Recheck inside the profile deletion transaction, so a newly linked row
-- cannot slip between the Edge Function preflight and Auth's delete cascade.
create function private.guard_archived_staff_deletion()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if old.role <> 'student'::public.user_role
    and old.account_status = 'archived'
    and cardinality(public.service_account_deletion_blockers(old.id)) > 0 then
    raise exception 'staff_offboarding_required' using errcode = '23503';
  end if;
  return old;
end;
$$;
revoke all on function private.guard_archived_staff_deletion() from public, anon, authenticated;
create trigger guard_archived_staff_deletion
before delete on public.profiles
for each row execute function private.guard_archived_staff_deletion();
