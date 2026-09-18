-- Sprint 11J: reconcile Grade 7 Physics Chapter I to the current 2026 source chain.
-- The migration preserves all existing skill, item-family, item, session and evidence IDs.

alter table public.learning_outcomes
  add column if not exists source_document_id uuid,
  add column if not exists source_locator text,
  add column if not exists requirement_level text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'learning_outcomes_source_document_id_fkey'
      and conrelid = 'public.learning_outcomes'::regclass
  ) then
    alter table public.learning_outcomes
      add constraint learning_outcomes_source_document_id_fkey
      foreign key (source_document_id)
      references public.curriculum_source_documents(id)
      on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'learning_outcomes_requirement_level_check'
      and conrelid = 'public.learning_outcomes'::regclass
  ) then
    alter table public.learning_outcomes
      add constraint learning_outcomes_requirement_level_check
      check (
        requirement_level is null
        or requirement_level in ('mandatory', 'additional', 'platform_derived')
      );
  end if;
end;
$$;

create unique index if not exists learning_outcomes_source_locator_uq
  on public.learning_outcomes(source_document_id, source_locator)
  where source_document_id is not null and source_locator is not null;

create index if not exists learning_outcomes_source_document_idx
  on public.learning_outcomes(source_document_id)
  where source_document_id is not null;

create table if not exists public.curriculum_reconciliation_runs (
  id uuid primary key default gen_random_uuid(),
  reconciliation_key text not null unique,
  subject_program_id uuid not null references public.subject_programs(id) on delete restrict,
  unit_id uuid not null references public.units(id) on delete restrict,
  framework_document_id uuid not null references public.curriculum_source_documents(id) on delete restrict,
  subject_standard_document_id uuid not null references public.curriculum_source_documents(id) on delete restrict,
  programme_document_id uuid not null references public.curriculum_source_documents(id) on delete restrict,
  status text not null default 'draft',
  source_snapshot jsonb not null default '{}'::jsonb,
  notes text,
  completed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint curriculum_reconciliation_runs_key_check
    check (reconciliation_key = lower(reconciliation_key) and reconciliation_key ~ '^[a-z0-9][a-z0-9_]*$'),
  constraint curriculum_reconciliation_runs_status_check
    check (status in ('draft', 'complete', 'superseded')),
  constraint curriculum_reconciliation_runs_completion_check
    check ((status = 'complete' and completed_at is not null) or status <> 'complete')
);

create table if not exists public.learning_outcome_normative_mappings (
  reconciliation_id uuid not null references public.curriculum_reconciliation_runs(id) on delete cascade,
  learning_outcome_id uuid not null references public.learning_outcomes(id) on delete restrict,
  disposition text not null,
  framework_references text[] not null default '{}'::text[],
  subject_standard_references text[] not null default '{}'::text[],
  mapping_notes text not null,
  reviewed_at timestamptz not null default now(),
  primary key (reconciliation_id, learning_outcome_id),
  constraint learning_outcome_normative_mappings_disposition_check
    check (disposition in (
      'unchanged', 'mapping_updated', 'wording_updated', 'scope_changed',
      'merge_required', 'split_required', 'no_longer_applicable',
      'new_official_outcome_missing'
    ))
);

