-- Permit independently governed chapters without superseding another chapter's
-- release, sessions or evidence. A unit still has at most one active release.
-- No release, blueprint, gate, model or learner record is activated here.
lock table public.curriculum_releases in share row exclusive mode;
lock table public.curriculum_release_units in share row exclusive mode;

-- Governance writes inspect current multi-table catalogue state. Older
-- transaction snapshots must fail explicitly rather than omit a concurrent
-- attachment. This restriction does not apply to learner transactions.
create function private.require_curriculum_governance_transaction()
returns void language plpgsql set search_path='' as $$
begin
  if current_setting('transaction_isolation')<>'read committed' then
    raise exception 'curriculum_release_governance_requires_read_committed';
  end if;
end;
$$;
revoke all on function private.require_curriculum_governance_transaction() from public, anon, authenticated, service_role;

-- Preserve the existing six pilot/seven production gates. Explicit array_append
-- avoids treating the production-only gate name as an array literal.
create or replace function private.enforce_curriculum_release_activation_gates()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_required text[];
  v_missing integer;
  v_count integer;
  v_unit_count integer;
begin
  if new.status in ('pilot', 'production')
     and old.status is distinct from new.status then
    v_required := array[
      'official_programme_identified', 'normative_sources_registered',
      'outcomes_reconciled', 'skills_mapped', 'assessment_scope_bound',
      'content_qa_passed'
    ];
    if new.status = 'production' then
      v_required := array_append(v_required, 'external_sme_approved');
    end if;

    select count(*) into v_missing
    from unnest(v_required) as required(gate_code)
    where not exists (
      select 1 from public.curriculum_release_gate_checks g
      where g.curriculum_release_id = new.id
        and g.gate_code = required.gate_code
        and g.status = 'passed'
    );
    if v_missing <> 0 then
      raise exception 'curriculum_release_gate_failure:% missing_or_unpassed=%', new.release_key, v_missing;
    end if;

    select count(*) into v_unit_count
    from public.curriculum_release_units
    where curriculum_release_id = new.id;
    if v_unit_count = 0 then
      raise exception 'curriculum_release_has_no_units:%', new.release_key;
    end if;

    select count(*) into v_count
    from public.curriculum_release_reconciliations rr
    join public.curriculum_reconciliation_runs r
      on r.id = rr.reconciliation_id and r.unit_id = rr.unit_id
    where rr.curriculum_release_id = new.id
      and r.status = 'complete';
    if v_count <> v_unit_count then
      raise exception 'curriculum_release_reconciliation_count_invalid:% expected=% actual_complete=%',
        new.release_key, v_unit_count, v_count;
    end if;

    select count(*) into v_count
    from public.curriculum_release_outcomes
    where curriculum_release_id = new.id;
    if v_count = 0 then raise exception 'curriculum_release_has_no_outcomes:%', new.release_key; end if;

    select count(*) into v_count
    from public.curriculum_release_skills
    where curriculum_release_id = new.id;
    if v_count = 0 then raise exception 'curriculum_release_has_no_skills:%', new.release_key; end if;

    select count(*) into v_count
    from public.curriculum_release_item_families
    where curriculum_release_id = new.id;
    if v_count = 0 then raise exception 'curriculum_release_has_no_item_families:%', new.release_key; end if;

    select count(*) into v_missing
    from public.curriculum_release_units cru
    cross join (values ('practice'), ('diagnostic'), ('mastery_check')) as required(purpose)
    where cru.curriculum_release_id = new.id
      and 1 <> (
        select count(*)
        from public.assessment_blueprints ab
        where ab.curriculum_release_id = new.id
          and ab.unit_id = cru.unit_id
          and ab.purpose = required.purpose
          and ab.status = new.status
      );
    if v_missing <> 0 then
      raise exception 'curriculum_release_unit_blueprints_incomplete:% missing_or_duplicated=%',
        new.release_key, v_missing;
    end if;

    new.activated_at := coalesce(new.activated_at, now());
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create table private.active_curriculum_release_units (
  unit_id uuid primary key,
  curriculum_release_id uuid not null,
  foreign key (curriculum_release_id, unit_id)
    references public.curriculum_release_units(curriculum_release_id, unit_id)
    on delete cascade
);
create index active_curriculum_release_units_release_idx
  on private.active_curriculum_release_units(curriculum_release_id);
alter table private.active_curriculum_release_units enable row level security;
revoke all on private.active_curriculum_release_units from public, anon, authenticated, service_role;

-- Seed before removing the old constraint. The primary key is also the
-- cross-transaction arbiter, including for transactions with older snapshots.
insert into private.active_curriculum_release_units(unit_id, curriculum_release_id)
select u.unit_id, r.id from public.curriculum_releases r
join public.curriculum_release_units u on u.curriculum_release_id=r.id
where r.status in ('pilot','production');

