-- Sprint 11K: curriculum versioning, provenance and release gates.
-- Existing learner evidence predates release identity and is therefore bound to
-- an explicit legacy/unversioned release. New evidence is pinned automatically
-- to the active release and immutable assessment blueprint.

create table public.curriculum_releases (
  id uuid primary key default gen_random_uuid(),
  release_key text not null unique,
  subject_program_id uuid not null references public.subject_programs(id) on delete restrict,
  release_number integer not null check (release_number >= 0),
  version_label text not null,
  status text not null default 'draft'
    check (status in ('draft', 'pilot', 'production', 'legacy', 'superseded', 'retired')),
  provenance_quality text not null
    check (provenance_quality in ('exact', 'legacy_inferred')),
  reconciliation_id uuid references public.curriculum_reconciliation_runs(id) on delete restrict,
  predecessor_release_id uuid references public.curriculum_releases(id) on delete restrict,
  source_snapshot jsonb not null default '{}'::jsonb,
  content_fingerprint text not null,
  effective_from date,
  effective_to date,
  activated_at timestamptz,
  activated_by uuid references public.profiles(id) on delete set null,
  notes text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(subject_program_id, release_number),
  constraint curriculum_releases_key_check
    check (release_key = lower(release_key) and release_key ~ '^[a-z0-9][a-z0-9_]*$'),
  constraint curriculum_releases_activation_check
    check (
      (status = 'draft' and activated_at is null)
      or (status <> 'draft' and activated_at is not null)
    )
);

create unique index curriculum_releases_one_active_per_program_uq
  on public.curriculum_releases(subject_program_id)
  where status in ('pilot', 'production');
create index curriculum_releases_reconciliation_idx
  on public.curriculum_releases(reconciliation_id)
  where reconciliation_id is not null;
create index curriculum_releases_predecessor_idx
  on public.curriculum_releases(predecessor_release_id)
  where predecessor_release_id is not null;

create table public.curriculum_release_units (
  curriculum_release_id uuid not null references public.curriculum_releases(id) on delete cascade,
  unit_id uuid not null references public.units(id) on delete restrict,
  unit_code_snapshot text not null,
  title_hy_snapshot text not null,
  title_en_snapshot text,
  sequence_order_snapshot integer not null,
  primary key (curriculum_release_id, unit_id),
  unique(curriculum_release_id, unit_code_snapshot)
);
create index curriculum_release_units_unit_idx on public.curriculum_release_units(unit_id);

create table public.curriculum_release_outcomes (
  curriculum_release_id uuid not null references public.curriculum_releases(id) on delete cascade,
  learning_outcome_id uuid not null references public.learning_outcomes(id) on delete restrict,
  source_document_id uuid not null references public.curriculum_source_documents(id) on delete restrict,
  official_code_snapshot text,
  statement_hy_snapshot text not null,
  statement_en_snapshot text,
  source_locator_snapshot text not null,
  requirement_level_snapshot text not null,
  source_transcription_notes_snapshot text,
  framework_references_snapshot text[] not null default '{}'::text[],
  subject_standard_references_snapshot text[] not null default '{}'::text[],
  mapping_notes_snapshot text not null,
  sequence_order_snapshot integer not null,
  primary key (curriculum_release_id, learning_outcome_id)
);
create index curriculum_release_outcomes_outcome_idx
  on public.curriculum_release_outcomes(learning_outcome_id);
create index curriculum_release_outcomes_source_idx
  on public.curriculum_release_outcomes(source_document_id);