create table if not exists public.skill_curriculum_reconciliations (
  reconciliation_id uuid not null references public.curriculum_reconciliation_runs(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete restrict,
  disposition text not null,
  rationale text not null,
  reviewed_at timestamptz not null default now(),
  primary key (reconciliation_id, skill_id),
  constraint skill_curriculum_reconciliations_disposition_check
    check (disposition in (
      'unchanged', 'mapping_updated', 'wording_updated', 'scope_changed',
      'merge_required', 'split_required', 'no_longer_applicable',
      'new_official_outcome_missing'
    ))
);

create table if not exists public.skill_outcome_curriculum_mappings (
  reconciliation_id uuid not null,
  skill_id uuid not null,
  learning_outcome_id uuid not null,
  mapping_type text not null,
  rationale text not null,
  created_at timestamptz not null default now(),
  primary key (reconciliation_id, skill_id, learning_outcome_id),
  constraint skill_outcome_curriculum_mappings_skill_fkey
    foreign key (reconciliation_id, skill_id)
    references public.skill_curriculum_reconciliations(reconciliation_id, skill_id)
    on delete cascade,
  constraint skill_outcome_curriculum_mappings_outcome_fkey
    foreign key (reconciliation_id, learning_outcome_id)
    references public.learning_outcome_normative_mappings(reconciliation_id, learning_outcome_id)
    on delete cascade,
  constraint skill_outcome_curriculum_mappings_type_check
    check (mapping_type in ('direct', 'derived_supporting'))
);

create table if not exists public.item_family_curriculum_reconciliations (
  reconciliation_id uuid not null references public.curriculum_reconciliation_runs(id) on delete cascade,
  item_family_id uuid not null references public.item_families(id) on delete restrict,
  primary_learning_outcome_id uuid not null,
  disposition text not null,
  mapping_type text not null,
  rationale text not null,
  reviewed_at timestamptz not null default now(),
  primary key (reconciliation_id, item_family_id),
  constraint item_family_curriculum_reconciliations_outcome_fkey
    foreign key (reconciliation_id, primary_learning_outcome_id)
    references public.learning_outcome_normative_mappings(reconciliation_id, learning_outcome_id)
    on delete restrict,
  constraint item_family_curriculum_reconciliations_disposition_check
    check (disposition in (
      'unchanged', 'mapping_updated', 'wording_updated', 'scope_changed',
      'merge_required', 'split_required', 'no_longer_applicable',
      'new_official_outcome_missing'
    )),
  constraint item_family_curriculum_reconciliations_type_check
    check (mapping_type in ('direct', 'derived_supporting'))
);

create table if not exists public.assessment_pool_curriculum_reconciliations (
  reconciliation_id uuid not null references public.curriculum_reconciliation_runs(id) on delete cascade,
  assessment_pool_id uuid not null references public.assessment_pools(id) on delete restrict,
  disposition text not null,
  enabled_item_count integer not null,
  covered_skill_count integer not null,
  covered_item_family_count integer not null,
  covered_learning_outcome_count integer not null,
  rationale text not null,
  reviewed_at timestamptz not null default now(),
  primary key (reconciliation_id, assessment_pool_id),
  constraint assessment_pool_curriculum_reconciliations_disposition_check
    check (disposition in (
      'unchanged', 'mapping_updated', 'wording_updated', 'scope_changed',
      'merge_required', 'split_required', 'no_longer_applicable',
      'new_official_outcome_missing'
    )),
  constraint assessment_pool_curriculum_reconciliations_counts_check
    check (
      enabled_item_count >= 0 and covered_skill_count >= 0
      and covered_item_family_count >= 0 and covered_learning_outcome_count >= 0
    )
);

create index if not exists curriculum_reconciliation_runs_subject_program_idx
  on public.curriculum_reconciliation_runs(subject_program_id);
create index if not exists curriculum_reconciliation_runs_unit_idx
  on public.curriculum_reconciliation_runs(unit_id);
create index if not exists curriculum_reconciliation_runs_framework_idx
  on public.curriculum_reconciliation_runs(framework_document_id);
create index if not exists curriculum_reconciliation_runs_standard_idx
  on public.curriculum_reconciliation_runs(subject_standard_document_id);
create index if not exists curriculum_reconciliation_runs_programme_idx
  on public.curriculum_reconciliation_runs(programme_document_id);
create index if not exists curriculum_reconciliation_runs_reviewed_by_idx
  on public.curriculum_reconciliation_runs(reviewed_by)
  where reviewed_by is not null;
create index if not exists learning_outcome_normative_mappings_outcome_idx
  on public.learning_outcome_normative_mappings(learning_outcome_id);
create index if not exists skill_curriculum_reconciliations_skill_idx
  on public.skill_curriculum_reconciliations(skill_id);
create index if not exists skill_outcome_curriculum_mappings_outcome_idx
  on public.skill_outcome_curriculum_mappings(learning_outcome_id);
create index if not exists item_family_curriculum_reconciliations_family_idx
  on public.item_family_curriculum_reconciliations(item_family_id);
create index if not exists item_family_curriculum_reconciliations_outcome_idx
  on public.item_family_curriculum_reconciliations(primary_learning_outcome_id);
create index if not exists assessment_pool_curriculum_reconciliations_pool_idx
  on public.assessment_pool_curriculum_reconciliations(assessment_pool_id);

alter table public.curriculum_reconciliation_runs enable row level security;
alter table public.learning_outcome_normative_mappings enable row level security;
alter table public.skill_curriculum_reconciliations enable row level security;
alter table public.skill_outcome_curriculum_mappings enable row level security;
alter table public.item_family_curriculum_reconciliations enable row level security;
alter table public.assessment_pool_curriculum_reconciliations enable row level security;

drop policy if exists curriculum_reconciliation_runs_read on public.curriculum_reconciliation_runs;
create policy curriculum_reconciliation_runs_read on public.curriculum_reconciliation_runs
for select to authenticated
using (
  status = 'complete'
  or private.current_user_role() = any (
    array['teacher'::public.user_role, 'admin'::public.user_role, 'content_admin'::public.user_role]
  )
);

drop policy if exists curriculum_reconciliation_runs_insert on public.curriculum_reconciliation_runs;
create policy curriculum_reconciliation_runs_insert on public.curriculum_reconciliation_runs
for insert to authenticated
with check (private.current_user_role() = any (array['admin'::public.user_role, 'content_admin'::public.user_role]));

drop policy if exists curriculum_reconciliation_runs_update on public.curriculum_reconciliation_runs;
create policy curriculum_reconciliation_runs_update on public.curriculum_reconciliation_runs
for update to authenticated
using (private.current_user_role() = any (array['admin'::public.user_role, 'content_admin'::public.user_role]))
with check (private.current_user_role() = any (array['admin'::public.user_role, 'content_admin'::public.user_role]));

drop policy if exists curriculum_reconciliation_runs_delete on public.curriculum_reconciliation_runs;
create policy curriculum_reconciliation_runs_delete on public.curriculum_reconciliation_runs
for delete to authenticated
using (private.current_user_role() = any (array['admin'::public.user_role, 'content_admin'::public.user_role]));

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'learning_outcome_normative_mappings',
    'skill_curriculum_reconciliations',
    'skill_outcome_curriculum_mappings',
    'item_family_curriculum_reconciliations',
    'assessment_pool_curriculum_reconciliations'
  ]
  loop
    execute format('drop policy if exists %I_read on public.%I', v_table, v_table);
    execute format(
      'create policy %I_read on public.%I for select to authenticated using (
         exists (
           select 1 from public.curriculum_reconciliation_runs r
           where r.id = reconciliation_id
             and (
               r.status = ''complete''
               or private.current_user_role() = any (
                 array[''teacher''::public.user_role, ''admin''::public.user_role, ''content_admin''::public.user_role]
               )
             )
         )
       )',
      v_table, v_table
    );
    execute format('drop policy if exists %I_insert on public.%I', v_table, v_table);
    execute format(
      'create policy %I_insert on public.%I for insert to authenticated with check (
         private.current_user_role() = any (array[''admin''::public.user_role, ''content_admin''::public.user_role])
       )',
      v_table, v_table
    );
    execute format('drop policy if exists %I_update on public.%I', v_table, v_table);
    execute format(
      'create policy %I_update on public.%I for update to authenticated using (
         private.current_user_role() = any (array[''admin''::public.user_role, ''content_admin''::public.user_role])
       ) with check (
         private.current_user_role() = any (array[''admin''::public.user_role, ''content_admin''::public.user_role])
       )',
      v_table, v_table
    );
    execute format('drop policy if exists %I_delete on public.%I', v_table, v_table);
    execute format(
      'create policy %I_delete on public.%I for delete to authenticated using (
         private.current_user_role() = any (array[''admin''::public.user_role, ''content_admin''::public.user_role])
       )',
      v_table, v_table
    );
  end loop;
