-- A platform admin can create a school and its first admin in one transaction.
alter table public.schools add column school_code text
  check (school_code ~ '^[A-Z0-9][A-Z0-9-]{2,31}$');
alter table public.schools add constraint schools_school_code_unique unique(school_code);
alter table public.schools add column created_by uuid references public.profiles(id) on delete restrict;
create index schools_created_by_idx on public.schools(created_by) where created_by is not null;
create trigger audit_school_bootstrap_14b after insert or update on public.schools
  for each row execute function public.audit_academic_identity_14a();

create function public.service_bootstrap_school_14b(
  p_actor uuid, p_first_admin uuid, p_name text, p_code text
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_target record; v_school uuid; v_membership uuid;
begin
  if p_actor is null or p_first_admin is null or p_actor=p_first_admin
     or p_name is null or length(btrim(p_name))<3 or length(btrim(p_name))>160
     or p_code is null or p_code !~ '^[A-Z0-9][A-Z0-9-]{2,31}$'
     or not exists(select 1 from public.profiles where id=p_actor
       and role='admin' and account_status='active') then
    raise exception 'school_bootstrap_unavailable' using errcode='P0001';
  end if;
  select p.id,p.role::text as role,p.account_status,u.email_confirmed_at
    into v_target from public.profiles p join auth.users u on u.id=p.id
    where p.id=p_first_admin for update of p;
  if not found or v_target.account_status is distinct from 'active'
     or v_target.email_confirmed_at is null
     or v_target.role not in ('student','school_admin') then
    raise exception 'school_bootstrap_unavailable' using errcode='P0001';
  end if;
  -- Converting a new account must not relabel a learner's historical identity.
  if v_target.role='student' then
    if exists(select 1 from public.learning_sessions where student_id=p_first_admin)
       or exists(select 1 from public.class_memberships where student_id=p_first_admin)
       or exists(select 1 from public.institutional_memberships where person_id=p_first_admin)
       or exists(select 1 from public.institutional_invitations where recipient_user_id=p_first_admin)
    then raise exception 'school_bootstrap_unavailable' using errcode='P0001'; end if;
    update public.profiles set role='school_admin',updated_at=now() where id=p_first_admin;
  end if;
  insert into public.schools(name,school_code,created_by)
    values(btrim(p_name),p_code,p_actor) returning id into v_school;
  if v_target.role='student' then
    insert into public.academic_identity_events
      (table_name,row_id,operation,old_value,new_value,actor_id)
    values('profiles',p_first_admin,'SCHOOL_ADMIN_BOOTSTRAP_ROLE',
      jsonb_build_object('role','student'),
      jsonb_build_object('role','school_admin','school_id',v_school),p_actor);
  end if;
  insert into public.institutional_memberships
    (school_id,person_id,role,valid_from,status,created_by)
    values(v_school,p_first_admin,'school_admin',now(),'active',p_actor)
    returning id into v_membership;
  return jsonb_build_object('schoolId',v_school,'membershipId',v_membership);
end $$;
revoke all on function public.service_bootstrap_school_14b(uuid,uuid,text,text)
  from public,anon,authenticated;
grant execute on function public.service_bootstrap_school_14b(uuid,uuid,text,text) to service_role;
