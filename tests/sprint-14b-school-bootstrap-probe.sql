-- Rollback-only production probe. Temporarily repurpose the existing content
-- reviewer profile as an empty candidate; every row change is rolled back.
begin;
create temporary table _bootstrap_ids (platform_admin uuid, candidate uuid, second_candidate uuid, learner uuid) on commit drop;
insert into _bootstrap_ids
select (select id from public.profiles where role='admin' and account_status='active' limit 1),
       (select id from public.profiles where role='content_admin' and account_status='active' limit 1),
       (select id from public.profiles where role='teacher' and account_status='active' limit 1),
       (select p.id from public.profiles p where p.role='student' and
           exists(select 1 from public.learning_sessions s where s.student_id=p.id) limit 1);
do $$
declare f record;
begin
  select * into f from _bootstrap_ids;
  if f.platform_admin is null or f.candidate is null or f.second_candidate is null or f.learner is null then
    raise exception 'bootstrap_fixture_missing'; end if;
  if exists(select 1 from public.learning_sessions where student_id=f.candidate) or
     exists(select 1 from public.class_memberships where student_id=f.candidate) or
     not exists(select 1 from auth.users where id=f.candidate and email_confirmed_at is not null) then
    raise exception 'candidate_not_empty_confirmed_account'; end if;
  update public.profiles set role='student' where id=f.candidate;
  -- The teacher is also converted only within this rollback fixture to stand
  -- in for a second new account; no teacher record is persisted or relabeled.
  update public.profiles set role='student' where id=f.second_candidate;
end $$;
grant select on _bootstrap_ids to service_role,authenticated;
set local role service_role;
do $$
declare f record; one jsonb; two jsonb; denied boolean; manual_code boolean;
begin
  select * into f from _bootstrap_ids;
  denied:=false;
  begin
    perform public.service_bootstrap_school_14b(f.learner,f.candidate,'Unauthorized School',null);
  exception when raise_exception then denied:=true; end;
  if not denied then raise exception 'learner_bootstrap_allowed'; end if;

  denied:=false;
  begin
    perform public.service_bootstrap_school_14b(f.platform_admin,f.learner,'Historical Student',null);
  exception when raise_exception then denied:=true; end;
  if not denied then raise exception 'historical_learner_promotion_allowed'; end if;

  one:=public.service_bootstrap_school_14b(f.platform_admin,f.candidate,'Fixture School A',null);
  if (select role::text from public.profiles where id=f.candidate)<>'school_admin' or
     not exists(select 1 from public.institutional_memberships
       where id=(one->>'membershipId')::uuid and school_id=(one->>'schoolId')::uuid
       and person_id=f.candidate and role='school_admin' and status='active') or
     not exists(select 1 from public.academic_identity_events
       where row_id=f.candidate and operation='SCHOOL_ADMIN_BOOTSTRAP_ROLE'
         and actor_id=f.platform_admin and new_value->>'school_id'=one->>'schoolId') then
    raise exception 'atomic_first_admin_or_audit_failed'; end if;

  denied:=false;
  begin
    perform public.service_bootstrap_school_14b(f.candidate,f.learner,'Privilege Escalation',null);
  exception when raise_exception then denied:=true; end;
  if not denied then raise exception 'school_admin_created_another_school'; end if;

  manual_code:=false;
  begin
    perform public.service_bootstrap_school_14b(f.platform_admin,f.candidate,'Manual Code','QA-14B-A');
  exception when raise_exception then manual_code:=true; end;
  if not manual_code then raise exception 'manual_school_code_allowed'; end if;

  two:=public.service_bootstrap_school_14b(f.platform_admin,f.second_candidate,'Fixture School B',null);
  if (one->>'schoolId')=(two->>'schoolId') or
     (select count(*) from public.institutional_memberships where person_id in(f.candidate,f.second_candidate) and
       school_id in ((one->>'schoolId')::uuid,(two->>'schoolId')::uuid))<>2 or
     one->>'schoolCode' !~ '^SCH-[A-F0-9]{16}$' or
     two->>'schoolCode' !~ '^SCH-[A-F0-9]{16}$' or
     one->>'schoolCode'=two->>'schoolCode' or
     (select school_code from public.schools where id=(one->>'schoolId')::uuid)<>one->>'schoolCode' then
    raise exception 'separate_school_identity_failed'; end if;
end $$;
set local role authenticated;
do $$
declare f record;
begin
  select * into f from _bootstrap_ids;
  perform set_config('request.jwt.claim.sub',f.candidate::text,true);
  if (select count(*) from public.schools)<>1 or
     not exists(select 1 from public.schools where created_by=f.platform_admin and name='Fixture School A') then
    raise exception 'school_a_admin_saw_other_school'; end if;
  perform set_config('request.jwt.claim.sub',f.second_candidate::text,true);
  if (select count(*) from public.schools)<>1 or
     not exists(select 1 from public.schools where created_by=f.platform_admin and name='Fixture School B') then
    raise exception 'school_b_admin_saw_other_school'; end if;
  perform set_config('request.jwt.claim.sub',f.learner::text,true);
  if exists(select 1 from public.schools) then
    raise exception 'student_saw_school'; end if;
end $$;
rollback;