end;
$$;

revoke all on public.curriculum_reconciliation_runs from public, anon;
revoke all on public.learning_outcome_normative_mappings from public, anon;
revoke all on public.skill_curriculum_reconciliations from public, anon;
revoke all on public.skill_outcome_curriculum_mappings from public, anon;
revoke all on public.item_family_curriculum_reconciliations from public, anon;
revoke all on public.assessment_pool_curriculum_reconciliations from public, anon;

grant select, insert, update, delete on public.curriculum_reconciliation_runs to authenticated;
grant select, insert, update, delete on public.learning_outcome_normative_mappings to authenticated;
grant select, insert, update, delete on public.skill_curriculum_reconciliations to authenticated;
grant select, insert, update, delete on public.skill_outcome_curriculum_mappings to authenticated;
grant select, insert, update, delete on public.item_family_curriculum_reconciliations to authenticated;
grant select, insert, update, delete on public.assessment_pool_curriculum_reconciliations to authenticated;

grant all on public.curriculum_reconciliation_runs to service_role;
grant all on public.learning_outcome_normative_mappings to service_role;
grant all on public.skill_curriculum_reconciliations to service_role;
grant all on public.skill_outcome_curriculum_mappings to service_role;
grant all on public.item_family_curriculum_reconciliations to service_role;
grant all on public.assessment_pool_curriculum_reconciliations to service_role;