create function private.guard_curriculum_release_scope()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  perform private.require_curriculum_governance_transaction();
  if tg_op='DELETE' then
    if old.status<>'draft' then raise exception 'activated_curriculum_release_is_immutable'; end if;
    return old;
  end if;
  if tg_op='INSERT' and new.status in ('pilot','production') then
    raise exception 'curriculum_release_must_start_as_draft';
  end if;
  if tg_op='UPDATE' and old.status<>'draft' then
    if new.status='draft' or
      (new.id,new.subject_program_id,new.release_key,new.release_number,
       new.reconciliation_id,new.predecessor_release_id,new.source_snapshot,new.content_fingerprint)
      is distinct from
      (old.id,old.subject_program_id,old.release_key,old.release_number,
       old.reconciliation_id,old.predecessor_release_id,old.source_snapshot,old.content_fingerprint)
    then raise exception 'activated_curriculum_release_is_immutable'; end if;
  end if;
  perform 1 from public.units u join public.curriculum_release_units ru on ru.unit_id=u.id
    where ru.curriculum_release_id=new.id order by u.id for share of u;
  if exists (
    select 1 from public.curriculum_release_units ru join public.units u on u.id=ru.unit_id
    where ru.curriculum_release_id=new.id and u.subject_program_id is distinct from new.subject_program_id
  ) then raise exception 'curriculum_release_unit_programme_mismatch'; end if;
  return new;
end;
$$;
revoke all on function private.guard_curriculum_release_scope() from public, anon, authenticated, service_role;
create trigger curriculum_releases_00_scope
before insert or update or delete on public.curriculum_releases
for each row execute function private.guard_curriculum_release_scope();

create function private.sync_active_curriculum_release_units()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  delete from private.active_curriculum_release_units where curriculum_release_id=new.id;
  if new.status in ('pilot','production') then
    insert into private.active_curriculum_release_units(unit_id,curriculum_release_id)
    select unit_id,new.id from public.curriculum_release_units
    where curriculum_release_id=new.id order by unit_id;
  end if;
  return new;
end;
$$;
revoke all on function private.sync_active_curriculum_release_units() from public, anon, authenticated, service_role;
create trigger curriculum_releases_active_units
after insert or update of status on public.curriculum_releases
for each row execute function private.sync_active_curriculum_release_units();

-- Serialize every snapshot write against activation. A move must check both
-- source and destination; checking only NEW allowed an activated source to move.
create or replace function private.guard_release_snapshot_immutability()
returns trigger language plpgsql security definer set search_path='' as $$
declare r record; ids uuid[];
begin
  perform private.require_curriculum_governance_transaction();
  ids:=array_remove(array[
    case when tg_op<>'INSERT' then old.curriculum_release_id end,
    case when tg_op<>'DELETE' then new.curriculum_release_id end
  ],null);
  for r in select id,status from public.curriculum_releases
    where id=any(ids) order by id for update
  loop
    if r.status<>'draft' then
      raise exception 'activated_curriculum_release_snapshot_is_immutable:%',r.id;
    end if;
  end loop;
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function private.guard_release_snapshot_immutability() from public, anon, authenticated, service_role;

create function private.guard_release_unit_programme()
returns trigger language plpgsql security definer set search_path='' as $$
declare programme uuid; unit_programme uuid;
begin
  perform private.require_curriculum_governance_transaction();
  -- Existing snapshot trigger obtains the same lock; this also ensures a
  -- concurrent programme change cannot race an INSERT into the draft snapshot.
  select subject_program_id into programme from public.curriculum_releases
    where id=new.curriculum_release_id for update;
  select subject_program_id into unit_programme from public.units where id=new.unit_id for share;
  if not found or unit_programme is distinct from programme
  then raise exception 'curriculum_release_unit_programme_mismatch'; end if;
  return new;
end;
$$;
revoke all on function private.guard_release_unit_programme() from public, anon, authenticated, service_role;
create trigger curriculum_release_units_programme
before insert or update on public.curriculum_release_units
for each row execute function private.guard_release_unit_programme();

create function private.guard_unit_release_programme()
returns trigger language plpgsql security definer set search_path='' as $$
declare r record;
begin
  perform private.require_curriculum_governance_transaction();
  for r in select cr.id,cr.subject_program_id from public.curriculum_releases cr
    join public.curriculum_release_units ru on ru.curriculum_release_id=cr.id
    where ru.unit_id=old.id order by cr.id for update of cr
  loop
    if r.subject_program_id is distinct from new.subject_program_id then
      raise exception 'curriculum_release_unit_programme_mismatch';
    end if;
  end loop;
  return new;
end;
$$;
revoke all on function private.guard_unit_release_programme() from public, anon, authenticated, service_role;
create trigger units_release_programme
before update of subject_program_id on public.units
for each row execute function private.guard_unit_release_programme();

do $$ begin
  if exists (select 1 from public.curriculum_release_units ru
    join public.curriculum_releases r on r.id=ru.curriculum_release_id
    join public.units u on u.id=ru.unit_id
    where u.subject_program_id is distinct from r.subject_program_id)
  then raise exception 'existing_curriculum_release_unit_programme_mismatch'; end if;
end $$;

drop index public.curriculum_releases_one_active_per_program_uq;
comment on table private.active_curriculum_release_units is
  'Trigger-maintained concurrency guard: each unit has one pilot/production release; different units of a programme may coexist. Never grants delivery access or passes a release gate.';