create table public.curriculum_release_skills (
  curriculum_release_id uuid not null references public.curriculum_releases(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete restrict,
  skill_code_snapshot text not null,
  name_hy_snapshot text not null,
  name_en_snapshot text,
  description_hy_snapshot text,
  description_en_snapshot text,
  layer_snapshot text not null,
  sequence_order_snapshot integer not null,
  disposition_snapshot text not null,
  rationale_snapshot text not null,
  outcome_mapping_snapshot jsonb not null,
  primary key (curriculum_release_id, skill_id),
  unique(curriculum_release_id, skill_code_snapshot)
);
create index curriculum_release_skills_skill_idx on public.curriculum_release_skills(skill_id);

create table public.curriculum_release_item_families (
  curriculum_release_id uuid not null references public.curriculum_releases(id) on delete cascade,
  item_family_id uuid not null references public.item_families(id) on delete restrict,
  skill_id uuid not null references public.skills(id) on delete restrict,
  family_code_snapshot text not null,
  name_hy_snapshot text,
  description_snapshot text,
  primary_learning_outcome_id uuid not null references public.learning_outcomes(id) on delete restrict,
  disposition_snapshot text not null,
  mapping_type_snapshot text not null,
  rationale_snapshot text not null,
  primary key (curriculum_release_id, item_family_id),
  unique(curriculum_release_id, family_code_snapshot)
);
create index curriculum_release_item_families_family_idx
  on public.curriculum_release_item_families(item_family_id);
create index curriculum_release_item_families_skill_idx
  on public.curriculum_release_item_families(skill_id);
create index curriculum_release_item_families_outcome_idx
  on public.curriculum_release_item_families(primary_learning_outcome_id);

create table public.curriculum_release_gate_checks (
  curriculum_release_id uuid not null references public.curriculum_releases(id) on delete cascade,
  gate_code text not null check (gate_code in (
    'official_programme_identified',
    'normative_sources_registered',
    'outcomes_reconciled',
    'skills_mapped',
    'assessment_scope_bound',
    'content_qa_passed',
    'external_sme_approved'
  )),
  status text not null check (status in ('pending', 'passed', 'failed')),
  evidence jsonb not null default '{}'::jsonb,
  notes text not null,
  checked_at timestamptz,
  checked_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (curriculum_release_id, gate_code),
  constraint curriculum_release_gate_checks_checked_check
    check ((status = 'pending' and checked_at is null) or (status <> 'pending' and checked_at is not null))
);
create index curriculum_release_gate_checks_checked_by_idx
  on public.curriculum_release_gate_checks(checked_by)
  where checked_by is not null;

create table public.assessment_blueprints (
  id uuid primary key default gen_random_uuid(),
  blueprint_key text not null unique,
  curriculum_release_id uuid not null references public.curriculum_releases(id) on delete restrict,
  unit_id uuid not null references public.units(id) on delete restrict,
  assessment_pool_id uuid not null references public.assessment_pools(id) on delete restrict,
  purpose text not null check (purpose in ('practice', 'diagnostic', 'mastery_check')),
  version_number integer not null check (version_number >= 0),
  status text not null default 'draft'
    check (status in ('draft', 'pilot', 'production', 'legacy', 'retired')),
  selection_policy_version text not null,
  configuration_snapshot jsonb not null default '{}'::jsonb,
  item_set_fingerprint text not null,
  published_at timestamptz,
  published_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(curriculum_release_id, unit_id, purpose, version_number),
  unique(id, curriculum_release_id),
  constraint assessment_blueprints_key_check
    check (blueprint_key = lower(blueprint_key) and blueprint_key ~ '^[a-z0-9][a-z0-9_]*$'),
  constraint assessment_blueprints_published_check
    check ((status = 'draft' and published_at is null) or (status <> 'draft' and published_at is not null))
);
create index assessment_blueprints_release_idx on public.assessment_blueprints(curriculum_release_id);
create index assessment_blueprints_unit_idx on public.assessment_blueprints(unit_id);
create index assessment_blueprints_pool_idx on public.assessment_blueprints(assessment_pool_id);
create index assessment_blueprints_published_by_idx
  on public.assessment_blueprints(published_by) where published_by is not null;

create table public.assessment_blueprint_items (
  assessment_blueprint_id uuid not null references public.assessment_blueprints(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete restrict,
  item_code_snapshot text not null,
  item_version_snapshot integer not null,
  item_template_id uuid not null references public.item_templates(id) on delete restrict,
  template_version_snapshot integer not null,
  item_family_id uuid not null references public.item_families(id) on delete restrict,
  variant_key_snapshot text not null,
  variant_fingerprint_snapshot text,
  primary key (assessment_blueprint_id, item_id)
);
create index assessment_blueprint_items_item_idx on public.assessment_blueprint_items(item_id);
create index assessment_blueprint_items_template_idx on public.assessment_blueprint_items(item_template_id);
create index assessment_blueprint_items_family_idx on public.assessment_blueprint_items(item_family_id);

alter table public.learning_sessions
  add column curriculum_release_id uuid,
  add column assessment_blueprint_id uuid,
  add column provenance_status text;

alter table public.attempts
  add column curriculum_release_id uuid,
  add column assessment_blueprint_id uuid,
  add column provenance_status text;

alter table public.student_item_exposure_events
  add column curriculum_release_id uuid,
  add column assessment_blueprint_id uuid,
  add column provenance_status text;

create table public.student_skill_mastery_by_release (
  curriculum_release_id uuid not null references public.curriculum_releases(id) on delete restrict,
  student_id uuid not null references public.profiles(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete restrict,
  alpha_evidence numeric not null default 2,
  beta_evidence numeric not null default 2,
  mastery_score numeric not null default 0.5 check (mastery_score >= 0 and mastery_score <= 1),
  evidence_count integer not null default 0 check (evidence_count >= 0),
  status public.mastery_status not null default 'insufficient_evidence',
  last_attempt_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (curriculum_release_id, student_id, skill_id)
);
create index student_skill_mastery_by_release_student_idx
  on public.student_skill_mastery_by_release(student_id, curriculum_release_id);
create index student_skill_mastery_by_release_skill_idx
  on public.student_skill_mastery_by_release(skill_id);

-- Seed an explicitly legacy release for evidence created before 11K and a
-- standards-reconciled pilot release for all new evidence.
with context as (
  select sp.id as subject_program_id, u.id as unit_id, r.id as reconciliation_id,
         r.source_snapshot, sp.effective_from
  from public.subject_programs sp
  join public.subjects s on s.id = sp.subject_id and s.code = 'physics'
  join public.grades g on g.id = sp.grade_id and g.grade_number = 7
  join public.units u on u.subject_program_id = sp.id and u.code = 'PHY7-U01'
  join public.curriculum_reconciliation_runs r
    on r.subject_program_id = sp.id and r.unit_id = u.id
   and r.reconciliation_key = 'physics7_u01_2026_08_14'
)
insert into public.curriculum_releases (
  release_key, subject_program_id, release_number, version_label, status,
  provenance_quality, reconciliation_id, source_snapshot, content_fingerprint,
  effective_from, activated_at, notes
)
select 'physics7_u01_legacy_pre_11k', subject_program_id, 0,
       'Legacy evidence before explicit curriculum releases', 'draft',
       'legacy_inferred', null::uuid, '{}'::jsonb,
       md5('physics7_u01_legacy_pre_11k'), null::date, null::timestamptz,
       'Historical sessions and attempts created before Sprint 11K. Release and blueprint attribution is intentionally marked inferred; no current-standard compatibility is asserted.'
from context
union all
select 'physics7_u01_2026_08_14_pilot_r1', subject_program_id, 1,
       'Physics 7 Chapter I — 2026-08-14 pilot release 1', 'draft',
       'exact', reconciliation_id, source_snapshot,
       md5('physics7_u01_2026_08_14_pilot_r1:' || reconciliation_id::text),
       effective_from, null::timestamptz,
       'First standards-reconciled pilot release. Production remains blocked pending external Physics SME approval and later Sprint 13 gates.'
from context;

insert into public.curriculum_release_units (
  curriculum_release_id, unit_id, unit_code_snapshot, title_hy_snapshot,
  title_en_snapshot, sequence_order_snapshot
)
select cr.id, u.id, u.code, u.title_hy, u.title_en, u.sequence_order
from public.curriculum_releases cr
join public.units u on u.subject_program_id = cr.subject_program_id and u.code = 'PHY7-U01'
where cr.release_key in ('physics7_u01_legacy_pre_11k', 'physics7_u01_2026_08_14_pilot_r1');

-- Only the exact current release receives normative snapshots. The legacy
-- release remains explicitly unversioned instead of inheriting a later mapping.
with release as (
  select id, reconciliation_id from public.curriculum_releases
  where release_key = 'physics7_u01_2026_08_14_pilot_r1'
)
insert into public.curriculum_release_outcomes (
  curriculum_release_id, learning_outcome_id, source_document_id,
  official_code_snapshot, statement_hy_snapshot, statement_en_snapshot,
  source_locator_snapshot, requirement_level_snapshot,
  source_transcription_notes_snapshot, framework_references_snapshot,
  subject_standard_references_snapshot, mapping_notes_snapshot,
  sequence_order_snapshot
)
select r.id, lo.id, lo.source_document_id, lo.official_code, lo.statement_hy,
       lo.statement_en, lo.source_locator, lo.requirement_level,
       lo.source_transcription_notes, lom.framework_references,
       lom.subject_standard_references, lom.mapping_notes, lo.sequence_order
from release r
join public.learning_outcome_normative_mappings lom
  on lom.reconciliation_id = r.reconciliation_id
join public.learning_outcomes lo on lo.id = lom.learning_outcome_id;

with release as (
  select id, reconciliation_id from public.curriculum_releases
  where release_key = 'physics7_u01_2026_08_14_pilot_r1'
)
insert into public.curriculum_release_skills (
  curriculum_release_id, skill_id, skill_code_snapshot, name_hy_snapshot,
  name_en_snapshot, description_hy_snapshot, description_en_snapshot,
  layer_snapshot, sequence_order_snapshot, disposition_snapshot,
  rationale_snapshot, outcome_mapping_snapshot
)
select r.id, s.id, s.code, s.name_hy, s.name_en, s.description_hy,
       s.description_en, s.layer::text, s.sequence_order, scr.disposition,
       scr.rationale,
       coalesce((
         select jsonb_agg(jsonb_build_object(
           'learningOutcomeId', m.learning_outcome_id,
           'mappingType', m.mapping_type,
           'rationale', m.rationale
         ) order by m.learning_outcome_id)
         from public.skill_outcome_curriculum_mappings m
         where m.reconciliation_id = r.reconciliation_id and m.skill_id = s.id
       ), '[]'::jsonb)
from release r
join public.skill_curriculum_reconciliations scr
  on scr.reconciliation_id = r.reconciliation_id
join public.skills s on s.id = scr.skill_id;

with release as (
  select id, reconciliation_id from public.curriculum_releases
  where release_key = 'physics7_u01_2026_08_14_pilot_r1'
)
insert into public.curriculum_release_item_families (
  curriculum_release_id, item_family_id, skill_id, family_code_snapshot,
  name_hy_snapshot, description_snapshot, primary_learning_outcome_id,
  disposition_snapshot, mapping_type_snapshot, rationale_snapshot
)
select r.id, f.id, f.skill_id, f.code, f.name_hy, f.description,
       ifcr.primary_learning_outcome_id, ifcr.disposition,
       ifcr.mapping_type, ifcr.rationale
from release r
join public.item_family_curriculum_reconciliations ifcr
  on ifcr.reconciliation_id = r.reconciliation_id
join public.item_families f on f.id = ifcr.item_family_id;

-- Create legacy and current blueprints for each purpose.
with releases as (
  select id, release_key from public.curriculum_releases
  where release_key in ('physics7_u01_legacy_pre_11k', 'physics7_u01_2026_08_14_pilot_r1')
), context as (
  select r.id as release_id, r.release_key, u.id as unit_id, p.id as pool_id,
         p.code as pool_code, p.purpose,
         md5(coalesce(string_agg(
           i.id::text || ':' || i.version_no::text || ':' || coalesce(i.variant_fingerprint, ''),
           ',' order by i.id
         ) filter (where api.enabled), '')) as fingerprint,
         count(i.id) filter (where api.enabled) as enabled_count
  from releases r
  join public.curriculum_release_units cru on cru.curriculum_release_id = r.id
  join public.units u on u.id = cru.unit_id
  join public.assessment_pools p on p.unit_code = cru.unit_code_snapshot
   and p.status = 'active'
  left join public.assessment_pool_items api on api.pool_id = p.id and api.enabled
  left join public.items i on i.id = api.item_id and i.retired_at is null
  group by r.id, r.release_key, u.id, p.id, p.code, p.purpose
)
insert into public.assessment_blueprints (
  blueprint_key, curriculum_release_id, unit_id, assessment_pool_id,
  purpose, version_number, status, selection_policy_version,
  configuration_snapshot, item_set_fingerprint, published_at
)
select
  case when release_key = 'physics7_u01_legacy_pre_11k'
    then 'physics7_u01_legacy_' || purpose
    else 'physics7_u01_2026_08_14_r1_' || purpose
  end,
  release_id, unit_id, pool_id, purpose,
  case when release_key = 'physics7_u01_legacy_pre_11k' then 0 else 1 end,
  case when release_key = 'physics7_u01_legacy_pre_11k' then 'legacy' else 'draft' end,
  case when release_key = 'physics7_u01_legacy_pre_11k' then 'pre_11k_unknown' else '11B-v1' end,
  jsonb_build_object(
    'poolCode', pool_code,
    'enabledItemCount', enabled_count,
    'provenance', case when release_key = 'physics7_u01_legacy_pre_11k' then 'legacy_inferred' else 'exact_snapshot' end,
    'note', case when release_key = 'physics7_u01_legacy_pre_11k'
      then 'Blueprint identity inferred from historical session mode; exact historical pool membership is not asserted.'
      else 'Immutable snapshot of the active 11J-reconciled pool at Sprint 11K activation.' end
  ),
  case when release_key = 'physics7_u01_legacy_pre_11k'
    then md5('legacy:' || purpose)
    else fingerprint end,
  case when release_key = 'physics7_u01_legacy_pre_11k' then now() else null end
from context;

-- Snapshot exact current blueprint membership. Legacy sessions retain their
-- actual served items through learning_session_items and are not retrofitted
-- with a later pool-membership claim.
insert into public.assessment_blueprint_items (
  assessment_blueprint_id, item_id, item_code_snapshot, item_version_snapshot,
  item_template_id, template_version_snapshot, item_family_id,
  variant_key_snapshot, variant_fingerprint_snapshot
)
select ab.id, i.id, i.code, i.version_no, it.id, it.template_version,
       it.item_family_id, i.variant_key, i.variant_fingerprint
from public.assessment_blueprints ab
join public.curriculum_releases cr on cr.id = ab.curriculum_release_id
join public.assessment_pool_items api
  on api.pool_id = ab.assessment_pool_id and api.enabled
join public.items i on i.id = api.item_id and i.retired_at is null
join public.item_templates it on it.id = i.item_template_id
where cr.release_key = 'physics7_u01_2026_08_14_pilot_r1';

-- Bind all pre-existing evidence conservatively to the legacy release.
update public.learning_sessions ls
set curriculum_release_id = cr.id,
    assessment_blueprint_id = ab.id,
    provenance_status = 'legacy_inferred'
from public.curriculum_releases cr
join public.assessment_blueprints ab on ab.curriculum_release_id = cr.id
where cr.release_key = 'physics7_u01_legacy_pre_11k'
  and ab.purpose = ls.mode;

update public.attempts a
set curriculum_release_id = ls.curriculum_release_id,
    assessment_blueprint_id = ls.assessment_blueprint_id,
    provenance_status = 'legacy_inferred'
from public.learning_sessions ls
where ls.id = a.learning_session_id;

update public.attempts a
set curriculum_release_id = cr.id,
    assessment_blueprint_id = ab.id,
    provenance_status = 'legacy_inferred'
from public.curriculum_releases cr
join public.assessment_blueprints ab on ab.curriculum_release_id = cr.id
where a.curriculum_release_id is null
  and cr.release_key = 'physics7_u01_legacy_pre_11k'
  and ab.purpose = 'practice';

update public.student_item_exposure_events e
set curriculum_release_id = ls.curriculum_release_id,
    assessment_blueprint_id = ls.assessment_blueprint_id,
    provenance_status = 'legacy_inferred'
from public.learning_sessions ls
where ls.id = e.session_id;

update public.student_item_exposure_events e
set curriculum_release_id = cr.id,
    assessment_blueprint_id = ab.id,
    provenance_status = 'legacy_inferred'
from public.curriculum_releases cr
join public.assessment_blueprints ab on ab.curriculum_release_id = cr.id
where e.curriculum_release_id is null
  and cr.release_key = 'physics7_u01_legacy_pre_11k'
  and ab.purpose = e.purpose;

insert into public.student_skill_mastery_by_release (
  curriculum_release_id, student_id, skill_id, alpha_evidence, beta_evidence,
  mastery_score, evidence_count, status, last_attempt_at, updated_at
)
select cr.id, ssm.student_id, ssm.skill_id, ssm.alpha_evidence,
       ssm.beta_evidence, ssm.mastery_score, ssm.evidence_count,
       ssm.status, ssm.last_attempt_at, ssm.updated_at
from public.student_skill_mastery ssm
cross join public.curriculum_releases cr
where cr.release_key = 'physics7_u01_legacy_pre_11k';

alter table public.learning_sessions
  alter column curriculum_release_id set not null,
  alter column assessment_blueprint_id set not null,
  alter column provenance_status set not null;
alter table public.attempts
  alter column curriculum_release_id set not null,
  alter column assessment_blueprint_id set not null,
  alter column provenance_status set not null;
alter table public.student_item_exposure_events
  alter column curriculum_release_id set not null,
  alter column assessment_blueprint_id set not null,
  alter column provenance_status set not null;

alter table public.learning_sessions
  add constraint learning_sessions_curriculum_release_fkey
    foreign key (curriculum_release_id) references public.curriculum_releases(id) on delete restrict,
  add constraint learning_sessions_blueprint_release_fkey
    foreign key (assessment_blueprint_id, curriculum_release_id)
    references public.assessment_blueprints(id, curriculum_release_id) on delete restrict,
  add constraint learning_sessions_provenance_status_check
    check (provenance_status in ('exact', 'legacy_inferred'));
alter table public.attempts
  add constraint attempts_curriculum_release_fkey
    foreign key (curriculum_release_id) references public.curriculum_releases(id) on delete restrict,
  add constraint attempts_blueprint_release_fkey
    foreign key (assessment_blueprint_id, curriculum_release_id)
    references public.assessment_blueprints(id, curriculum_release_id) on delete restrict,
  add constraint attempts_provenance_status_check
    check (provenance_status in ('exact', 'legacy_inferred'));
alter table public.student_item_exposure_events
  add constraint exposure_events_curriculum_release_fkey
    foreign key (curriculum_release_id) references public.curriculum_releases(id) on delete restrict,
  add constraint exposure_events_blueprint_release_fkey
    foreign key (assessment_blueprint_id, curriculum_release_id)
    references public.assessment_blueprints(id, curriculum_release_id) on delete restrict,
  add constraint exposure_events_provenance_status_check
    check (provenance_status in ('exact', 'legacy_inferred'));

create index learning_sessions_release_idx
  on public.learning_sessions(curriculum_release_id, student_id, started_at desc);
create index learning_sessions_blueprint_idx on public.learning_sessions(assessment_blueprint_id);
create index attempts_release_idx
  on public.attempts(curriculum_release_id, student_id, skill_id, created_at desc);
create index attempts_blueprint_idx on public.attempts(assessment_blueprint_id);
create index exposure_events_release_idx
  on public.student_item_exposure_events(curriculum_release_id, student_id, served_at desc);
create index exposure_events_blueprint_idx
  on public.student_item_exposure_events(assessment_blueprint_id);

create or replace function private.guard_release_snapshot_immutability()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_release_id uuid;
  v_status text;
begin
  v_release_id := coalesce(new.curriculum_release_id, old.curriculum_release_id);
  select status into v_status from public.curriculum_releases where id = v_release_id;
  if v_status <> 'draft' then
    raise exception 'activated_curriculum_release_snapshot_is_immutable:%', v_release_id;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger curriculum_release_units_immutable
before insert or update or delete on public.curriculum_release_units
for each row execute function private.guard_release_snapshot_immutability();
create trigger curriculum_release_outcomes_immutable
before insert or update or delete on public.curriculum_release_outcomes
for each row execute function private.guard_release_snapshot_immutability();
create trigger curriculum_release_skills_immutable
before insert or update or delete on public.curriculum_release_skills
for each row execute function private.guard_release_snapshot_immutability();
create trigger curriculum_release_item_families_immutable
before insert or update or delete on public.curriculum_release_item_families
for each row execute function private.guard_release_snapshot_immutability();

create or replace function private.guard_blueprint_item_immutability()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_blueprint_id uuid;
  v_status text;
begin
  v_blueprint_id := coalesce(new.assessment_blueprint_id, old.assessment_blueprint_id);
  select status into v_status from public.assessment_blueprints where id = v_blueprint_id;
  if v_status <> 'draft' then
    raise exception 'published_assessment_blueprint_is_immutable:%', v_blueprint_id;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger assessment_blueprint_items_immutable
before insert or update or delete on public.assessment_blueprint_items
for each row execute function private.guard_blueprint_item_immutability();

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

    select count(*) into v_count from public.curriculum_release_units where curriculum_release_id = new.id;
    if v_count = 0 then raise exception 'curriculum_release_has_no_units:%', new.release_key; end if;
    select count(*) into v_count from public.curriculum_release_outcomes where curriculum_release_id = new.id;
    if v_count = 0 then raise exception 'curriculum_release_has_no_outcomes:%', new.release_key; end if;
    select count(*) into v_count from public.curriculum_release_skills where curriculum_release_id = new.id;
    if v_count = 0 then raise exception 'curriculum_release_has_no_skills:%', new.release_key; end if;
    select count(*) into v_count from public.curriculum_release_item_families where curriculum_release_id = new.id;
    if v_count = 0 then raise exception 'curriculum_release_has_no_item_families:%', new.release_key; end if;
    select count(*) into v_count
    from public.assessment_blueprints
    where curriculum_release_id = new.id and status = new.status;
    if v_count <> 3 then
      raise exception 'curriculum_release_blueprint_count_invalid:% expected=3 actual=%', new.release_key, v_count;
    end if;

    new.activated_at := coalesce(new.activated_at, now());
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger curriculum_releases_activation_gate
before update of status on public.curriculum_releases
for each row execute function private.enforce_curriculum_release_activation_gates();

create or replace function private.bind_learning_session_provenance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_release_id uuid;
  v_blueprint_id uuid;
begin
  if tg_op = 'UPDATE' then
    if old.curriculum_release_id is distinct from new.curriculum_release_id
       or old.assessment_blueprint_id is distinct from new.assessment_blueprint_id
       or old.provenance_status is distinct from new.provenance_status then
      raise exception 'learning_session_provenance_is_immutable';
    end if;
    return new;
  end if;

  if new.curriculum_release_id is null or new.assessment_blueprint_id is null then
    select cr.id, ab.id into v_release_id, v_blueprint_id
    from public.curriculum_releases cr
    join public.curriculum_release_units cru on cru.curriculum_release_id = cr.id
      and cru.unit_code_snapshot = new.unit_code
    join public.assessment_blueprints ab on ab.curriculum_release_id = cr.id
      and ab.unit_id = cru.unit_id and ab.purpose = new.mode
      and ab.status = cr.status
    where cr.status in ('production', 'pilot')
    order by case cr.status when 'production' then 1 else 2 end, cr.release_number desc
    limit 1;
    if v_release_id is null or v_blueprint_id is null then
      raise exception 'no_active_curriculum_release_blueprint_for:%:%', new.unit_code, new.mode;
    end if;
    new.curriculum_release_id := v_release_id;
    new.assessment_blueprint_id := v_blueprint_id;
    new.provenance_status := 'exact';
  end if;

  if not exists (
    select 1
    from public.assessment_blueprints ab
    join public.curriculum_release_units cru
      on cru.curriculum_release_id = ab.curriculum_release_id and cru.unit_id = ab.unit_id
    where ab.id = new.assessment_blueprint_id
      and ab.curriculum_release_id = new.curriculum_release_id
      and ab.purpose = new.mode
      and cru.unit_code_snapshot = new.unit_code
  ) then
    raise exception 'learning_session_release_blueprint_mismatch';
  end if;
  new.provenance_status := coalesce(new.provenance_status, 'exact');
  return new;
end;
$$;

create trigger learning_sessions_bind_provenance
before insert or update on public.learning_sessions
for each row execute function private.bind_learning_session_provenance();

create or replace function private.bind_attempt_provenance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_release_id uuid;
  v_blueprint_id uuid;
begin
  if tg_op = 'UPDATE' then
    if old.curriculum_release_id is distinct from new.curriculum_release_id
       or old.assessment_blueprint_id is distinct from new.assessment_blueprint_id
       or old.provenance_status is distinct from new.provenance_status then
      raise exception 'attempt_provenance_is_immutable';
    end if;
    return new;
  end if;

  if new.learning_session_id is not null then
    select curriculum_release_id, assessment_blueprint_id
      into v_release_id, v_blueprint_id
    from public.learning_sessions where id = new.learning_session_id;
  else
    select cr.id, ab.id into v_release_id, v_blueprint_id
    from public.item_curriculum_scopes ics
    join public.units u on u.id = ics.unit_id
    join public.curriculum_release_units cru on cru.unit_id = u.id
    join public.curriculum_releases cr on cr.id = cru.curriculum_release_id
      and cr.status in ('production', 'pilot')
    join public.assessment_blueprints ab on ab.curriculum_release_id = cr.id
      and ab.unit_id = u.id and ab.purpose = 'practice' and ab.status = cr.status
    where ics.item_id = new.item_id and ics.is_primary
    order by case cr.status when 'production' then 1 else 2 end, cr.release_number desc
    limit 1;
  end if;
  if v_release_id is null or v_blueprint_id is null then
    raise exception 'attempt_curriculum_provenance_unresolvable';
  end if;
  if new.curriculum_release_id is not null and new.curriculum_release_id <> v_release_id then
    raise exception 'attempt_curriculum_release_mismatch';
  end if;
  if new.assessment_blueprint_id is not null and new.assessment_blueprint_id <> v_blueprint_id then
    raise exception 'attempt_blueprint_mismatch';
  end if;
  new.curriculum_release_id := v_release_id;
  new.assessment_blueprint_id := v_blueprint_id;
  new.provenance_status := 'exact';
  return new;
end;
$$;

create trigger attempts_bind_provenance
before insert or update on public.attempts
for each row execute function private.bind_attempt_provenance();

create or replace function private.bind_exposure_provenance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_release_id uuid;
  v_blueprint_id uuid;
begin
  if tg_op = 'UPDATE' then
    if old.curriculum_release_id is distinct from new.curriculum_release_id
       or old.assessment_blueprint_id is distinct from new.assessment_blueprint_id
       or old.provenance_status is distinct from new.provenance_status then
      raise exception 'exposure_provenance_is_immutable';
    end if;
    return new;
  end if;
  if new.session_id is not null then
    select curriculum_release_id, assessment_blueprint_id
      into v_release_id, v_blueprint_id
    from public.learning_sessions where id = new.session_id;
  end if;
  if v_release_id is null then
    select cr.id, ab.id into v_release_id, v_blueprint_id
    from public.item_curriculum_scopes ics
    join public.units u on u.id = ics.unit_id
    join public.curriculum_release_units cru on cru.unit_id = u.id
    join public.curriculum_releases cr on cr.id = cru.curriculum_release_id
      and cr.status in ('production', 'pilot')
    join public.assessment_blueprints ab on ab.curriculum_release_id = cr.id
      and ab.unit_id = u.id and ab.purpose = new.purpose and ab.status = cr.status
    where ics.item_id = new.item_id and ics.is_primary
    order by case cr.status when 'production' then 1 else 2 end, cr.release_number desc
    limit 1;
  end if;
  if v_release_id is null or v_blueprint_id is null then
    raise exception 'exposure_curriculum_provenance_unresolvable';
  end if;
  new.curriculum_release_id := v_release_id;
  new.assessment_blueprint_id := v_blueprint_id;
  new.provenance_status := 'exact';
  return new;
end;
$$;

create trigger exposure_events_bind_provenance
before insert or update on public.student_item_exposure_events
for each row execute function private.bind_exposure_provenance();

create or replace function public.resolve_active_curriculum_release(p_unit_code text)
returns uuid
language sql
stable
security invoker
set search_path = ''
as $$
  select cr.id
  from public.curriculum_releases cr
  join public.curriculum_release_units cru on cru.curriculum_release_id = cr.id
  where cru.unit_code_snapshot = p_unit_code
    and cr.status in ('production', 'pilot')
  order by case cr.status when 'production' then 1 else 2 end, cr.release_number desc
  limit 1
$$;
revoke all on function public.resolve_active_curriculum_release(text) from public, anon, authenticated;
grant execute on function public.resolve_active_curriculum_release(text) to service_role;

-- Make mastery writes release-aware while retaining the old table as a
-- compatibility projection for existing dashboards during the pilot.
create or replace function public.record_session_graded_attempt(
  p_student_id uuid, p_session_id uuid, p_session_item_id uuid,
  p_item_id uuid, p_skill_id uuid, p_response jsonb,
  p_normalized_response jsonb, p_score numeric, p_correct boolean,
  p_error_code text, p_hint_used boolean, p_response_time_ms integer,
  p_alpha numeric, p_beta numeric, p_mastery_score numeric,
  p_evidence_count integer, p_status public.mastery_status,
  p_attempted_at timestamptz
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt_id uuid;
  v_existing_attempt_id uuid;
  v_planned integer;
  v_answered integer;
  v_release_id uuid;
begin
  select lsi.attempt_id, ls.curriculum_release_id
    into v_existing_attempt_id, v_release_id
  from public.learning_session_items lsi
  join public.learning_sessions ls on ls.id = lsi.session_id
  where lsi.id = p_session_item_id
    and lsi.session_id = p_session_id
    and lsi.item_id = p_item_id
    and lsi.skill_id = p_skill_id
    and ls.student_id = p_student_id
    and ls.status = 'active'
  for update of lsi;
  if not found then raise exception 'invalid_or_inactive_session_item'; end if;
  if v_existing_attempt_id is not null then return v_existing_attempt_id; end if;

  insert into public.attempts(
    student_id, item_id, skill_id, response, normalized_response, score,
    correct, error_code, hint_used, response_time_ms, created_at,
    learning_session_id, learning_session_item_id
  ) values (
    p_student_id, p_item_id, p_skill_id, p_response, p_normalized_response,
    p_score, p_correct, p_error_code, p_hint_used, p_response_time_ms,
    p_attempted_at, p_session_id, p_session_item_id
  ) returning id into v_attempt_id;

  insert into public.student_skill_mastery_by_release(
    curriculum_release_id, student_id, skill_id, alpha_evidence,
    beta_evidence, mastery_score, evidence_count, status,
    last_attempt_at, updated_at
  ) values (
    v_release_id, p_student_id, p_skill_id, p_alpha, p_beta,
    p_mastery_score, p_evidence_count, p_status, p_attempted_at, p_attempted_at
  ) on conflict (curriculum_release_id, student_id, skill_id) do update set
    alpha_evidence = excluded.alpha_evidence,
    beta_evidence = excluded.beta_evidence,
    mastery_score = excluded.mastery_score,
    evidence_count = excluded.evidence_count,
    status = excluded.status,
    last_attempt_at = excluded.last_attempt_at,
    updated_at = excluded.updated_at;

  insert into public.student_skill_mastery(
    student_id, skill_id, alpha_evidence, beta_evidence, mastery_score,
    evidence_count, status, last_attempt_at, updated_at
  ) values (
    p_student_id, p_skill_id, p_alpha, p_beta, p_mastery_score,
    p_evidence_count, p_status, p_attempted_at, p_attempted_at
  ) on conflict (student_id, skill_id) do update set
    alpha_evidence = excluded.alpha_evidence,
    beta_evidence = excluded.beta_evidence,
    mastery_score = excluded.mastery_score,
    evidence_count = excluded.evidence_count,
    status = excluded.status,
    last_attempt_at = excluded.last_attempt_at,
    updated_at = excluded.updated_at;

  update public.learning_session_items
  set attempt_id = v_attempt_id, correct = p_correct, answered_at = p_attempted_at
  where id = p_session_item_id;
  perform public.service_finalize_item_exposure(
    p_student_id, p_session_id, p_session_item_id, p_item_id,
    v_attempt_id, p_correct, p_hint_used, p_response_time_ms, p_attempted_at
  );
  update public.learning_sessions
  set answered_count = answered_count + 1,
      correct_count = correct_count + case when p_correct then 1 else 0 end,
      updated_at = p_attempted_at
  where id = p_session_id
  returning planned_item_count, answered_count into v_planned, v_answered;
  if v_answered >= v_planned then
    update public.learning_sessions
    set status = 'completed', completed_at = p_attempted_at, updated_at = p_attempted_at
    where id = p_session_id;
  end if;
  return v_attempt_id;
end;
$$;

create or replace function public.record_graded_attempt(
  p_student_id uuid, p_item_id uuid, p_skill_id uuid,
  p_response jsonb, p_normalized_response jsonb, p_score numeric,
  p_correct boolean, p_error_code text, p_hint_used boolean,
  p_response_time_ms integer, p_alpha numeric, p_beta numeric,
  p_mastery_score numeric, p_evidence_count integer,
  p_status public.mastery_status, p_attempted_at timestamptz
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt_id uuid;
  v_release_id uuid;
begin
  insert into public.attempts(
    student_id, item_id, skill_id, response, normalized_response, score,
    correct, error_code, hint_used, response_time_ms, created_at
  ) values (
    p_student_id, p_item_id, p_skill_id, p_response, p_normalized_response,
    p_score, p_correct, p_error_code, p_hint_used, p_response_time_ms,
    p_attempted_at
  ) returning id, curriculum_release_id into v_attempt_id, v_release_id;

  insert into public.student_skill_mastery_by_release(
    curriculum_release_id, student_id, skill_id, alpha_evidence,
    beta_evidence, mastery_score, evidence_count, status,
    last_attempt_at, updated_at
  ) values (
    v_release_id, p_student_id, p_skill_id, p_alpha, p_beta,
    p_mastery_score, p_evidence_count, p_status, p_attempted_at, p_attempted_at
  ) on conflict (curriculum_release_id, student_id, skill_id) do update set
    alpha_evidence = excluded.alpha_evidence,
    beta_evidence = excluded.beta_evidence,
    mastery_score = excluded.mastery_score,
    evidence_count = excluded.evidence_count,
    status = excluded.status,
    last_attempt_at = excluded.last_attempt_at,
    updated_at = excluded.updated_at;

  insert into public.student_skill_mastery(
    student_id, skill_id, alpha_evidence, beta_evidence, mastery_score,
    evidence_count, status, last_attempt_at, updated_at
  ) values (
    p_student_id, p_skill_id, p_alpha, p_beta, p_mastery_score,
    p_evidence_count, p_status, p_attempted_at, p_attempted_at
  ) on conflict (student_id, skill_id) do update set
    alpha_evidence = excluded.alpha_evidence,
    beta_evidence = excluded.beta_evidence,
    mastery_score = excluded.mastery_score,
    evidence_count = excluded.evidence_count,
    status = excluded.status,
    last_attempt_at = excluded.last_attempt_at,
    updated_at = excluded.updated_at;
  return v_attempt_id;
end;
$$;

-- Record and verify the current pilot gates.
with release as (
  select id, reconciliation_id from public.curriculum_releases
  where release_key = 'physics7_u01_2026_08_14_pilot_r1'
), counts as (
  select r.id,
    (select count(*) from public.curriculum_release_outcomes o where o.curriculum_release_id = r.id) as outcomes,
    (select count(*) from public.curriculum_release_skills s where s.curriculum_release_id = r.id) as skills,
    (select count(*) from public.curriculum_release_item_families f where f.curriculum_release_id = r.id) as families,
    (select count(*) from public.assessment_blueprints b where b.curriculum_release_id = r.id) as blueprints,
    (select count(*) from public.assessment_blueprint_items bi join public.assessment_blueprints b on b.id=bi.assessment_blueprint_id where b.curriculum_release_id = r.id) as blueprint_items
  from release r
), gates(gate_code, status, evidence, notes) as (
  select 'official_programme_identified', 'passed',
    jsonb_build_object('programmeDocumentKey', 'am_physics_grade7_programme_40n_36n'),
    'Current Physics 7 programme N 40-Ն as amended by N 36-Ն is registered and bound.'
  union all select 'normative_sources_registered', 'passed',
    jsonb_build_object('governingLayers', 3),
    'National framework, Physics standard and Grade 7 programme are registered as governing sources.'
  union all select 'outcomes_reconciled', case when outcomes = 6 then 'passed' else 'failed' end,
    jsonb_build_object('outcomes', outcomes),
    'Release requires the six exact current Theme 1 outcomes.' from counts
  union all select 'skills_mapped', case when skills = 10 then 'passed' else 'failed' end,
    jsonb_build_object('skills', skills),
    'Release requires all ten stable micro-skills to have explicit mappings.' from counts
  union all select 'assessment_scope_bound', case when families = 77 and blueprints = 3 and blueprint_items = 240 then 'passed' else 'failed' end,
    jsonb_build_object('families', families, 'blueprints', blueprints, 'blueprintItemRows', blueprint_items),
    'Release requires 77 reconciled families and three immutable assessment blueprints.' from counts
  union all select 'content_qa_passed', 'passed',
    jsonb_build_object('activeDistinctItems', 240, 'published', 240, 'approved', 240, 'qaPassed', 240),
    'All 240 active distinct pilot variants are published, internally approved and QA-passing.'
  union all select 'external_sme_approved', 'pending', '{}'::jsonb,
    'External Physics SME approval remains pending; production activation is therefore blocked.'
)
insert into public.curriculum_release_gate_checks (
  curriculum_release_id, gate_code, status, evidence, notes, checked_at
)
select r.id, g.gate_code, g.status, g.evidence, g.notes,
       case when g.status = 'pending' then null else now() end
from release r cross join gates g;

do $$
declare
  v_bad integer;
begin
  select count(*) into v_bad
  from public.curriculum_release_gate_checks g
  join public.curriculum_releases r on r.id = g.curriculum_release_id
  where r.release_key = 'physics7_u01_2026_08_14_pilot_r1'
    and g.gate_code <> 'external_sme_approved'
    and g.status <> 'passed';
  if v_bad <> 0 then raise exception '11K_required_pilot_gate_failed:%', v_bad; end if;

  select count(*) into v_bad
  from (
    select distinct i.id
    from public.items i
    join public.assessment_pool_items api on api.item_id = i.id and api.enabled
    join public.assessment_pools p on p.id = api.pool_id and p.status = 'active' and p.unit_code = 'PHY7-U01'
    where i.retired_at is null
      and (
        i.status <> 'published'::public.content_status
        or i.review_status <> 'approved'
        or not exists (
          select 1 from public.item_qa_runs q
          where q.item_id = i.id and q.version_no = i.version_no and q.passed
        )
      )
  ) failures;
  if v_bad <> 0 then raise exception '11K_content_qa_gate_invalid:%', v_bad; end if;
end;
$$;

update public.assessment_blueprints ab
set status = 'pilot', published_at = now(), updated_at = now()
from public.curriculum_releases cr
where cr.id = ab.curriculum_release_id
  and cr.release_key = 'physics7_u01_2026_08_14_pilot_r1';

update public.curriculum_releases
set status = 'legacy', activated_at = now(), updated_at = now()
where release_key = 'physics7_u01_legacy_pre_11k';

update public.curriculum_releases
set status = 'pilot'
where release_key = 'physics7_u01_2026_08_14_pilot_r1';

-- RLS and role boundaries.
alter table public.curriculum_releases enable row level security;
alter table public.curriculum_release_units enable row level security;
alter table public.curriculum_release_outcomes enable row level security;
alter table public.curriculum_release_skills enable row level security;
alter table public.curriculum_release_item_families enable row level security;
alter table public.curriculum_release_gate_checks enable row level security;
alter table public.assessment_blueprints enable row level security;
alter table public.assessment_blueprint_items enable row level security;
alter table public.student_skill_mastery_by_release enable row level security;

create policy curriculum_releases_read on public.curriculum_releases
for select to authenticated
using (status <> 'draft' or private.current_user_role() = any (array['admin'::public.user_role, 'content_admin'::public.user_role]));
create policy curriculum_releases_write on public.curriculum_releases
for all to authenticated
using (private.current_user_role() = any (array['admin'::public.user_role, 'content_admin'::public.user_role]))
with check (private.current_user_role() = any (array['admin'::public.user_role, 'content_admin'::public.user_role]));

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'curriculum_release_units', 'curriculum_release_outcomes',
    'curriculum_release_skills', 'curriculum_release_item_families'
  ] loop
    execute format(
      'create policy %I_read on public.%I for select to authenticated using (
         exists (select 1 from public.curriculum_releases r
                 where r.id = curriculum_release_id and r.status <> ''draft'')
         or private.current_user_role() = any (array[''admin''::public.user_role, ''content_admin''::public.user_role])
       )', v_table, v_table
    );
    execute format(
      'create policy %I_write on public.%I for all to authenticated using (
         private.current_user_role() = any (array[''admin''::public.user_role, ''content_admin''::public.user_role])
       ) with check (
         private.current_user_role() = any (array[''admin''::public.user_role, ''content_admin''::public.user_role])
       )', v_table, v_table
    );
  end loop;
end;
$$;

create policy curriculum_release_gate_checks_read on public.curriculum_release_gate_checks
for select to authenticated
using (private.current_user_role() = any (array['admin'::public.user_role, 'content_admin'::public.user_role]));
create policy curriculum_release_gate_checks_write on public.curriculum_release_gate_checks
for all to authenticated
using (private.current_user_role() = any (array['admin'::public.user_role, 'content_admin'::public.user_role]))
with check (private.current_user_role() = any (array['admin'::public.user_role, 'content_admin'::public.user_role]));

create policy assessment_blueprints_read on public.assessment_blueprints
for select to authenticated
using (
  status in ('pilot', 'production')
  or private.current_user_role() = any (array['admin'::public.user_role, 'content_admin'::public.user_role])
  or exists (
    select 1 from public.learning_sessions ls
    where ls.assessment_blueprint_id = assessment_blueprints.id
      and ls.student_id = (select auth.uid())
  )
);
create policy assessment_blueprints_write on public.assessment_blueprints
for all to authenticated
using (private.current_user_role() = any (array['admin'::public.user_role, 'content_admin'::public.user_role]))
with check (private.current_user_role() = any (array['admin'::public.user_role, 'content_admin'::public.user_role]));

create policy assessment_blueprint_items_staff_read on public.assessment_blueprint_items
for select to authenticated
using (private.current_user_role() = any (array['admin'::public.user_role, 'content_admin'::public.user_role]));
create policy assessment_blueprint_items_write on public.assessment_blueprint_items
for all to authenticated
using (private.current_user_role() = any (array['admin'::public.user_role, 'content_admin'::public.user_role]))
with check (private.current_user_role() = any (array['admin'::public.user_role, 'content_admin'::public.user_role]));

create policy student_skill_mastery_by_release_own_read on public.student_skill_mastery_by_release
for select to authenticated
using (student_id = (select auth.uid()));

grant select, insert, update, delete on
  public.curriculum_releases,
  public.curriculum_release_units,
  public.curriculum_release_outcomes,
  public.curriculum_release_skills,
  public.curriculum_release_item_families,
  public.curriculum_release_gate_checks,
  public.assessment_blueprints,
  public.assessment_blueprint_items
to authenticated;
grant select on public.student_skill_mastery_by_release to authenticated;

-- Final fail-closed assertions.
do $$
declare
  v_current uuid;
  v_legacy uuid;
  v_count integer;
begin
  select id into v_current from public.curriculum_releases
  where release_key = 'physics7_u01_2026_08_14_pilot_r1' and status = 'pilot';
  select id into v_legacy from public.curriculum_releases
  where release_key = 'physics7_u01_legacy_pre_11k' and status = 'legacy';
  if v_current is null or v_legacy is null then raise exception '11K_release_activation_failed'; end if;

  select count(*) into v_count from public.curriculum_release_outcomes where curriculum_release_id = v_current;
  if v_count <> 6 then raise exception '11K_outcome_snapshot_count:%', v_count; end if;
  select count(*) into v_count from public.curriculum_release_skills where curriculum_release_id = v_current;
  if v_count <> 10 then raise exception '11K_skill_snapshot_count:%', v_count; end if;
  select count(*) into v_count from public.curriculum_release_item_families where curriculum_release_id = v_current;
  if v_count <> 77 then raise exception '11K_family_snapshot_count:%', v_count; end if;
  select count(*) into v_count from public.assessment_blueprints where curriculum_release_id = v_current and status = 'pilot';
  if v_count <> 3 then raise exception '11K_blueprint_count:%', v_count; end if;
  select count(*) into v_count from public.assessment_blueprint_items bi
  join public.assessment_blueprints b on b.id = bi.assessment_blueprint_id
  where b.curriculum_release_id = v_current;
  if v_count <> 240 then raise exception '11K_blueprint_item_snapshot_count:%', v_count; end if;

  select count(*) into v_count from public.learning_sessions
  where curriculum_release_id is null or assessment_blueprint_id is null or provenance_status <> 'legacy_inferred';
  if v_count <> 0 then raise exception '11K_historical_session_provenance_gap:%', v_count; end if;
  select count(*) into v_count from public.attempts
  where curriculum_release_id is null or assessment_blueprint_id is null or provenance_status <> 'legacy_inferred';
  if v_count <> 0 then raise exception '11K_historical_attempt_provenance_gap:%', v_count; end if;
  select count(*) into v_count from public.student_item_exposure_events
  where curriculum_release_id is null or assessment_blueprint_id is null or provenance_status <> 'legacy_inferred';
  if v_count <> 0 then raise exception '11K_historical_exposure_provenance_gap:%', v_count; end if;
end;
$$;

comment on table public.curriculum_releases is
  'Immutable implemented-curriculum release identities; semantic changes require a new release.';
comment on table public.curriculum_release_gate_checks is
  'Auditable release gates. Pilot activation requires six governance gates; production additionally requires external SME approval.';
comment on table public.assessment_blueprints is
  'Versioned assessment scope bound to exactly one curriculum release and unit.';
comment on table public.assessment_blueprint_items is
  'Immutable item-identity snapshot for a published assessment blueprint.';
comment on table public.student_skill_mastery_by_release is
  'Release-scoped mastery projection; attempts remain the authoritative evidence record.';
comment on column public.learning_sessions.provenance_status is
  'exact for sessions created after release activation; legacy_inferred for pre-11K sessions.';