-- Seed the six exact Theme 1 outcomes from the current N 40-Ն / N 36-Ն programme appendix.
with programme as (
  select id from public.curriculum_source_documents
  where source_key = 'am_physics_grade7_programme_40n_36n'
), outcome_rows(topic_code, source_locator, requirement_level, statement_hy, sequence_order) as (
  values
    ('PHY7-U01-T01', '7-րդ դասարան / Թեմա 1 / Վերջնարդյունքներ / Պարտադիր 1(1)', 'mandatory',
      'ներկայացնել ֆիզիկայի ուսումնասիրության առարկան (Հ9)', 1),
    ('PHY7-U01-T02', '7-րդ դասարան / Թեմա 1 / Վերջնարդյունքներ / Պարտադիր 1(2)', 'mandatory',
      'ներկայացնել հայ անվանի ֆիզիկոսներին (Հ30)', 2),
    ('PHY7-U01-T01', '7-րդ դասարան / Թեմա 1 / Վերջնարդյունքներ / Պարտադիր 1(3)', 'mandatory',
      'բերել ֆիզիկական երևույթների օրինակներ (Հ9)', 3),
    ('PHY7-U01-T03', '7-րդ դասարան / Թեմա 1 / Վերջնարդյունքներ / Պարտադիր 1(4)', 'mandatory',
      'կատարել պարզագույն դիտումներ, չափումներ և փորձեր (Հ4, Հ28)', 4),
    ('PHY7-U01-T04', '7-րդ դասարան / Թեմա 1 / Վերջնարդյունքներ / Պարտադիր 1(5)', 'mandatory',
      'չափումներ կատարելիս դրսևորել պատասխանատու վերաբերմունք, անհրաժեշտ հետևողականություն և ճշգրտություն (Հ4, Հ28)', 5),
    ('PHY7-U01-T04', '7-րդ դասարան / Թեմա 1 / Վերջնարդյունքներ / Լրացուցիչ 2(1)', 'additional',
      'ներկայացնել ժամանակի, հեռավորության, ծավալի, զանգվածի չափման միավորները ՄՀ համակարգում', 6)
)
insert into public.learning_outcomes (
  id, topic_id, official_code, statement_hy, statement_en, source_reference,
  sequence_order, status, source_document_id, source_locator, requirement_level
)
select
  gen_random_uuid(), t.id, null, o.statement_hy, null,
  'https://www.arlis.am/hy/acts/229331', o.sequence_order,
  'published'::public.content_status, p.id, o.source_locator, o.requirement_level
from outcome_rows o
join public.topics t on t.code = o.topic_code
cross join programme p
on conflict (source_document_id, source_locator) where source_document_id is not null and source_locator is not null
do update set
  topic_id = excluded.topic_id,
  statement_hy = excluded.statement_hy,
  source_reference = excluded.source_reference,
  sequence_order = excluded.sequence_order,
  status = excluded.status,
  requirement_level = excluded.requirement_level;

-- Create the immutable reconciliation header in draft state until all assertions pass.
insert into public.curriculum_reconciliation_runs (
  reconciliation_key, subject_program_id, unit_id,
  framework_document_id, subject_standard_document_id, programme_document_id,
  status, source_snapshot, notes
)
select
  'physics7_u01_2026_08_14', sp.id, u.id,
  b.framework_document_id, b.subject_standard_document_id, b.programme_document_id,
  'draft',
  jsonb_build_object(
    'retrieved_on', '2026-09-18',
    'framework_url', 'https://www.arlis.am/hy/acts/225446',
    'subject_standard_url', 'https://www.arlis.am/hy/acts/229259',
    'subject_standard_attachment_url', 'https://www.arlis.am/acts/files/361431/619a30f43ca972d138e738dbfff0797d17f8bb12ff533894490b88af99537397',
    'subject_standard_attachment_sha256', '619a30f43ca972d138e738dbfff0797d17f8bb12ff533894490b88af99537397',
    'programme_url', 'https://www.arlis.am/hy/acts/229331',
    'programme_attachment_url', 'https://www.arlis.am/acts/files/361442/966f79b4570fa3c6cee0263bd3776ac4aff0fcea6242d2c48121256309f53478',
    'programme_attachment_sha256', '966f79b4570fa3c6cee0263bd3776ac4aff0fcea6242d2c48121256309f53478'
  ),
  'Sprint 11J reconciliation of the existing Chapter I graph and assessment bank. Stable skill, family and item identifiers are preserved.'
from public.subject_programs sp
join public.subjects s on s.id = sp.subject_id and s.code = 'physics'
join public.grades g on g.id = sp.grade_id and g.grade_number = 7
join public.units u on u.subject_program_id = sp.id and u.code = 'PHY7-U01'
join public.subject_program_source_bindings b on b.subject_program_id = sp.id
where b.applicability_status = 'governing'
on conflict (reconciliation_key) do update set
  subject_program_id = excluded.subject_program_id,
  unit_id = excluded.unit_id,
  framework_document_id = excluded.framework_document_id,
  subject_standard_document_id = excluded.subject_standard_document_id,
  programme_document_id = excluded.programme_document_id,
  status = 'draft',
  source_snapshot = excluded.source_snapshot,
  notes = excluded.notes,
  completed_at = null;

