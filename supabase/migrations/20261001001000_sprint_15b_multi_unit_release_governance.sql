-- Sprint 15B foundation: make a subject-program release explicitly traceable
-- to every unit reconciliation it contains, and enforce three assessment
-- blueprints per unit (diagnostic, practice and mastery check) at activation.

create unique index if not exists curriculum_reconciliation_runs_id_unit_uq
  on public.curriculum_reconciliation_runs(id, unit_id);

create table if not exists public.curriculum_release_reconciliations (
  curriculum_release_id uuid not null
    references public.curriculum_releases(id) on delete cascade,
  reconciliation_id uuid not null,
  unit_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (curriculum_release_id, reconciliation_id),
  unique (curriculum_release_id, unit_id),
  constraint curriculum_release_reconciliations_run_unit_fkey
    foreign key (reconciliation_id, unit_id)
    references public.curriculum_reconciliation_runs(id, unit_id)
    on delete restrict,
  constraint curriculum_release_reconciliations_release_unit_fkey
    foreign key (curriculum_release_id, unit_id)
    references public.curriculum_release_units(curriculum_release_id, unit_id)
    on delete cascade
);

create index if not exists curriculum_release_reconciliations_run_idx
  on public.curriculum_release_reconciliations(reconciliation_id);
create index if not exists curriculum_release_reconciliations_unit_idx
  on public.curriculum_release_reconciliations(unit_id);

alter table public.curriculum_release_reconciliations enable row level security;

drop policy if exists curriculum_release_reconciliations_read
  on public.curriculum_release_reconciliations;
create policy curriculum_release_reconciliations_read
on public.curriculum_release_reconciliations
for select to authenticated
using (
  exists (
    select 1 from public.curriculum_releases r
    where r.id = curriculum_release_id
      and (
        r.status <> 'draft'
        or private.current_user_role() = any (
          array['admin'::public.user_role, 'content_admin'::public.user_role]
        )
      )
  )
);

drop policy if exists curriculum_release_reconciliations_insert
  on public.curriculum_release_reconciliations;
create policy curriculum_release_reconciliations_insert
on public.curriculum_release_reconciliations
for insert to authenticated
with check (
  private.current_user_role() = any (
    array['admin'::public.user_role, 'content_admin'::public.user_role]
  )
);

drop policy if exists curriculum_release_reconciliations_update
  on public.curriculum_release_reconciliations;
create policy curriculum_release_reconciliations_update
on public.curriculum_release_reconciliations
for update to authenticated
using (
  private.current_user_role() = any (
    array['admin'::public.user_role, 'content_admin'::public.user_role]
  )
)
with check (
  private.current_user_role() = any (
    array['admin'::public.user_role, 'content_admin'::public.user_role]
  )
);

drop policy if exists curriculum_release_reconciliations_delete
  on public.curriculum_release_reconciliations;
create policy curriculum_release_reconciliations_delete
on public.curriculum_release_reconciliations
for delete to authenticated
using (
  private.current_user_role() = any (
    array['admin'::public.user_role, 'content_admin'::public.user_role]
  )
);

revoke all on table public.curriculum_release_reconciliations from public, anon;
grant select, insert, update, delete on table public.curriculum_release_reconciliations to authenticated;
grant all on table public.curriculum_release_reconciliations to service_role;

insert into public.curriculum_release_reconciliations (
  curriculum_release_id, reconciliation_id, unit_id
)
select cr.id, r.id, r.unit_id
from public.curriculum_releases cr
join public.curriculum_reconciliation_runs r on r.id = cr.reconciliation_id
join public.curriculum_release_units cru
  on cru.curriculum_release_id = cr.id and cru.unit_id = r.unit_id
where cr.reconciliation_id is not null
on conflict (curriculum_release_id, unit_id) do nothing;

drop trigger if exists curriculum_release_reconciliations_immutable
  on public.curriculum_release_reconciliations;
create trigger curriculum_release_reconciliations_immutable
before insert or update or delete on public.curriculum_release_reconciliations
for each row execute function private.guard_release_snapshot_immutability();

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
      v_required := v_required || 'external_sme_approved';
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

comment on table public.curriculum_release_reconciliations is
  'Immutable per-unit source reconciliation set for a curriculum release. Every pilot or production unit must have one completed reconciliation.';