with run as (
  select id from public.curriculum_reconciliation_runs
  where reconciliation_key = 'physics7_u01_2026_08_14'
), outcome_context(source_locator, framework_references, subject_standard_references, mapping_notes) as (
  values
    ('7-րդ դասարան / Թեմա 1 / Վերջնարդյունքներ / Պարտադիր 1(1)', array['Հ9']::text[], array['§1(1)', '§1(5)']::text[],
      'The programme operationalizes the standard goal of knowledge about physical objects and phenomena and the formation of a scientific worldview.'),
    ('7-րդ դասարան / Թեմա 1 / Վերջնարդյունքներ / Պարտադիր 1(2)', array['Հ30']::text[], array['§1(5)']::text[],
      'The programme makes Armenian physicists an explicit Grade 7 outcome; the subject standard supplies the scientific-worldview and values context.'),
    ('7-րդ դասարան / Թեմա 1 / Վերջնարդյունքներ / Պարտադիր 1(3)', array['Հ9']::text[], array['§1(1)']::text[],
      'The programme directly requires examples of physical phenomena under the standard goal for physical objects and phenomena.'),
    ('7-րդ դասարան / Թեմա 1 / Վերջնարդյունքներ / Պարտադիր 1(4)', array['Հ4', 'Հ28']::text[], array['§1(2)', '§12(3)', '§12(4)']::text[],
      'The programme directly requires simple observations, measurements and experiments; the standard requires measurement/result evaluation and research/data practices.'),
    ('7-րդ դասարան / Թեմա 1 / Վերջնարդյունքներ / Պարտադիր 1(5)', array['Հ4', 'Հ28']::text[], array['§1(2)', '§12(3)']::text[],
      'The programme directly requires responsibility, consistency and precision during measurement.'),
    ('7-րդ դասարան / Թեմա 1 / Վերջնարդյունքներ / Լրացուցիչ 2(1)', '{}'::text[], array['§1(2)']::text[],
      'The programme labels this as an additional outcome; it supports the standard measurement and calculation goal.')
)
insert into public.learning_outcome_normative_mappings (
  reconciliation_id, learning_outcome_id, disposition,
  framework_references, subject_standard_references, mapping_notes
)
select r.id, lo.id, 'new_official_outcome_missing',
       c.framework_references, c.subject_standard_references,
       'This current-2026 official outcome was absent before Sprint 11J and is now stored verbatim. ' || c.mapping_notes
from outcome_context c
join public.learning_outcomes lo on lo.source_locator = c.source_locator
join public.curriculum_source_documents d on d.id = lo.source_document_id
  and d.source_key = 'am_physics_grade7_programme_40n_36n'
cross join run r
on conflict (reconciliation_id, learning_outcome_id) do update set
  disposition = excluded.disposition,
  framework_references = excluded.framework_references,
  subject_standard_references = excluded.subject_standard_references,
  mapping_notes = excluded.mapping_notes,
  reviewed_at = now();

with run as (
  select id from public.curriculum_reconciliation_runs
  where reconciliation_key = 'physics7_u01_2026_08_14'
), skill_rows(skill_code, rationale) as (
  values
    ('PHY7-U01-S01', 'The skill directly operationalizes the mandatory outcome to give examples of physical phenomena.'),
    ('PHY7-U01-S02', 'The body/material/phenomenon distinction is a textbook-grounded micro-skill supporting the official physics-subject and phenomena outcomes.'),
    ('PHY7-U01-S03', 'The skill directly operationalizes the mandatory Armenian-physicists outcome.'),
    ('PHY7-U01-S04', 'Distinguishing observation from experiment is a traceable micro-skill supporting performance of simple observations and experiments.'),
    ('PHY7-U01-S05', 'The inquiry chain is a traceable micro-skill supporting simple experiments and the subject-standard research practices; it is not represented as separate official wording.'),
    ('PHY7-U01-S06', 'Quantity/unit/instrument matching directly supports simple measurement and the additional SI-unit outcome.'),
    ('PHY7-U01-S07', 'Simple conversions support the additional SI-unit outcome and the programme intersubject link requiring unit transformations.'),
    ('PHY7-U01-S08', 'Scale division, limit and reading directly implement the programme problem-solving and simple-instrument measurement requirements.'),
    ('PHY7-U01-S09', 'Measurement error and precision directly implement the programme measurement-error problems and the mandatory precision outcome.'),
    ('PHY7-U01-S10', 'Planning a simple measurement and determining volume operationalize the programme laboratory measurement requirement; transfer contexts remain bounded to that construct.')
)
insert into public.skill_curriculum_reconciliations (
  reconciliation_id, skill_id, disposition, rationale
)
select r.id, s.id, 'mapping_updated', sr.rationale
from skill_rows sr
join public.skills s on s.code = sr.skill_code
cross join run r
on conflict (reconciliation_id, skill_id) do update set
  disposition = excluded.disposition,
  rationale = excluded.rationale,
  reviewed_at = now();

with run as (
  select id from public.curriculum_reconciliation_runs
  where reconciliation_key = 'physics7_u01_2026_08_14'
), mapping_rows(skill_code, source_locator, mapping_type, rationale) as (
  values
    ('PHY7-U01-S01', '7-րդ դասարան / Թեմա 1 / Վերջնարդյունքներ / Պարտադիր 1(3)', 'direct', 'Examples and classification tasks assess recognition of physical phenomena.'),
    ('PHY7-U01-S02', '7-րդ դասարան / Թեմա 1 / Վերջնարդյունքներ / Պարտադիր 1(1)', 'derived_supporting', 'The textbook distinction supports describing what physics studies without claiming separate official-outcome status.'),
    ('PHY7-U01-S03', '7-րդ դասարան / Թեմա 1 / Վերջնարդյունքներ / Պարտադիր 1(2)', 'direct', 'Scientist/contribution tasks assess the explicit Armenian-physicists outcome.'),
    ('PHY7-U01-S04', '7-րդ դասարան / Թեմա 1 / Վերջնարդյունքներ / Պարտադիր 1(4)', 'derived_supporting', 'Observation/experiment discrimination is a prerequisite component of performing the official practical outcome.'),
    ('PHY7-U01-S05', '7-րդ դասարան / Թեմա 1 / Վերջնարդյունքներ / Պարտադիր 1(4)', 'derived_supporting', 'Hypothesis, data and conclusion reasoning supports valid simple experimentation and subject-standard research practice.'),
    ('PHY7-U01-S06', '7-րդ դասարան / Թեմա 1 / Վերջնարդյունքներ / Պարտադիր 1(4)', 'direct', 'Choosing quantities, units and instruments is intrinsic to simple measurement.'),
    ('PHY7-U01-S06', '7-րդ դասարան / Թեմա 1 / Վերջնարդյունքներ / Լրացուցիչ 2(1)', 'direct', 'The skill covers the named SI-unit outcome.'),
    ('PHY7-U01-S07', '7-րդ դասարան / Թեմա 1 / Վերջնարդյունքներ / Լրացուցիչ 2(1)', 'derived_supporting', 'Conversion extends presentation of the named units into bounded application and matches the programme intersubject link.'),
    ('PHY7-U01-S08', '7-րդ դասարան / Թեմա 1 / Վերջնարդյունքներ / Պարտադիր 1(4)', 'direct', 'Scale reading is explicitly required by the programme practical-work and problem-solving sections.'),
    ('PHY7-U01-S09', '7-րդ դասարան / Թեմա 1 / Վերջնարդյունքներ / Պարտադիր 1(4)', 'direct', 'Measurement-error problems are explicit programme content.'),
    ('PHY7-U01-S09', '7-րդ դասարան / Թեմա 1 / Վերջնարդյունքներ / Պարտադիր 1(5)', 'direct', 'Precision and responsible reading assess the explicit measurement-quality outcome.'),
    ('PHY7-U01-S10', '7-րդ դասարան / Թեմա 1 / Վերջնարդյունքներ / Պարտադիր 1(4)', 'direct', 'The family remains within simple laboratory measurement of volume and related bounded procedures.')
)
insert into public.skill_outcome_curriculum_mappings (
  reconciliation_id, skill_id, learning_outcome_id, mapping_type, rationale
)
select r.id, s.id, lo.id, mr.mapping_type, mr.rationale
from mapping_rows mr
join public.skills s on s.code = mr.skill_code
join public.learning_outcomes lo on lo.source_locator = mr.source_locator
join public.curriculum_source_documents d on d.id = lo.source_document_id
  and d.source_key = 'am_physics_grade7_programme_40n_36n'
cross join run r
on conflict (reconciliation_id, skill_id, learning_outcome_id) do update set
  mapping_type = excluded.mapping_type,
  rationale = excluded.rationale;

-- Retain the existing generic skill_outcomes graph for application compatibility.
-- It now points at the exact current official programme outcomes.
insert into public.skill_outcomes (skill_id, learning_outcome_id)
select skill_id, learning_outcome_id
from public.skill_outcome_curriculum_mappings m
join public.curriculum_reconciliation_runs r on r.id = m.reconciliation_id
where r.reconciliation_key = 'physics7_u01_2026_08_14'
on conflict (skill_id, learning_outcome_id) do nothing;

with run as (
  select id from public.curriculum_reconciliation_runs
  where reconciliation_key = 'physics7_u01_2026_08_14'
), primary_rows(skill_code, source_locator, mapping_type, rationale) as (
  values
    ('PHY7-U01-S01', '7-րդ դասարան / Թեմա 1 / Վերջնարդյունքներ / Պարտադիր 1(3)', 'direct', 'This family inherits the verified S01 physical-phenomena construct.'),
    ('PHY7-U01-S02', '7-րդ դասարան / Թեմա 1 / Վերջնարդյունքներ / Պարտադիր 1(1)', 'derived_supporting', 'This family assesses the textbook-grounded distinction that supports the official subject-matter outcome.'),
    ('PHY7-U01-S03', '7-րդ դասարան / Թեմա 1 / Վերջնարդյունքներ / Պարտադիր 1(2)', 'direct', 'This family assesses the explicit Armenian-physicists outcome.'),
    ('PHY7-U01-S04', '7-րդ դասարան / Թեմա 1 / Վերջնարդյունքներ / Պարտադիր 1(4)', 'derived_supporting', 'This family supports the official observation/experiment performance outcome.'),
    ('PHY7-U01-S05', '7-րդ դասարան / Թեմա 1 / Վերջնարդյունքներ / Պարտադիր 1(4)', 'derived_supporting', 'This family supports valid simple experimentation through bounded inquiry reasoning.'),
    ('PHY7-U01-S06', '7-րդ դասարան / Թեմա 1 / Վերջնարդյունքներ / Լրացուցիչ 2(1)', 'direct', 'This family assesses quantities, instruments and the named SI-unit content.'),
    ('PHY7-U01-S07', '7-րդ դասարան / Թեմա 1 / Վերջնարդյունքներ / Լրացուցիչ 2(1)', 'derived_supporting', 'This family applies the named units through programme-supported transformations.'),
    ('PHY7-U01-S08', '7-րդ դասարան / Թեմա 1 / Վերջնարդյունքներ / Պարտադիր 1(4)', 'direct', 'This family assesses explicit scale-division and instrument-reading work.'),
    ('PHY7-U01-S09', '7-րդ դասարան / Թեմա 1 / Վերջնարդյունքներ / Պարտադիր 1(5)', 'direct', 'This family assesses measurement error, precision and measurement-quality reasoning.'),
    ('PHY7-U01-S10', '7-րդ դասարան / Թեմա 1 / Վերջնարդյունքներ / Պարտադիր 1(4)', 'direct', 'This family assesses bounded simple laboratory measurement and volume procedures.')
)
insert into public.item_family_curriculum_reconciliations (
  reconciliation_id, item_family_id, primary_learning_outcome_id,
  disposition, mapping_type, rationale
)
select r.id, f.id, lo.id, 'mapping_updated', pr.mapping_type,
       pr.rationale || ' Family code: ' || f.code || '.'
from primary_rows pr
join public.skills s on s.code = pr.skill_code
join public.item_families f on f.skill_id = s.id
join public.learning_outcomes lo on lo.source_locator = pr.source_locator
join public.curriculum_source_documents d on d.id = lo.source_document_id
  and d.source_key = 'am_physics_grade7_programme_40n_36n'
cross join run r
on conflict (reconciliation_id, item_family_id) do update set
  primary_learning_outcome_id = excluded.primary_learning_outcome_id,
  disposition = excluded.disposition,
  mapping_type = excluded.mapping_type,
  rationale = excluded.rationale,
  reviewed_at = now();

with run as (
  select id from public.curriculum_reconciliation_runs
  where reconciliation_key = 'physics7_u01_2026_08_14'
)
insert into public.assessment_pool_curriculum_reconciliations (
  reconciliation_id, assessment_pool_id, disposition,
  enabled_item_count, covered_skill_count, covered_item_family_count,
  covered_learning_outcome_count, rationale
)
select
  r.id, p.id, 'mapping_updated',
  count(distinct i.id) filter (where api.enabled),
  count(distinct i.skill_id) filter (where api.enabled),
  count(distinct f.id) filter (where api.enabled),
  count(distinct ifcr.primary_learning_outcome_id) filter (where api.enabled),
  'Active ' || p.purpose || ' blueprint is traced through item template → item family → reconciled skill/outcome. No assessment membership or historical item identity changed.'
from public.assessment_pools p
join public.assessment_pool_items api on api.pool_id = p.id
join public.items i on i.id = api.item_id and i.retired_at is null
join public.item_templates it on it.id = i.item_template_id
join public.item_families f on f.id = it.item_family_id
cross join run r
join public.item_family_curriculum_reconciliations ifcr
  on ifcr.reconciliation_id = r.id and ifcr.item_family_id = f.id
where p.code in (
  'PHY7-U01-PRACTICE-BASELINE',
  'PHY7-U01-DIAGNOSTIC-BASELINE',
  'PHY7-U01-MASTERY-PROTECTED-A'
)
  and p.status = 'active'
group by r.id, p.id, p.purpose
on conflict (reconciliation_id, assessment_pool_id) do update set
  disposition = excluded.disposition,
  enabled_item_count = excluded.enabled_item_count,
  covered_skill_count = excluded.covered_skill_count,
  covered_item_family_count = excluded.covered_item_family_count,
  covered_learning_outcome_count = excluded.covered_learning_outcome_count,
  rationale = excluded.rationale,
  reviewed_at = now();

-- Fail closed unless the entire current Chapter I graph and active bank are reconciled.
do $$
declare
  v_run_id uuid;
  v_expected integer;
  v_actual integer;
begin
  select id into v_run_id
  from public.curriculum_reconciliation_runs
  where reconciliation_key = 'physics7_u01_2026_08_14';

  if v_run_id is null then
    raise exception '11J_reconciliation_run_missing';
  end if;

  select count(*) into v_actual
  from public.learning_outcome_normative_mappings
  where reconciliation_id = v_run_id;
  if v_actual <> 6 then
    raise exception '11J_official_outcome_count_invalid:%', v_actual;
  end if;

  select count(*) into v_actual
  from public.skill_curriculum_reconciliations
  where reconciliation_id = v_run_id;
  if v_actual <> 10 then
    raise exception '11J_skill_reconciliation_count_invalid:%', v_actual;
  end if;

  select count(*) into v_actual
  from public.skill_curriculum_reconciliations scr
  where scr.reconciliation_id = v_run_id
    and not exists (
      select 1 from public.skill_outcome_curriculum_mappings m
      where m.reconciliation_id = scr.reconciliation_id and m.skill_id = scr.skill_id
    );
  if v_actual <> 0 then
    raise exception '11J_unmapped_skill_count:%', v_actual;
  end if;

  select count(*) into v_expected
  from public.item_families f
  join public.skills s on s.id = f.skill_id
  where s.code like 'PHY7-U01-S%';

  select count(*) into v_actual
  from public.item_family_curriculum_reconciliations
  where reconciliation_id = v_run_id;
  if v_actual <> v_expected then
    raise exception '11J_item_family_reconciliation_incomplete expected=% actual=%', v_expected, v_actual;
  end if;

  select count(*) into v_actual
  from public.item_family_curriculum_reconciliations ifcr
  join public.item_families f on f.id = ifcr.item_family_id
  where ifcr.reconciliation_id = v_run_id
    and not exists (
      select 1
      from public.skill_outcome_curriculum_mappings m
      where m.reconciliation_id = ifcr.reconciliation_id
        and m.skill_id = f.skill_id
        and m.learning_outcome_id = ifcr.primary_learning_outcome_id
    );
  if v_actual <> 0 then
    raise exception '11J_family_primary_outcome_not_mapped_to_skill:%', v_actual;
  end if;

  select count(*) into v_actual
  from public.assessment_pool_curriculum_reconciliations
  where reconciliation_id = v_run_id;
  if v_actual <> 3 then
    raise exception '11J_assessment_pool_reconciliation_count_invalid:%', v_actual;
  end if;

  select count(*) into v_actual
  from public.assessment_pool_curriculum_reconciliations
  where reconciliation_id = v_run_id
    and (enabled_item_count <= 0 or covered_skill_count <> 10 or covered_learning_outcome_count <= 0);
  if v_actual <> 0 then
    raise exception '11J_assessment_blueprint_coverage_invalid:%', v_actual;
  end if;

  with active_items as (
    select distinct i.id, i.item_template_id
    from public.items i
    join public.assessment_pool_items api on api.item_id = i.id and api.enabled
    join public.assessment_pools p on p.id = api.pool_id
      and p.status = 'active'
      and p.code in (
        'PHY7-U01-PRACTICE-BASELINE',
        'PHY7-U01-DIAGNOSTIC-BASELINE',
        'PHY7-U01-MASTERY-PROTECTED-A'
      )
    where i.retired_at is null
  )
  select count(*) into v_actual
  from active_items a
  where not exists (
      select 1
      from public.item_templates it
      join public.item_family_curriculum_reconciliations ifcr
        on ifcr.item_family_id = it.item_family_id and ifcr.reconciliation_id = v_run_id
      where it.id = a.item_template_id
    )
    or not exists (
      select 1
      from public.item_curriculum_scopes ics
      join public.units u on u.id = ics.unit_id and u.code = 'PHY7-U01'
      where ics.item_id = a.id
    );
  if v_actual <> 0 then
    raise exception '11J_active_item_traceability_gap:%', v_actual;
  end if;

  update public.curriculum_reconciliation_runs
  set status = 'complete', completed_at = now()
  where id = v_run_id;
end;
$$;

comment on table public.curriculum_reconciliation_runs is
  'Auditable source-chain reconciliation runs for an implemented curriculum unit.';
comment on table public.learning_outcome_normative_mappings is
  'Official outcome disposition and framework/subject-standard context for a reconciliation run.';
comment on table public.skill_curriculum_reconciliations is
  'One disposition per implemented micro-skill in a reconciliation run.';
comment on table public.skill_outcome_curriculum_mappings is
  'Direct or derived-supporting links from platform micro-skills to current official outcomes.';
comment on table public.item_family_curriculum_reconciliations is
  'One explicit programme trace and disposition per registered item family.';
comment on table public.assessment_pool_curriculum_reconciliations is
  'Recorded active blueprint coverage derived from reconciled item-family and skill mappings.';
